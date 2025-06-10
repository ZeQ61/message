package com.example.chatapp.controller;

import com.example.chatapp.dto.LoginRequest;
import com.example.chatapp.dto.ProfileResponse;
import com.example.chatapp.dto.ProfileUpdateRequest;
import com.example.chatapp.dto.RegisterRequest;
import com.example.chatapp.dto.StatusUpdateRequest;
import com.example.chatapp.model.User;
import com.example.chatapp.service.JwtService;
import com.example.chatapp.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/user")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/login")
    public String showLoginForm(@RequestBody LoginRequest loginrequest) throws Exception {
       return userService.loginUser(loginrequest);
    }

    @PostMapping("/register")
    public String showRegisterForm(@RequestBody RegisterRequest registerRequest) throws Exception {
        System.out.println("kaydedildi" + registerRequest.getUsername());
        return userService.registerUser(registerRequest);
    }

    @GetMapping("/profile")
    public ProfileResponse getProfile(@RequestHeader("Authorization") String authHeader) throws Exception {
        String token = authHeader.replace("Bearer ", "");
        return userService.getProfile(token);
    }

    @PutMapping("/profile")
    public ProfileResponse updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProfileUpdateRequest profileRequest) throws Exception {
        String token = authHeader.replace("Bearer ", "");
        return userService.updateProfile(token, profileRequest);
    }
    
    @PostMapping("/upload-profile-image")
    public ProfileResponse uploadProfileImage(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("image") MultipartFile image) throws Exception {
        String token = authHeader.replace("Bearer ", "");
        return userService.updateProfileImage(token, image);
    }
    
    @GetMapping("/images/{fileName:.+}")
    public ResponseEntity<Resource> getImage(@PathVariable String fileName) {
        Resource file = userService.loadImageAsResource(fileName);
        
        // MIME türünü dosya uzantısına göre belirleme
        String contentType = "image/jpeg"; // Varsayılan olarak JPEG
        
        String filename = file.getFilename();
        if (filename != null) {
            if (filename.endsWith(".png")) {
                contentType = "image/png";
            } else if (filename.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (filename.endsWith(".svg")) {
                contentType = "image/svg+xml";
            } else if (filename.endsWith(".webp")) {
                contentType = "image/webp";
            }
        }
        
        System.out.println("Serving image: " + fileName + " with content type: " + contentType);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(file);
    }
    
    @PutMapping("/status")
    public ResponseEntity<ProfileResponse> updateStatus(
            @RequestHeader(value = "Authorization", required = true) String authHeader,
            @RequestBody StatusUpdateRequest statusRequest) throws Exception {
        // Daha ayrıntılı günlük kaydı
        System.out.println("=== STATUS UPDATE REQUEST RECEIVED ===");
        System.out.println("Raw request: " + statusRequest);
        System.out.println("isOnline value: " + statusRequest.isOnline());
        System.out.println("isOnline type: " + ((Object)statusRequest.isOnline()).getClass().getName());
        System.out.println("Auth header: " + (authHeader != null ? authHeader.substring(0, Math.min(15, authHeader.length())) + "..." : "null"));
        
        try {
            // JWT token'ı doğrula
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                System.err.println("Invalid auth header format");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }
            
            String token = authHeader.replace("Bearer ", "");
            
            // Token kontrolü ile birlikte durum güncelle
            boolean isOnlineValue = statusRequest.isOnline();
            System.out.println("Setting online status to: " + isOnlineValue);
            
            ProfileResponse response = userService.updateOnlineStatus(token, isOnlineValue);
            System.out.println("Status updated successfully: " + response.isOnline());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("ERROR updating status: " + e.getMessage());
            e.printStackTrace();
            
            // Hata türüne göre uygun HTTP durum kodu döndür
            if (e.getMessage().contains("Token") || e.getMessage().contains("yetkilendirme")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            } else if (e.getMessage().contains("Kullanıcı bulunamadı")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
            }
        }
    }

    /**
     * JWT token'ı yenileme endpoint'i
     */
    @PostMapping("/auth/refresh")
    public ResponseEntity<?> refreshToken(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Geçerli bir kimlik doğrulama bulunamadı"));
            }
            
            String username = authentication.getName();
            // Yeni token oluştur
            String newToken = jwtService.generateToken(username);
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", newToken);
            response.put("message", "Token başarıyla yenilendi");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Token yenilenirken hata: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Token yenilenirken hata oluştu: " + e.getMessage()));
        }
    }

    // Kullanıcıları kullanıcı adına göre ara
    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String username, @AuthenticationPrincipal UserDetails userDetails) {
        String currentUsername = userDetails.getUsername();
        User currentUser = userService.findByUsername(currentUsername);
        
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Kullanıcı bulunamadı"));
        }
        
        List<User> users = userService.searchByUsername(username);
        
        // Kendini sonuçlardan çıkar
        users = users.stream()
            .filter(user -> !user.getUsername().equals(currentUsername))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(users);
    }
}
