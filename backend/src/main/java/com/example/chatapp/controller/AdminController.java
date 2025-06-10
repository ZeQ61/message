package com.example.chatapp.controller;

import com.example.chatapp.dto.AdminRequest;
import com.example.chatapp.dto.RegisterRequest;
import com.example.chatapp.model.User;
import com.example.chatapp.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private AdminService adminService;

    @PostMapping("/register")
    public String registerAdmin(@RequestBody AdminRequest adminRequest) throws Exception {
        logger.info("Admin kayıt isteği alındı: {}", adminRequest.getUsername());
        return adminService.registerAdmin(adminRequest.getUsername(), adminRequest.getPassword());
    }

    @PostMapping("/login")
    public String loginAdmin(@RequestBody AdminRequest adminRequest) throws Exception {
        logger.info("Admin giriş isteği alındı: {}", adminRequest.getUsername());
        return adminService.loginAdmin(adminRequest.getUsername(), adminRequest.getPassword());
    }

    // Tüm kullanıcıları getirme endpoint'i
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers(@RequestHeader("Authorization") String authHeader) {
        logger.info("Tüm kullanıcıları getirme isteği alındı");
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                logger.error("Geçersiz Authorization header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            String token = authHeader.replace("Bearer ", "");
            logger.info("Token alındı: {}", token.substring(0, Math.min(20, token.length())) + "...");
            
            List<User> users = adminService.getAllUsers(token);
            logger.info("Kullanıcılar başarıyla getirildi: {} kullanıcı", users.size());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            logger.error("Kullanıcıları getirme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(null);
        }
    }

    // Kullanıcı silme işlemi (Admin'e özel)
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        logger.info("Kullanıcı silme isteği alındı. ID: {}", id);
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                logger.error("Geçersiz Authorization header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Geçersiz token formatı");
            }
            
            String token = authHeader.replace("Bearer ", "");
            
            adminService.deleteUserById(id, token);
            logger.info("Kullanıcı başarıyla silindi. ID: {}", id);
            return ResponseEntity.ok("Kullanıcı başarıyla silindi.");
        } catch (Exception e) {
            logger.error("Kullanıcı silme hatası: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }
}
