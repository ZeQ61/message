package com.example.chatapp.service;

import com.example.chatapp.model.Admin;
import com.example.chatapp.model.Role;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.AdminRepository;
import com.example.chatapp.repository.FriendshipRepository;
import com.example.chatapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class AdminService {
    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private JwtService jwtService;


    public String registerAdmin(String username, String password) throws Exception {
        logger.info("Admin kaydı yapılıyor: {}", username);

        Admin admin = new Admin();
        admin.setUsername(username);
        admin.setPassword(password);
        adminRepository.save(admin);

        logger.info("Admin başarıyla kaydedildi: {}", username);
        return "Admin kaydı başarılı.";
    }

    // Admin giriş işlemi
    public String loginAdmin(String username, String password) throws Exception {
        logger.info("Admin giriş denemesi: {}", username);
        
        Optional<Admin> adminOpt = adminRepository.findByUsername(username);
        if (adminOpt.isEmpty()) {
            logger.warn("Admin bulunamadı: {}", username);
            throw new Exception("Admin bulunamadı.");
        }

        Admin admin = adminOpt.get();

        if (!admin.getPassword().equals(password)) {
            logger.warn("Şifre yanlış: {}", username);
            throw new Exception("Şifre yanlış.");
        }

        // Token oluştur
        String token = jwtService.generateToken(username);
        logger.info("Admin giriş başarılı, token oluşturuldu: {}", username);
        return token;
    }

    // Tüm kullanıcıları getir
    public List<User> getAllUsers(String token) throws Exception {
        logger.info("getAllUsers çağrıldı. Token alındı.");
        
        if (token == null || token.isEmpty()) {
            logger.error("Token bulunamadı");
            throw new Exception("Token bulunamadı.");
        }

        try {
            // Token'dan kullanıcı adını al
            String adminUsername = jwtService.extractUsername(token);
            logger.info("Token'dan kullanıcı adı çıkarıldı: {}", adminUsername);

            // Admin kontrolü
            Optional<Admin> adminOpt = adminRepository.findByUsername(adminUsername);
            if (adminOpt.isEmpty()) {
                logger.error("Admin bulunamadı: {}", adminUsername);
                throw new Exception("Sadece admin kullanıcılar bu işlemi yapabilir.");
            }

            // Tüm kullanıcıları getir
            List<User> users = userRepository.findAll();
            logger.info("Toplam {} kullanıcı bulundu", users.size());
            return users;
        } catch (Exception e) {
            logger.error("Token doğrulama hatası", e);
            throw new Exception("Token doğrulanamadı: " + e.getMessage());
        }
    }

    @Transactional
    public void deleteUserById(Long targetUserId, String token) throws Exception {
        logger.info("deleteUserById çağrıldı. UserId: {}", targetUserId);
        
        if (token == null || token.isEmpty()) {
            logger.error("Token bulunamadı");
            throw new Exception("Token bulunamadı.");
        }

        try {
            // Token'dan kullanıcı adını al
            String requesterUsername = jwtService.extractUsername(token);
            logger.info("Token'dan kullanıcı adı çıkarıldı: {}", requesterUsername);

            // Admin kontrolü
            Optional<Admin> adminOpt = adminRepository.findByUsername(requesterUsername);
            if (adminOpt.isEmpty()) {
                logger.error("Admin bulunamadı: {}", requesterUsername);
                throw new Exception("Sadece admin kullanıcılar bu işlemi yapabilir.");
            }

            // Silinecek kullanıcıyı kontrol et
            Optional<User> userToDelete = userRepository.findById(targetUserId);
            if (userToDelete.isEmpty()) {
                logger.error("Silinecek kullanıcı bulunamadı: {}", targetUserId);
                throw new Exception("Silinecek kullanıcı bulunamadı.");
            }
            
            User user = userToDelete.get();
            
            // Kullanıcının arkadaşlık ilişkilerini sil
            logger.info("Kullanıcının arkadaşlık ilişkileri siliniyor: {}", targetUserId);
            friendshipRepository.findByRequesterOrReceiver(user, user)
                .forEach(friendship -> {
                    logger.info("Arkadaşlık ilişkisi siliniyor: {}", friendship.getId());
                    friendshipRepository.delete(friendship);
                });

            // Silme işlemi
            userRepository.deleteById(targetUserId);
            logger.info("Kullanıcı başarıyla silindi: {}", targetUserId);
        } catch (Exception e) {
            logger.error("Kullanıcı silme hatası", e);
            throw new Exception("Kullanıcı silinemedi: " + e.getMessage());
        }
    }
}
