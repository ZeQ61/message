package com.example.chatapp.websocket;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.User;
import com.example.chatapp.model.UserPrincipal;
import com.example.chatapp.service.ChatService;
import com.example.chatapp.service.FriendshipService;
import com.example.chatapp.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Controller
public class ChatWebSocketController {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserService userService;
    
    @Autowired
    private FriendshipService friendshipService;
    
    @Autowired
    private WebSocketMessageDispatcher messageDispatcher;

    /**
     * Mesaj tipleri için enum
     */
    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE
    }
    
    /**
     * WebSocket mesajları için DTO sınıfı
     */
    public static class ChatMessage {
        private Long id;
        private Long chatId;
        private Long senderId;
        private String senderUsername;
        private String senderName;
        private String senderProfileImage;
        private String content;
        private Date timestamp;
        private MessageType type = MessageType.CHAT;
        private Map<String, Object> sender;
        
        // Getter ve Setter metotları
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        
        public Long getChatId() { return chatId; }
        public void setChatId(Long chatId) { this.chatId = chatId; }
        
        public Long getSenderId() { return senderId; }
        public void setSenderId(Long senderId) { this.senderId = senderId; }
        
        public String getSenderUsername() { return senderUsername; }
        public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
        
        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }
        
        public String getSenderProfileImage() { return senderProfileImage; }
        public void setSenderProfileImage(String senderProfileImage) { this.senderProfileImage = senderProfileImage; }
        
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        
        public Date getTimestamp() { return timestamp; }
        public void setTimestamp(Date timestamp) { this.timestamp = timestamp; }
        
        public MessageType getType() { return type; }
        public void setType(MessageType type) { this.type = type; }
        
        public Map<String, Object> getSender() { return sender; }
        public void setSender(Map<String, Object> sender) { this.sender = sender; }
    }
    
    /**
     * Kullanıcıdan gelen mesajı işler ve ilgili sohbet katılımcılarına iletir
     */
    @MessageMapping("/chat.sendMessage")
    @Transactional
    public void sendMessage(@Payload ChatMessage chatMessage, Principal principal) {
        try {
            // Mesajı gönderen kullanıcıyı bul
            User sender = userService.findByUsername(principal.getName());
            if (sender == null) {
                logger.error("Kullanıcı bulunamadı: {}", principal.getName());
                return;
            }
            
            // Sohbeti katılımcılarıyla birlikte bul (EAGER loading)
            Chat chat = chatService.getChatWithParticipants(chatMessage.getChatId());
            if (chat == null) {
                logger.error("Sohbet bulunamadı: {}", chatMessage.getChatId());
                return;
            }
            
            // Kullanıcının bu sohbetin katılımcısı olduğunu kontrol et - ID karşılaştırması kullan
            boolean isParticipant = false;
            for (User participant : chat.getParticipants()) {
                if (participant.getId().equals(sender.getId())) {
                    isParticipant = true;
                    break;
                }
            }
            
            if (!isParticipant) {
                logger.error("Kullanıcı bu sohbetin katılımcısı değil: {}", sender.getUsername());
                throw new AccessDeniedException("Bu sohbete erişim izniniz yok");
            }
            
            // Arkadaşlık kontrolü yap - özel sohbetler için
            if (chat.getParticipants().size() == 2) {
                User otherUser = null;
                for (User participant : chat.getParticipants()) {
                    if (!participant.getId().equals(sender.getId())) {
                        otherUser = participant;
                        break;
                    }
                }
                
                if (otherUser != null && !friendshipService.areFriends(sender.getId(), otherUser.getId())) {
                    logger.error("Kullanıcı {} ile arkadaş değil.", otherUser.getUsername());
                    throw new AccessDeniedException("Sadece arkadaşlarınızla mesajlaşabilirsiniz");
                }
            }
            
            // Veritabanına mesajı kaydet
            com.example.chatapp.model.ChatMessage savedMessage = chatService.sendMessage(
                    sender, 
                    chat, 
                    chatMessage.getContent()
            );
            
            // WebSocket mesajını hazırla
            chatMessage.setId(savedMessage.getId());
            chatMessage.setSenderId(sender.getId());
            chatMessage.setSenderUsername(sender.getUsername());
            chatMessage.setSenderName(sender.getIsim() + " " + sender.getSoyad());
            chatMessage.setSenderProfileImage(sender.getProfileImageUrl());
            // LocalDateTime'ı Date'e dönüştür
            Date timestamp = Date.from(savedMessage.getTimestamp().atZone(ZoneId.systemDefault()).toInstant());
            chatMessage.setTimestamp(timestamp);
            chatMessage.setType(MessageType.CHAT);
            
            // Ayrıca sender bilgilerini ayrı bir nesnede de gönderelim (frontend uyumluluğu için)
            Map<String, Object> senderData = new HashMap<>();
            senderData.put("id", sender.getId());
            senderData.put("username", sender.getUsername());
            senderData.put("isim", sender.getIsim());
            senderData.put("soyad", sender.getSoyad());
            senderData.put("profileImageUrl", sender.getProfileImageUrl());
            chatMessage.setSender(senderData);

            // Log bilgisi göster
            logger.debug("Katılımcılar: {} kişi", chat.getParticipants().size());
            
            // Sohbetteki tüm katılımcılara mesajı gönder
            for (User participant : chat.getParticipants()) {
                if (!participant.getId().equals(sender.getId())) {
                    try {
                        logger.debug("Mesaj gönderiliyor - Kullanıcı: {}", participant.getUsername());
                        
                        // Modüler mesaj gönderici kullan
                        messageDispatcher.sendChatMessage(participant.getUsername(), chatMessage);
                        
                        logger.debug("Mesaj başarıyla gönderildi - Kullanıcı: {}", participant.getUsername());
                    } catch (Exception e) {
                        logger.error("Mesaj gönderilirken hata - Kullanıcı: {}, Hata: {}", participant.getUsername(), e.getMessage());
                        logger.debug("Hata detayı:", e);
                    }
                } else {
                    logger.debug("Gönderici kendisine mesaj göndermeyecek: {}", participant.getUsername());
                }
            }

            logger.info("Mesaj başarıyla gönderildi: {}", chatMessage.getContent());
        } catch (Exception e) {
            logger.error("Mesaj gönderilirken hata oluştu: {}", e.getMessage());
            logger.debug("Hata detayı:", e);
        }
    }

    /**
     * Kullanıcının sohbete katıldığını işler
     */
    /**
     * Sohbete katılma mesajı için DTO sınıfı
     */
    public static class JoinChatMessage {
        private Long chatId;

        public Long getChatId() {
            return chatId;
        }

        public void setChatId(Long chatId) {
            this.chatId = chatId;
        }
    }
    
    /**
     * Kullanıcı durumu mesajı için DTO sınıfı
     */
    public static class UserStatusMessage {
        private Long userId;
        private String username;
        private String status;
        private Long chatId;

        public UserStatusMessage(Long userId, String username, String status, Long chatId) {
            this.userId = userId;
            this.username = username;
            this.status = status;
            this.chatId = chatId;
        }

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Long getChatId() {
            return chatId;
        }

        public void setChatId(Long chatId) {
            this.chatId = chatId;
        }
    }
    
    @MessageMapping("/chat.join")
    public void joinChat(@Payload JoinChatMessage joinMessage, Principal principal) {
        try {
            System.out.println("chat.join mesajı alındı: chatId=" + joinMessage.getChatId() + ", principal=" + principal.getName());
            
            // Kullanıcıyı bul
            User user = userService.findByUsername(principal.getName());
            if (user == null) {
                System.err.println("Kullanıcı bulunamadı: " + principal.getName());
                return;
            }
            
            // Sohbeti katılımcılarıyla birlikte bul
            Chat chat = chatService.getChatWithParticipants(joinMessage.getChatId());
            if (chat == null) {
                System.err.println("Sohbet bulunamadı: " + joinMessage.getChatId());
                return;
            }
            
            // Kullanıcının bu sohbetin katılımcısı olduğunu kontrol et
            boolean isParticipant = false;
            for (User participant : chat.getParticipants()) {
                if (participant.getId().equals(user.getId())) {
                    isParticipant = true;
                    break;
                }
            }
            
            if (!isParticipant) {
                System.err.println("Kullanıcı bu sohbetin katılımcısı değil: " + user.getUsername());
                return;
            }
            
            // Kullanıcının katıldığını diğer katılımcılara bildir
            UserStatusMessage statusMessage = new UserStatusMessage(
                    user.getId(),
                    user.getUsername(),
                    "joined",
                    chat.getId()
            );
            
            // Diğer katılımcılara bildirim gönder
            for (User participant : chat.getParticipants()) {
                if (!participant.getId().equals(user.getId())) {
                    messageDispatcher.sendPrivateMessage(
                            participant.getUsername(),
                            "/queue/chat-status",
                            statusMessage
                    );
                }
            }
            
            System.out.println("Kullanıcı sohbete katıldı: " + user.getUsername() + " -> Chat ID: " + chat.getId());
        } catch (Exception e) {
            System.err.println("Sohbete katılırken hata oluştu: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
