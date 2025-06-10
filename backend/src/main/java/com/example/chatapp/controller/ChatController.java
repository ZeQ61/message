package com.example.chatapp.controller;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.ChatMessage;
import com.example.chatapp.model.User;
import com.example.chatapp.service.ChatService;
import com.example.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserService userService;

    /**
     * Belirli bir sohbetin detaylarını getirir
     */
    @GetMapping("/{chatId}")
    public ResponseEntity<?> getChatById(@PathVariable Long chatId, Authentication authentication) {
        try {
            User currentUser = userService.getCurrentUser(authentication);
            
            // Sohbeti katılımcılarla birlikte al
            Chat chat = chatService.getChatWithParticipants(chatId);
            
            // Kullanıcının bu sohbetin katılımcısı olduğunu kontrol et - ID karşılaştırması kullan
            boolean isParticipant = false;
            for (User participant : chat.getParticipants()) {
                if (participant.getId().equals(currentUser.getId())) {
                    isParticipant = true;
                    break;
                }
            }
            
            if (!isParticipant) {
                return ResponseEntity.status(403).body("Bu sohbete erişim izniniz yok");
            }
            
            // Sohbeti DTO'ya dönüştür
            Map<String, Object> chatDto = new HashMap<>();
            chatDto.put("id", chat.getId());
            chatDto.put("createdAt", chat.getCreatedAt());
            
            // Katılımcıları dönüştür
            List<Map<String, Object>> participants = chat.getParticipants().stream()
                    .map(user -> {
                        Map<String, Object> userDto = new HashMap<>();
                        userDto.put("id", user.getId());
                        userDto.put("username", user.getUsername());
                        userDto.put("isim", user.getIsim());
                        userDto.put("soyad", user.getSoyad());
                        userDto.put("profileImageUrl", user.getProfileImageUrl());
                        userDto.put("online", user.isOnline());
                        userDto.put("isCurrent", user.getId().equals(currentUser.getId()));
                        return userDto;
                    })
                    .collect(Collectors.toList());
            
            chatDto.put("participants", participants);
            
            return ResponseEntity.ok(chatDto);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Sohbet getirilirken bir hata oluştu: " + e.getMessage());
        }
    }

    /**
     * Kullanıcının tüm sohbetlerini getirir
     */
    @GetMapping
    public ResponseEntity<?> getUserChats(Authentication authentication) {
        User currentUser = userService.getCurrentUser(authentication);
        List<Chat> chats = chatService.getUserChats(currentUser);
        
        // Sohbetleri DTO'ya dönüştür
        List<Map<String, Object>> chatDtos = chats.stream().map(chat -> {
            Map<String, Object> chatDto = new HashMap<>();
            chatDto.put("id", chat.getId());
            chatDto.put("createdAt", chat.getCreatedAt());
            
            // Diğer katılımcıları bul (kendisi hariç)
            List<Map<String, Object>> participants = chat.getParticipants().stream()
                    .filter(user -> !user.getId().equals(currentUser.getId()))
                    .map(user -> {
                        Map<String, Object> userDto = new HashMap<>();
                        userDto.put("id", user.getId());
                        userDto.put("username", user.getUsername());
                        userDto.put("isim", user.getIsim());
                        userDto.put("soyad", user.getSoyad());
                        userDto.put("profileImageUrl", user.getProfileImageUrl());
                        userDto.put("online", user.isOnline());
                        return userDto;
                    })
                    .collect(Collectors.toList());
            
            chatDto.put("participants", participants);
            return chatDto;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(chatDtos);
    }

    /**
     * Belirli bir sohbetteki mesajları getirir
     */
    @GetMapping("/{chatId}/messages")
    public ResponseEntity<?> getChatMessages(@PathVariable Long chatId, Authentication authentication) {
        User currentUser = userService.getCurrentUser(authentication);
        Chat chat = chatService.getChatById(chatId);
        
        // Kullanıcının bu sohbetin katılımcısı olduğunu kontrol et - ID karşılaştırması kullan
        boolean isParticipant = false;
        for (User participant : chat.getParticipants()) {
            if (participant.getId().equals(currentUser.getId())) {
                isParticipant = true;
                break;
            }
        }
        
        if (!isParticipant) {
            return ResponseEntity.status(403).body("Bu sohbete erişim izniniz yok");
        }
        
        List<ChatMessage> messages = chatService.getChatMessages(chat);
        
        // Mesajları DTO'ya dönüştür
        List<Map<String, Object>> messageDtos = messages.stream().map(message -> {
            Map<String, Object> messageDto = new HashMap<>();
            messageDto.put("id", message.getId());
            messageDto.put("content", message.getContent());
            messageDto.put("timestamp", message.getTimestamp());
            
            Map<String, Object> senderDto = new HashMap<>();
            senderDto.put("id", message.getSender().getId());
            senderDto.put("username", message.getSender().getUsername());
            senderDto.put("isim", message.getSender().getIsim());
            senderDto.put("soyad", message.getSender().getSoyad());
            senderDto.put("profileImageUrl", message.getSender().getProfileImageUrl());
            
            messageDto.put("sender", senderDto);
            messageDto.put("isMine", message.getSender().getId().equals(currentUser.getId()));
            
            return messageDto;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(messageDtos);
    }

    /**
     * İki kullanıcı arasında özel sohbet başlatır veya mevcut sohbeti getirir
     */
    @PostMapping("/private/{userId}")
    public ResponseEntity<?> startPrivateChat(@PathVariable Long userId, Authentication authentication) {
        try {
            // Geçerlilik kontrolleri
            if (userId == null) {
                return ResponseEntity.badRequest().body("Geçersiz kullanıcı ID");
            }
            
            // Mevcut kullanıcıyı al
            User currentUser = userService.getCurrentUser(authentication);
            if (currentUser == null) {
                return ResponseEntity.status(401).body("Kimlik doğrulama başarısız");
            }
            
            // Kendi kendine sohbet başlatmayı engelle
            if (currentUser.getId().equals(userId)) {
                return ResponseEntity.badRequest().body("Kendinizle sohbet başlatamazsınız");
            }
            
            // Diğer kullanıcıyı al
            User otherUser = userService.getUserById(userId);
            if (otherUser == null) {
                return ResponseEntity.status(404).body("Kullanıcı bulunamadı: " + userId);
            }
            
            // Özel sohbeti getir veya oluştur
            Chat chat = chatService.getOrCreatePrivateChat(currentUser, otherUser);
            if (chat == null || chat.getId() == null) {
                return ResponseEntity.status(500).body("Sohbet oluşturulamadı");
            }
            
            // Başarılı yanıt dön
            Map<String, Object> response = new HashMap<>();
            response.put("chatId", chat.getId());
            response.put("message", "Sohbet başarıyla başlatıldı");
            response.put("success", true);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Hata durumunda detaylı yanıt dön
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Sohbet başlatılırken bir hata oluştu");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("success", false);
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Yeni mesaj gönderir (mesaj içeriği ChatService'de şifrelenir)
     */
    @PostMapping("/{chatId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long chatId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        
        User currentUser = userService.getCurrentUser(authentication);
        Chat chat = chatService.getChatById(chatId);
        
        // Kullanıcının bu sohbetin katılımcısı olduğunu kontrol et
        boolean isParticipant = false;
        for (User participant : chat.getParticipants()) {
            if (participant.getId().equals(currentUser.getId())) {
                isParticipant = true;
                break;
            }
        }
        
        if (!isParticipant) {
            return ResponseEntity.status(403).body("Bu sohbete mesaj gönderme izniniz yok");
        }
        
        String content = payload.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Mesaj içeriği boş olamaz");
        }
        
        // ChatService mesajı şifreleyecek, burada düz metin içerik gönderiyoruz
        ChatMessage message = chatService.sendMessage(currentUser, chat, content);
        
        // Dönen response içeriği zaten şifre çözme işlemi yapılmış olmalı
        Map<String, Object> response = new HashMap<>();
        response.put("id", message.getId());
        
        // Mesaj içeriğini döndürmeden önce şifresini çöz
        String displayContent = content; // Frontend'e düz metni göster, veritabanında şifreli olarak saklanıyor
        response.put("content", displayContent);
        
        response.put("timestamp", message.getTimestamp());
        response.put("chatId", chat.getId());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Sohbeti siler
     */
    @DeleteMapping("/{chatId}")
    public ResponseEntity<?> deleteChat(@PathVariable Long chatId, Authentication authentication) {
        try {
            // Mevcut kullanıcıyı al
            User currentUser = userService.getCurrentUser(authentication);
            
            // Sohbeti katılımcılarla birlikte al
            Chat chat = chatService.getChatWithParticipants(chatId);
            
            // Kullanıcının bu sohbetin katılımcısı olduğunu kontrol et
            boolean isParticipant = false;
            for (User participant : chat.getParticipants()) {
                if (participant.getId().equals(currentUser.getId())) {
                    isParticipant = true;
                    break;
                }
            }
            
            if (!isParticipant) {
                return ResponseEntity.status(403).body("Bu sohbeti silme izniniz yok");
            }
            
            // Sohbeti sil
            chatService.deleteChat(chatId);
            
            // Başarılı yanıt dön
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Sohbet başarıyla silindi");
            response.put("success", true);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Hata durumunda detaylı yanıt dön
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Sohbet silinirken bir hata oluştu");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("success", false);
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Belirtilen kullanıcıyı zorla sohbete ekle (TEST/FIX AMAÇLI)
     */
    @PostMapping("/{chatId}/force-add/{userId}")
    public ResponseEntity<?> forceAddUserToChat(
            @PathVariable Long chatId,
            @PathVariable Long userId,
            Authentication authentication) {
        
        try {
            // Yetkili kullanıcıyı kontrol et
            User currentUser = userService.getCurrentUser(authentication);
            
            // Eklenecek kullanıcıyı bul
            User userToAdd = userService.getUserById(userId);
            if (userToAdd == null) {
                return ResponseEntity.status(404).body("Kullanıcı bulunamadı: " + userId);
            }
            
            // Sohbeti bul
            Chat chat = chatService.getChatById(chatId);
            if (chat == null) {
                return ResponseEntity.status(404).body("Sohbet bulunamadı: " + chatId);
            }
            
            // Kullanıcıyı sohbete ekle
            chatService.addUserToChat(chat, userToAdd);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Kullanıcı başarıyla sohbete eklendi");
            response.put("success", true);
            response.put("chatId", chatId);
            response.put("userId", userId);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Kullanıcı sohbete eklenirken bir hata oluştu");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("success", false);
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
