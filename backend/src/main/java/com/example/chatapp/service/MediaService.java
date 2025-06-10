package com.example.chatapp.service;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.ChatMessage;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.io.InputStream;

@Service
public class MediaService {
    
    @Autowired
    private CloudinaryService cloudinaryService;
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private ChatService chatService;
    
    @Autowired
    private UserService userService;
    
    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;
    
    @Value("${spring.servlet.multipart.max-file-size:10MB}")
    private String maxFileSizeStr;
    
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif");
    private static final Set<String> ALLOWED_DOCUMENT_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt", "csv", "xls", "xlsx");
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    private long getMaxFileSize() {
        return DataSize.parse(maxFileSizeStr).toBytes();
    }
    
    /**
     * Dosyanın uzantısının izin verilen uzantılardan biri olup olmadığını kontrol eder
     */
    private boolean isAllowedFileType(String filename) {
        if (filename == null || filename.isEmpty()) {
            return false;
        }
        
        String extension = getFileExtension(filename).toLowerCase();
        return ALLOWED_IMAGE_EXTENSIONS.contains(extension) || 
               ALLOWED_DOCUMENT_EXTENSIONS.contains(extension);
    }
    
    /**
     * Dosya uzantısını çıkarır
     */
    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf(".");
        if (lastDotIndex > 0) {
            return filename.substring(lastDotIndex + 1);
        }
        return "";
    }
    
    /**
     * Dosya adı oluşturur
     */
    private String generateFileName(String originalFilename, Long userId) {
        String extension = getFileExtension(originalFilename);
        return userId + "_" + System.currentTimeMillis() + "." + extension;
    }
    
    /**
     * Dosyayı siler
     */
    private void deleteFile(String filePath) {
        try {
            File file = new File(filePath);
            if (file.exists()) {
                if (!file.delete()) {
                    System.err.println("Dosya silinemedi: " + filePath);
                }
            }
        } catch (Exception e) {
            System.err.println("Dosya silme hatası: " + e.getMessage());
        }
    }
    
    /**
     * Cloudinary URL'inden public ID çıkarır
     */
    private String extractPublicIdFromUrl(String url) {
        if (url == null || !url.contains("cloudinary.com")) {
            return null;
        }
        
        try {
            // URL formatı: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.ext
            String[] parts = url.split("/upload/");
            if (parts.length < 2) {
                return null;
            }
            
            String afterUpload = parts[1];
            // v123456/folder/public_id.ext -> folder/public_id
            String publicIdWithExt = afterUpload.replaceFirst("^v\\d+/", "");
            
            // Uzantıyı kaldır
            int lastDotIndex = publicIdWithExt.lastIndexOf(".");
            if (lastDotIndex > 0) {
                return publicIdWithExt.substring(0, lastDotIndex);
            }
            
            return publicIdWithExt;
        } catch (Exception e) {
            System.err.println("Public ID çıkarılırken hata: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Dosyanın içeriğini zararlı yazılım açısından kontrol eder (basit bir kontrol)
     * Not: Gerçek bir anti-virüs entegrasyonu yapılmalıdır
     */
    private boolean isSafeContent(MultipartFile file) {
        // Basit bir dosya büyüklüğü kontrolü
        if (file.getSize() > MAX_FILE_SIZE) {
            return false;
        }
        
        // Basit bir MIME tipi kontrolü
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }
        
        // İzin verilen MIME tipleri
        return contentType.startsWith("image/") || 
               contentType.equals("application/pdf") || 
               contentType.startsWith("application/msword") ||
               contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
               contentType.equals("text/plain") || 
               contentType.equals("application/vnd.ms-excel") ||
               contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    /**
     * Profil resmi yükleme
     */
    @Transactional
    public String uploadProfileImage(MultipartFile file, User user) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Dosya boş olamaz");
        }
        
        // Dosya tipini ve içeriğini kontrol et
        if (!isAllowedFileType(file.getOriginalFilename()) || !isSafeContent(file)) {
            throw new IllegalArgumentException("Desteklenmeyen dosya tipi veya zararlı içerik");
        }
        
        // Mevcut resmi sil
        if (user.getProfileImageUrl() != null && !user.getProfileImageUrl().isEmpty()) {
            try {
                // Eğer Cloudinary URL'i ise, Cloudinary'den sil
                if (user.getProfileImageUrl().contains("cloudinary.com")) {
                    String publicId = extractPublicIdFromUrl(user.getProfileImageUrl());
                    if (publicId != null) {
                        cloudinaryService.deleteImage(publicId);
                    }
                } else {
                    // Yerel dosya sisteminden sil
                    String fileName = user.getProfileImageUrl().substring(user.getProfileImageUrl().lastIndexOf("/") + 1);
                    deleteFile(uploadDir + "/images/" + fileName);
                }
            } catch (Exception e) {
                // Silme hatası olsa bile devam et
                System.err.println("Eski profil resmi silinemedi: " + e.getMessage());
            }
        }
        
        // Yeni resmi kaydet
        String fileName = generateFileName(file.getOriginalFilename(), user.getId());
        String filePath = uploadDir + "/images/" + fileName;
        
        Path path = Paths.get(filePath);
        if (!Files.exists(path.getParent())) {
            Files.createDirectories(path.getParent());
        }
        
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, path, StandardCopyOption.REPLACE_EXISTING);
        }
        
        // Resmi Cloudinary'ye yükle
        Map<String, String> uploadResult = cloudinaryService.uploadImage(file);
        String imageUrl = uploadResult.get("url");
        
        // Kullanıcının profil resmini güncelle
        user.setProfileImageUrl(imageUrl);
        userService.save(user);
        
        return imageUrl;
    }
    
    // Diğer kodlar aynı kalıyor...
    
    /**
     * Dosyayı Cloudinary'ye yükler ve URL'ini döner
     */
    public Map<String, String> uploadMedia(MultipartFile file, User uploader) throws IOException {
        // Dosya boyutu kontrolü
        long maxFileSize = getMaxFileSize();
        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("Dosya çok büyük (maksimum: " + maxFileSize/1024/1024 + "MB)");
        }
        
        // MIME tipi güvenlik kontrolü
        String contentType = file.getContentType();
        if (contentType == null || 
            !(contentType.startsWith("image/") || 
              contentType.startsWith("video/") || 
              contentType.equals("application/pdf"))) {
            throw new IllegalArgumentException("Desteklenmeyen dosya türü: " + contentType);
        }
        
        // Cloudinary'ye yükle
        Map<String, Object> uploadParams = new HashMap<>();
        uploadParams.put("resource_type", getResourceType(contentType));
        uploadParams.put("folder", "chat_media");
        uploadParams.put("public_id", generateUniqueId());
        
        Map uploadResult = cloudinaryService.upload(file.getBytes(), uploadParams);
        
        // Sonuç döndür
        Map<String, String> mediaInfo = new HashMap<>();
        mediaInfo.put("url", (String) uploadResult.get("url"));
        mediaInfo.put("type", contentType.startsWith("image/") ? "image" : 
                           contentType.startsWith("video/") ? "video" : "document");
        return mediaInfo;
    }
    
    /**
     * Dosyayı Cloudinary'ye yükler ve URL'ini döner (GroupService için)
     */
    public String uploadFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Dosya boş olamaz");
        }
        
        // Dosya tipini ve içeriğini kontrol et
        if (!isAllowedFileType(file.getOriginalFilename()) || !isSafeContent(file)) {
            throw new IllegalArgumentException("Desteklenmeyen dosya tipi veya zararlı içerik");
        }
        
        // Cloudinary'ye yükle
        Map<String, Object> uploadParams = new HashMap<>();
        String contentType = file.getContentType();
        uploadParams.put("resource_type", getResourceType(contentType));
        uploadParams.put("folder", "group_images");
        uploadParams.put("public_id", generateUniqueId());
        
        Map uploadResult = cloudinaryService.upload(file.getBytes(), uploadParams);
        
        // URL'i döndür
        return (String) uploadResult.get("url");
    }
    
    /**
     * Medya mesajı gönderir
     */
    public ChatMessage sendMediaMessage(User sender, Chat chat, String mediaUrl, String mediaType) {
        // JSON formatında medya bilgisi
        String mediaContent = String.format(
            "{\"type\":\"media\",\"url\":\"%s\",\"mediaType\":\"%s\"}", 
            mediaUrl, mediaType
        );
        
        // Şifrelenecekse burada şifrele
        return chatService.sendMessage(sender, chat, mediaContent);
    }
    
    /**
     * Dosya türüne göre Cloudinary kaynak tipini belirler
     */
    private String getResourceType(String contentType) {
        if (contentType.startsWith("image/")) return "image";
        if (contentType.startsWith("video/")) return "video";
        return "raw";
    }
    
    /**
     * Benzersiz ID oluşturur
     */
    private String generateUniqueId() {
        return "media_" + UUID.randomUUID().toString().replace("-", "");
    }
} 