package com.example.chatapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import jakarta.annotation.PostConstruct;

@Service
public class EncryptionService {
    
    @Value("${encryption.secret:default-secret-key-must-be-at-least-32-chars}")
    private String encryptionSecret;
    
    private SecretKey secretKey;
    
    @PostConstruct
    public void init() {
        try {
            // 256-bit key için anahtar oluştur
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(encryptionSecret.getBytes(StandardCharsets.UTF_8));
            secretKey = new SecretKeySpec(keyBytes, "AES");
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Şifreleme anahtarı oluşturulamadı", e);
        }
    }
    
    public String encrypt(String content) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            byte[] iv = new byte[12]; // GCM için 12 byte IV
            new SecureRandom().nextBytes(iv);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(128, iv);
            
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);
            byte[] encryptedBytes = cipher.doFinal(content.getBytes(StandardCharsets.UTF_8));
            
            // IV ve şifreli metni birleştir
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encryptedBytes.length);
            byteBuffer.put(iv);
            byteBuffer.put(encryptedBytes);
            
            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            throw new RuntimeException("Şifreleme hatası", e);
        }
    }
    
    public String decrypt(String encryptedContent) {
        try {
            byte[] decodedBytes = Base64.getDecoder().decode(encryptedContent);
            
            // IV ve şifreli metni ayır
            ByteBuffer byteBuffer = ByteBuffer.wrap(decodedBytes);
            byte[] iv = new byte[12];
            byteBuffer.get(iv);
            
            byte[] ciphertext = new byte[decodedBytes.length - 12];
            byteBuffer.get(ciphertext);
            
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec parameterSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);
            
            byte[] decryptedBytes = cipher.doFinal(ciphertext);
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Şifre çözme hatası", e);
        }
    }
} 