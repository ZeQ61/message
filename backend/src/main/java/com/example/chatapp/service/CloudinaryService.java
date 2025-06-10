package com.example.chatapp.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
public class CloudinaryService {

    private static final Logger logger = LoggerFactory.getLogger(CloudinaryService.class);
    
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif");
    private static final Set<String> ALLOWED_DOCUMENT_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt");
    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = Set.of("mp4", "mov", "avi", "webm");
    private static final Set<String> ALLOWED_AUDIO_EXTENSIONS = Set.of("mp3", "wav", "ogg");

    @Autowired
    private Cloudinary cloudinary;

    /**
     * Dosya yükler ve sonuç döndürür
     */
    public Map<String, Object> upload(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        Map<String, Object> uploadOptions = new HashMap<>();

        // Dosya güvenliğini kontrol et
        if (!isFileSecure(file)) {
            logger.error("Güvenli olmayan dosya yüklemesi engellendi: {}, boyut: {}", file.getOriginalFilename(), file.getSize());
            throw new SecurityException("Dosya güvenlik kontrolünden geçemedi");
        }

        // Dosya türüne göre klasör ve kaynak türünü ayarla
        if (contentType != null) {
            if (contentType.startsWith("image/")) {
                uploadOptions.put("resource_type", "image");
                uploadOptions.put("folder", "chatapp/images");
            } else if (contentType.startsWith("video/")) {
                uploadOptions.put("resource_type", "video");
                uploadOptions.put("folder", "chatapp/videos");
            } else if (contentType.startsWith("audio/")) {
                uploadOptions.put("resource_type", "video"); // audio için de 'video' kullanılır
                uploadOptions.put("folder", "chatapp/audio");
            } else {
                uploadOptions.put("resource_type", "raw");
                uploadOptions.put("folder", "chatapp/files");
            }
        } else {
            uploadOptions.put("resource_type", "auto");
            uploadOptions.put("folder", "chatapp/others");
        }

        // Dosya yüklemesi
        logger.info("Dosya Cloudinary'ye yükleniyor: {}", file.getOriginalFilename());
        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), uploadOptions);
        logger.info("Dosya başarıyla yüklendi: {}", result.get("public_id"));
        
        return result;
    }
    
    /**
     * Dosya yükleme için kullanışlı metod - String değerler döndürür
     */
    public Map<String, String> uploadImage(MultipartFile file) throws IOException {
        Map<String, Object> result = upload(file);
        Map<String, String> stringResult = new HashMap<>();
        
        for (Map.Entry<String, Object> entry : result.entrySet()) {
            stringResult.put(entry.getKey(), entry.getValue() != null ? entry.getValue().toString() : null);
        }
        
        return stringResult;
    }
    
    /**
     * Belirtilen parametrelerle dosya yükler
     */
    public Map<String, Object> upload(byte[] fileData, Map<String, Object> params) throws IOException {
        logger.info("Özel parametrelerle dosya yükleniyor");
        Map<String, Object> result = cloudinary.uploader().upload(fileData, params);
        logger.info("Dosya başarıyla yüklendi: {}", result.get("public_id"));
        return result;
    }

    /**
     * Dosyayı siler
     */
    public Map<String, Object> delete(String publicId, String resourceType) throws IOException {
        // resource_type: "image", "video", "raw"
        Map<String, Object> options = ObjectUtils.asMap(
                "resource_type", resourceType != null ? resourceType : "auto"
        );
        logger.info("Cloudinary'den dosya siliniyor: {}, tür: {}", publicId, resourceType);
        Map<String, Object> result = cloudinary.uploader().destroy(publicId, options);
        logger.info("Dosya silme sonucu: {}", result);
        return result;
    }
    
    /**
     * Görsel dosyayı siler
     */
    public boolean deleteImage(String publicId) throws IOException {
        Map<String, Object> result = delete(publicId, "image");
        return "ok".equals(result.get("result"));
    }
    
    /**
     * Dosya güvenlik kontrolü
     */
    private boolean isFileSecure(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() <= 0) {
            return false;
        }
        
        // Dosya uzantısı kontrolü
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isEmpty()) {
            return false;
        }
        
        String extension = getFileExtension(filename).toLowerCase();
        boolean isAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.contains(extension) || 
                                     ALLOWED_DOCUMENT_EXTENSIONS.contains(extension) ||
                                     ALLOWED_VIDEO_EXTENSIONS.contains(extension) ||
                                     ALLOWED_AUDIO_EXTENSIONS.contains(extension);
        
        if (!isAllowedExtension) {
            logger.warn("İzin verilmeyen dosya uzantısı: {}", extension);
            return false;
        }
        
        // MIME tipi kontrolü
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }
        
        boolean isAllowedContentType = contentType.startsWith("image/") || 
                                      contentType.startsWith("video/") ||
                                      contentType.startsWith("audio/") ||
                                      contentType.equals("application/pdf") ||
                                      contentType.startsWith("application/msword") ||
                                      contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
                                      contentType.equals("text/plain");
        
        if (!isAllowedContentType) {
            logger.warn("İzin verilmeyen içerik tipi: {}", contentType);
            return false;
        }
        
        return true;
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
     * Cloudinary URL'inden public ID çıkarır
     */
    public String extractPublicIdFromUrl(String url) {
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
            logger.error("Public ID çıkarılırken hata: {}", e.getMessage());
            return null;
        }
    }
}
