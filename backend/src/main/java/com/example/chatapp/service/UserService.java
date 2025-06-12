package com.example.chatapp.service;

import com.example.chatapp.dto.LoginRequest;
import com.example.chatapp.dto.ProfileResponse;
import com.example.chatapp.dto.ProfileUpdateRequest;
import com.example.chatapp.dto.RegisterRequest;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.UserRepository;
import com.example.chatapp.websocket.StatusMessage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private CloudinaryService cloudinaryService;
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Value("${file.upload-dir:uploads/images}")
    private String uploadDir;

    private Path getUploadPath() {
        Path uploadPath = Paths.get(uploadDir);
        try {
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            return uploadPath;
        } catch (IOException e) {
            throw new RuntimeException("Yükleme dizini oluşturulamadı", e);
        }
    }
    
    /**
     * Kullanıcı adına göre kullanıcı bulur
     */
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı: " + username));
    }
    
    /**
     * Kullanıcı adına göre benzer kullanıcıları arar
     */
    public List<User> searchByUsername(String username) {
        return userRepository.findByUsernameContainingIgnoreCase(username);
    }
    
    public User save(User user) {
        return userRepository.save(user);
    }
    
    /**
     * ID'ye göre kullanıcı bulur
     */
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı: " + userId));
    }

    // Kullanıcı kayıt işlemi
    public String registerUser(RegisterRequest registerRequest) throws Exception {
        if (registerRequest.getIsim() == null || registerRequest.getSoyad() == null || registerRequest.getUsername() == null || registerRequest.getPassword() == null || registerRequest.getEmail() == null) {
            throw new Exception("Kullanıcı adı, şifre ve email boş olamaz.");
        }
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new Exception("Bu isim zaten var");
        }
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new Exception("Bu E-mail zaten var");
        }
        User user = new User();
        user.setBio("Merhaba, ben " + registerRequest.getUsername());
        user.setCreatedAt(LocalDateTime.now());
        user.setIsim(registerRequest.getIsim());
        user.setSoyad(registerRequest.getSoyad());
        user.setProfileImageUrl("default-avatar.png");
        user.setOnline(false);
        user.setUpdatedAt(null);
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        
        // Şifreyi BCrypt ile hashle ve kaydet
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        
        userRepository.save(user);
        // Kayıt işlemini yap...
        return "Kullanıcı kaydı başarılı.";
    }

    // Kullanıcı girişi işlemi
    public String loginUser(LoginRequest loginRequest) throws Exception {
        if (loginRequest.getUsername() == null || loginRequest.getPassword() == null) {
            throw new Exception("Kullanıcı adı ve şifre boş olamaz.");
        }

        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername());

        if (userOpt.isEmpty()) {
            throw new Exception("Kullanıcı bulunamadı.");
        }

        User user = userOpt.get();
        
        // Şifreyi BCrypt ile doğrula
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new Exception("Şifre yanlış.");
        }
        
        // Kullanıcı girişinde online durumunu değiştirmiyoruz
        // Kullanıcı son durumunu koruyor
        
        // Şifre doğruysa token oluştur ve dön
        return jwtService.generateToken(loginRequest.getUsername());
    }

    // Profil bilgisini getirdxcdcdscdc
    public ProfileResponse getProfile(String token) throws Exception {

        if (token.isEmpty()) {
            throw new Exception("token bulunamadı.");
        }
        String userName = jwtService.extractUsername(token);
        Optional<User> user = userRepository.findByUsername(userName);

        if (user.isEmpty()) {
            throw new Exception("Kullanıcı bulunamadı.");
        }
        return ProfileResponse.builder()
                .id(user.get().getId())
                .bio(user.get().getBio())
                .email(user.get().getEmail())
                .isim(user.get().getIsim())
                .userName(user.get().getUsername())
                .profileImageUrl(user.get().getProfileImageUrl())
                .soyad(user.get().getSoyad())
                .isOnline(user.get().isOnline())
                .build();
    }
    
    // Profil güncelleme
    public ProfileResponse updateProfile(String token, ProfileUpdateRequest updateRequest) throws Exception {
        if (token.isEmpty()) {
            throw new Exception("Token bulunamadı.");
        }
        
        String username = jwtService.extractUsername(token);
        Optional<User> userOpt = userRepository.findByUsername(username);
        
        if (userOpt.isEmpty()) {
            throw new Exception("Kullanıcı bulunamadı.");
        }
        
        User user = userOpt.get();
        
        // Güncellenecek alanları kontrol et ve güncelle
        if (updateRequest.getBio() != null && !updateRequest.getBio().isEmpty()) {
            user.setBio(updateRequest.getBio());
        }
        
        if (updateRequest.getProfileImageUrl() != null && !updateRequest.getProfileImageUrl().isEmpty()) {
            user.setProfileImageUrl(updateRequest.getProfileImageUrl());
        }
        
        // Şifre güncelleme (opsiyonel)
        if (updateRequest.getPassword() != null && !updateRequest.getPassword().isEmpty()) {
            // Yeni şifreyi BCrypt ile hashle
            user.setPassword(passwordEncoder.encode(updateRequest.getPassword()));
        }
        
        // Güncelleme zamanını ayarla
        user.setUpdatedAt(LocalDateTime.now());
        
        // Kullanıcıyı kaydet
        userRepository.save(user);
        
        // Güncellenmiş profil bilgilerini döndür
        return ProfileResponse.builder()
                .id(user.getId())
                .bio(user.getBio())
                .email(user.getEmail())
                .isim(user.getIsim())
                .userName(user.getUsername())
                .profileImageUrl(user.getProfileImageUrl())
                .soyad(user.getSoyad())
                .isOnline(user.isOnline())
                .build();
    }

    public ProfileResponse updateProfileImage(String token, MultipartFile file) throws Exception {
        if (token == null || token.isEmpty()) {
            throw new Exception("Token bulunamadı.");
        }

        System.out.println("Profil resmi yükleme işlemi başladı");

        String username = jwtService.extractUsername(token);
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            throw new Exception("Kullanıcı bulunamadı.");
        }

        User user = userOpt.get();
        System.out.println("Kullanıcı bulundu: " + user.getUsername());

        if (file == null || file.isEmpty()) {
            throw new Exception("Yüklenen dosya boş veya geçersiz.");
        }

        System.out.println("Yüklenen dosya adı: " + file.getOriginalFilename() + ", boyutu: " + file.getSize() + " bytes");

        // Cloudinary'e yeni görseli yükle
        Map<String, Object> uploadResult;
        try {
            uploadResult = cloudinaryService.upload(file);
        } catch (IOException e) {
            System.err.println("Cloudinary yükleme hatası: " + e.getMessage());
            throw new Exception("Dosya yüklenemedi: " + e.getMessage());
        }

        String newFileUrl = (String) uploadResult.get("secure_url");
        String newPublicId = (String) uploadResult.get("public_id");

        // Önceki fotoğrafı sil
        String oldUrl = user.getProfileImageUrl();
        if (oldUrl != null && oldUrl.contains("res.cloudinary.com")) {
            String oldPublicId = getPublicIdFromUrl(oldUrl);
            if (oldPublicId != null && !oldPublicId.equals(newPublicId)) {
                try {
                    cloudinaryService.delete(oldPublicId, "image");
                    System.out.println("Önceki profil fotoğrafı Cloudinary'den silindi.");
                } catch (IOException e) {
                    System.err.println("Önceki fotoğraf silinemedi: " + e.getMessage());
                }
            }
        }

        // Eski URL'yi temizle ve yeni URL'yi kaydet
        user.setProfileImageUrl(null); // eski url kaldırıldı
        user.setProfileImageUrl(newFileUrl);
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);
        System.out.println("Yeni profil fotoğrafı kaydedildi: " + newFileUrl);

        return getProfileResponse(user);
    }

    private String getPublicIdFromUrl(String url) {
        try {
            String[] parts = url.split("/");
            int uploadIndex = Arrays.asList(parts).indexOf("upload");
            if (uploadIndex != -1 && uploadIndex + 1 < parts.length) {
                StringBuilder publicId = new StringBuilder();
                for (int i = uploadIndex + 1; i < parts.length; i++) {
                    publicId.append(parts[i]);
                    if (i < parts.length - 1) publicId.append("/");
                }
                // Uzantıyı sil
                int dotIndex = publicId.lastIndexOf(".");
                if (dotIndex != -1) {
                    return publicId.substring(0, dotIndex);
                }
                return publicId.toString();
            }
        } catch (Exception e) {
            System.err.println("Public ID alınamadı: " + e.getMessage());
        }
        return null;
    }

    private ProfileResponse getProfileResponse(User user) {
        return ProfileResponse.builder()
                .id(user.getId())
                .bio(user.getBio())
                .email(user.getEmail())
                .isim(user.getIsim())
                .userName(user.getUsername())
                .profileImageUrl(user.getProfileImageUrl())
                .soyad(user.getSoyad())
                .isOnline(user.isOnline())
                .build();
    }


    // Profil fotoğrafını getir
    public Resource loadImageAsResource(String fileName) {
        try {
            Path filePath = getUploadPath().resolve(fileName).normalize();
            System.out.println("Resim dosyası yolu: " + filePath.toAbsolutePath());
            
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                System.out.println("Resim dosyası bulundu ve yüklendi");
                return resource;
            } else {
                System.err.println("Dosya bulunamadı: " + fileName + " - Yol: " + filePath.toAbsolutePath());
                throw new RuntimeException("Dosya bulunamadı: " + fileName);
            }
        } catch (MalformedURLException e) {
            System.err.println("URL dönüşümü hatası: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Dosya bulunamadı: " + fileName, e);
        } catch (Exception e) {
            System.err.println("Genel hata: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Dosya yüklenirken bir hata oluştu: " + e.getMessage());
        }
    }
    
    // Online durum güncelleme
    public ProfileResponse updateOnlineStatus(String token, boolean isOnline) throws Exception {
        System.out.println("UserService: Updating online status to: " + isOnline + " for token: " + token.substring(0, 10) + "...");
        
        if (token == null || token.isEmpty()) {
            System.err.println("Token is empty or null");
            throw new Exception("Token bulunamadı.");
        }
        
        try {
            // Token'dan kullanıcı adını çıkar
            String username = jwtService.extractUsername(token);
            System.out.println("UserService: Extracted username from token: " + username);
            
            if (username == null || username.isEmpty()) {
                throw new Exception("Geçersiz token - kullanıcı adı alınamadı");
            }
            
            // Kullanıcıyı bul
            Optional<User> userOpt = userRepository.findByUsername(username);
            
            if (userOpt.isEmpty()) {
                System.err.println("User not found for username: " + username);
                throw new Exception("Kullanıcı bulunamadı.");
            }
            
            User user = userOpt.get();
            System.out.println("UserService: Found user: " + user.getUsername() + ", current online status: " + user.isOnline());
            
            // Online durumunu güncelle - Boolean değerini double-check et
            boolean newStatus = Boolean.valueOf(isOnline);
            System.out.println("UserService: Setting status to " + newStatus + " (boolean type)");
            user.setOnline(newStatus);
            
            // Güncelleme zamanını ayarla
            user.setUpdatedAt(LocalDateTime.now());
            
            // Kullanıcıyı kaydet
            User savedUser = userRepository.save(user);
            
            // Veritabanına doğru kaydedildiğinden emin ol
            if (savedUser.isOnline() != newStatus) {
                System.err.println("WARNING: Database update did not reflect the requested status change!");
                System.err.println("Requested: " + newStatus + ", Saved: " + savedUser.isOnline());
                // Tekrar kaydetmeyi dene
                savedUser.setOnline(newStatus);
                savedUser = userRepository.save(savedUser);
                
                if (savedUser.isOnline() != newStatus) {
                    throw new Exception("Durum güncellemesi veritabanına kaydedilemedi.");
                }
            }
            
            System.out.println("UserService: User saved successfully with new online status: " + savedUser.isOnline());
            
            // WebSocket üzerinden tüm kullanıcılara bildirim gönder
            StatusMessage statusMessage = new StatusMessage(
                user.getId(),
                user.getUsername(),
                user.isOnline()
            );
            
            messagingTemplate.convertAndSend("/topic/status", statusMessage);
            System.out.println("WebSocket message sent for status update: " + user.getUsername() + " is now " + (user.isOnline() ? "online" : "offline"));
            
            // Güncellenmiş profil bilgilerini döndür
            ProfileResponse response = ProfileResponse.builder()
                    .id(user.getId())
                    .bio(user.getBio())
                    .email(user.getEmail())
                    .isim(user.getIsim())
                    .userName(user.getUsername())
                    .profileImageUrl(user.getProfileImageUrl())
                    .soyad(user.getSoyad())
                    .isOnline(user.isOnline())
                    .build();
            
            System.out.println("UserService: Returning profile response with online status: " + response.isOnline());
            return response;
        } catch (Exception e) {
            System.err.println("ERROR in updateOnlineStatus: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    // Online durum güncelleme - token olmadan (test için)
    public ProfileResponse updateOnlineStatusWithoutToken(boolean isOnline) throws Exception {
        System.out.println("Updating online status without token check to: " + isOnline);
        
        try {
            // Test için ilk kullanıcının durumunu güncelle
            User user = userRepository.findAll().stream().findFirst().orElseThrow(() -> new Exception("Kullanıcı bulunamadı"));
            System.out.println("Found first user: " + user.getUsername() + ", updating online status");
            
            // Online durumunu parametreden gelen değere göre ayarla
            user.setOnline(isOnline);
            
            // Güncelleme zamanını ayarla
            user.setUpdatedAt(LocalDateTime.now());
            
            // Kullanıcıyı kaydet
            User savedUser = userRepository.save(user);
            System.out.println("User saved successfully with new online status: " + savedUser.isOnline());
            
            // Güncellenmiş profil bilgilerini döndür
            return ProfileResponse.builder()
                    .id(user.getId())
                    .bio(user.getBio())
                    .email(user.getEmail())
                    .isim(user.getIsim())
                    .userName(user.getUsername())
                    .profileImageUrl(user.getProfileImageUrl())
                    .soyad(user.getSoyad())
                    .isOnline(user.isOnline())
                    .build();
        } catch (Exception e) {
            System.err.println("ERROR in updateOnlineStatusWithoutToken: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public User getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kullanıcı oturum açmamış");
        }
        
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
    }

    // Tüm kullanıcıların profil resimlerini varsayılan data URL'sine güncelle
    public void fixAllProfileImages() {
        // Tüm kullanıcıları getir
        List<User> allUsers = userRepository.findAll();
        
        // Varsayılan profil resmi (data URL formatında svg)
        String defaultProfileImage = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjYzVkNWVhIi8+PHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiMzYzU2OGEiPj88L3RleHQ+PC9zdmc+";
        
        // İşlenmemiş veya Google URL'si olan profil resimlerini düzelt
        for (User user : allUsers) {
            String currentUrl = user.getProfileImageUrl();
            
            // Eğer resim URL'si boş, null veya Google URL'si içeriyorsa değiştir
            if (currentUrl == null || currentUrl.isEmpty() || 
                currentUrl.contains("google.com") || 
                currentUrl.contains("vecteezy.com")) {
                
                user.setProfileImageUrl(defaultProfileImage);
                userRepository.save(user);
            }
        }
    }
}

