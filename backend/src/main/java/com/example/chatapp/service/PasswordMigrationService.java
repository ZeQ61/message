package com.example.chatapp.service;

import com.example.chatapp.model.User;
import com.example.chatapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Bu servis, eski düz metin şifreleri BCrypt ile şifrelenmiş formata taşımak için kullanılır.
 * Servis, eski şifreleri düz metin olarak (BCrypt formatında olmayan) tanımlar ve onları BCrypt formatına dönüştürür.
 */
@Service
public class PasswordMigrationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Bir şifrenin BCrypt formatında olup olmadığını kontrol eder.
     * BCrypt şifreleri genellikle "$2a$", "$2b$" veya "$2y$" ile başlar.
     */
    public boolean isBCryptPassword(String password) {
        return password != null && (password.startsWith("$2a$") || 
                                   password.startsWith("$2b$") || 
                                   password.startsWith("$2y$"));
    }

    /**
     * Kullanıcının şifresi BCrypt formatında değilse, BCrypt formatına dönüştürür.
     */
    @Transactional
    public boolean migrateUserPassword(User user) {
        if (user != null && !isBCryptPassword(user.getPassword())) {
            // Şifreyi BCrypt formatına dönüştür
            String rawPassword = user.getPassword();
            String encodedPassword = passwordEncoder.encode(rawPassword);
            user.setPassword(encodedPassword);
            userRepository.save(user);
            return true;
        }
        return false;
    }

    /**
     * Tüm kullanıcı şifrelerini kontrol eder ve BCrypt formatında olmayanları dönüştürür.
     * NOT: Bu metot, büyük veri tabanları için performans sorunu yaratabilir.
     * Gerçek uygulamalarda, şifre geçişini kademeli olarak yapmak daha iyidir.
     */
    @Transactional
    public int migrateAllPasswords() {
        List<User> allUsers = userRepository.findAll();
        int migratedCount = 0;

        for (User user : allUsers) {
            if (migrateUserPassword(user)) {
                migratedCount++;
            }
        }

        return migratedCount;
    }
} 