package com.example.chatapp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Uygulama başlangıcında veritabanı şemasında gerekli güncellemeleri yapar.
 * Özellikle MessageType enum değerlerinin veritabanı kısıtlamasında kabul edilmesini sağlar.
 */
@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigrationRunner.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        logger.info("Veritabanı şema güncellemeleri başlatılıyor...");

        try {
            // Mevcut kısıtlamayı kaldır
            jdbcTemplate.execute("ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_type_check");
            logger.info("Eski kısıtlama kaldırıldı");

            // Yeni kısıtlamayı ekle (tüm MessageType enum değerlerini içerecek şekilde)
            jdbcTemplate.execute(
                "ALTER TABLE group_messages ADD CONSTRAINT group_messages_type_check " +
                "CHECK (type IN ('MESSAGE', 'JOIN', 'LEAVE', 'FILE', 'IMAGE', 'VIDEO', 'AUDIO', 'SYSTEM', " +
                "'DIRECT', 'GROUP', 'GROUP_JOIN', 'GROUP_LEAVE', 'GROUP_INVITE', 'GROUP_ADMIN', 'GROUP_UPDATE'))"
            );
            logger.info("Yeni kısıtlama eklendi - tüm MessageType değerleri kabul ediliyor");

            logger.info("Veritabanı şema güncellemeleri başarıyla tamamlandı");
        } catch (Exception e) {
            logger.error("Veritabanı şema güncellemesi sırasında hata: {}", e.getMessage(), e);
            // Hata oluşursa uygulamanın çalışmaya devam etmesine izin ver
            // Çünkü bu sadece kısıtlamaları güncelliyor, temel işlevselliği etkilemiyor
        }
    }
} 