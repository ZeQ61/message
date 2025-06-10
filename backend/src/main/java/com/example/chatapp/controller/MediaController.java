package com.example.chatapp.controller;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.ChatMessage;
import com.example.chatapp.model.User;
import com.example.chatapp.service.ChatService;
import com.example.chatapp.service.MediaService;
import com.example.chatapp.service.UserService;
import com.example.chatapp.websocket.ChatWebSocketController;
import com.example.chatapp.websocket.WebSocketMessageDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private static final Logger logger = LoggerFactory.getLogger(MediaController.class);

    @Autowired
    private MediaService mediaService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ChatService chatService;
    
    @Autowired
    private WebSocketMessageDispatcher messageDispatcher;
    
    /**
     * Sohbet için medya dosyası yükler
     */
    @PostMapping("/upload/{chatId}")
    public ResponseEntity<?> uploadMedia(
            @PathVariable Long chatId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        
        try {
            if (file.isEmpty()) {
                logger.warn("Boş dosya yükleme denemesi: {}", authentication.getName());
                return ResponseEntity.badRequest().body(Map.of("error", "Dosya boş olamaz"));
            }

            // Dosya boyutu kontrolü
            if (file.getSize() > 10 * 1024 * 1024) { // 10MB
                logger.warn("Büyük dosya yükleme denemesi: {}, boyut: {} bytes", 
                    authentication.getName(), file.getSize());
                return ResponseEntity.badRequest().body(Map.of("error", "Dosya boyutu çok büyük (maksimum 10MB)"));
            }

            // Kullanıcıyı doğrula
            User currentUser = userService.getCurrentUser(authentication);
            if (currentUser == null) {
                logger.error("Kullanıcı bulunamadı: {}", authentication.getName());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Kullanıcı bulunamadı"));
            }
            
            // Sohbeti doğrula
            Chat chat = chatService.getChatWithParticipants(chatId);
            if (chat == null) {
                logger.error("Sohbet bulunamadı: {}", chatId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Sohbet bulunamadı: " + chatId));
            }
            
            // Kullanıcının sohbetin katılımcısı olduğunu kontrol et
            boolean isParticipant = false;
            for (User participant : chat.getParticipants()) {
                if (participant.getId().equals(currentUser.getId())) {
                    isParticipant = true;
                    break;
                }
            }
            
            if (!isParticipant) {
                logger.error("Bu sohbete medya gönderme izniniz yok: {}", currentUser.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu sohbete medya gönderme izniniz yok"));
            }
            
            logger.info("Dosya yükleniyor: {}, boyut: {} bytes, kullanıcı: {}", 
                file.getOriginalFilename(), file.getSize(), currentUser.getUsername());

            // Medyayı yükle
            Map<String, String> uploadResult = mediaService.uploadMedia(file, currentUser);
            
            logger.info("Dosya başarıyla yüklendi: {}, URL: {}", 
                file.getOriginalFilename(), uploadResult.get("url"));
            
            // Medya mesajı oluştur ve kaydet
            ChatMessage message = mediaService.sendMediaMessage(
                    currentUser, 
                    chat, 
                    uploadResult.get("url"),
                    uploadResult.get("type")
            );
            
            // WebSocket üzerinden mesajı bildir
            ChatWebSocketController.ChatMessage wsMessage = new ChatWebSocketController.ChatMessage();
            wsMessage.setId(message.getId());
            wsMessage.setChatId(chat.getId());
            wsMessage.setSenderId(currentUser.getId());
            wsMessage.setSenderUsername(currentUser.getUsername());
            wsMessage.setSenderName(currentUser.getIsim() + " " + currentUser.getSoyad());
            wsMessage.setSenderProfileImage(currentUser.getProfileImageUrl());
            
            // JSON içeriğini ayarla
            wsMessage.setContent(String.format(
                "{\"type\":\"media\",\"url\":\"%s\",\"mediaType\":\"%s\"}", 
                uploadResult.get("url"),
                uploadResult.get("type")
            ));
            
            // LocalDateTime'ı Date'e dönüştür
            Date timestamp = Date.from(message.getTimestamp().atZone(ZoneId.systemDefault()).toInstant());
            wsMessage.setTimestamp(timestamp);
            wsMessage.setType(ChatWebSocketController.MessageType.CHAT);
            
            // Ayrıca sender bilgilerini ayrı bir nesnede de gönderelim (frontend uyumluluğu için)
            Map<String, Object> senderData = new HashMap<>();
            senderData.put("id", currentUser.getId());
            senderData.put("username", currentUser.getUsername());
            senderData.put("isim", currentUser.getIsim());
            senderData.put("soyad", currentUser.getSoyad());
            senderData.put("profileImageUrl", currentUser.getProfileImageUrl());
            wsMessage.setSender(senderData);
            
            // Diğer katılımcılara bildir
            for (User participant : chat.getParticipants()) {
                if (!participant.getId().equals(currentUser.getId())) {
                    messageDispatcher.sendChatMessage(participant.getUsername(), wsMessage);
                }
            }
            
            // Başarılı yanıt dön
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("messageId", message.getId());
            response.put("mediaUrl", uploadResult.get("url"));
            response.put("mediaType", uploadResult.get("type"));
            
            return ResponseEntity.ok(response);
            
        } catch (SecurityException e) {
            logger.error("Güvenlik hatası - Dosya yüklenirken: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Güvenlik kontrolünden geçemedi: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            logger.warn("Geçersiz dosya: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            logger.error("Dosya yükleme hatası: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Dosya yüklenirken hata oluştu: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Beklenmeyen hata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Beklenmeyen bir hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Profil resmi yükleme endpoint'i
     */
    @PostMapping("/profile-image")
    public ResponseEntity<?> uploadProfileImage(@RequestParam("file") MultipartFile file, Authentication authentication) {
        try {
            if (file.isEmpty()) {
                logger.warn("Boş profil resmi yükleme denemesi: {}", authentication.getName());
                return ResponseEntity.badRequest().body(Map.of("error", "Dosya boş olamaz"));
            }

            // Sadece resimlere izin ver
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                logger.warn("Geçersiz profil resmi formatı: {}, tür: {}", 
                    authentication.getName(), contentType);
                return ResponseEntity.badRequest().body(Map.of("error", "Sadece resim dosyaları kabul edilir"));
            }

            // Kullanıcıyı bul
            User user = userService.findByUsername(authentication.getName());
            if (user == null) {
                logger.error("Kullanıcı bulunamadı: {}", authentication.getName());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Kullanıcı bulunamadı"));
            }

            logger.info("Profil resmi yükleniyor: {}, boyut: {} bytes, kullanıcı: {}", 
                file.getOriginalFilename(), file.getSize(), user.getUsername());

            // Profil resmini kaydet
            String imageUrl = mediaService.uploadProfileImage(file, user);

            logger.info("Profil resmi başarıyla yüklendi: {}, URL: {}", 
                file.getOriginalFilename(), imageUrl);

            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);
            response.put("message", "Profil resmi başarıyla güncellendi");
            
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            logger.error("Güvenlik hatası - Profil resmi yüklenirken: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Güvenlik kontrolünden geçemedi: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            logger.warn("Geçersiz profil resmi: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            logger.error("Profil resmi yükleme hatası: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Dosya yüklenirken hata oluştu: " + e.getMessage()));
        } catch (Exception e) {
            logger.error("Beklenmeyen hata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Beklenmeyen bir hata oluştu: " + e.getMessage()));
        }
    }
} 