package com.example.chatapp.websocket;

import com.example.chatapp.messaging.RedisMessagePublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * WebSocket mesajlarını ilgili alıcılara gönderen sınıf
 */
@Component
public class WebSocketMessageDispatcher {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketMessageDispatcher.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private RedisMessagePublisher redisMessagePublisher;

    /**
     * Chat mesajını belirtilen kullanıcıya gönderir ve Redis'e yayınlar
     */
    public void sendChatMessage(String username, Object message) {
        try {
            logger.debug("Chat mesajı gönderiliyor: kullanıcı={}", username);
            
            // WebSocket üzerinden doğrudan kullanıcıya gönder
            messagingTemplate.convertAndSendToUser(username, "/queue/messages", message);
            
            // Redis üzerinden diğer servis instance'larına yayınla
            redisMessagePublisher.publishChatMessage(username, message);
            
            logger.debug("Chat mesajı başarıyla gönderildi: kullanıcı={}", username);
        } catch (Exception e) {
            logger.error("Chat mesajı gönderilirken hata oluştu: kullanıcı={}, hata={}", username, e.getMessage(), e);
        }
    }

    /**
     * Grup mesajını belirtilen grubun kanalına gönderir ve Redis'e yayınlar
     */
    public void sendGroupMessage(Long groupId, Object message) {
        try {
            logger.debug("Grup mesajı gönderiliyor: groupId={}", groupId);
            
            // WebSocket üzerinden grup kanalına gönder
            messagingTemplate.convertAndSend("/topic/group/" + groupId, message);
            
            // Redis üzerinden diğer servis instance'larına yayınla
            redisMessagePublisher.publishGroupMessage(groupId, message);
            
            logger.debug("Grup mesajı başarıyla gönderildi: groupId={}", groupId);
        } catch (Exception e) {
            logger.error("Grup mesajı gönderilirken hata oluştu: groupId={}, hata={}", groupId, e.getMessage(), e);
        }
    }

    /**
     * Durum mesajını tüm kullanıcılara yayınlar ve Redis'e yayınlar
     */
    public void broadcastStatusMessage(Object statusMessage) {
        try {
            logger.debug("Durum mesajı yayınlanıyor");
            
            // WebSocket üzerinden tüm bağlı kullanıcılara yayınla
            messagingTemplate.convertAndSend("/topic/status", statusMessage);
            
            // Redis üzerinden diğer servis instance'larına yayınla
            redisMessagePublisher.publishStatusMessage(statusMessage);
            
            logger.debug("Durum mesajı başarıyla yayınlandı");
        } catch (Exception e) {
            logger.error("Durum mesajı yayınlanırken hata oluştu: {}", e.getMessage(), e);
        }
    }

    /**
     * Arkadaşlık mesajını belirtilen kullanıcıya gönderir ve Redis'e yayınlar
     */
    public void sendFriendshipMessage(String username, Object friendshipMessage) {
        try {
            logger.debug("Arkadaşlık mesajı gönderiliyor: kullanıcı={}", username);
            
            // Mesaja hedef kullanıcı adını ekle - Redis için gerekli
            if (friendshipMessage instanceof Map) {
                ((Map<String, Object>) friendshipMessage).put("targetUsername", username);
            }
            
            // WebSocket üzerinden doğrudan kullanıcıya gönder
            messagingTemplate.convertAndSendToUser(username, "/queue/friendship", friendshipMessage);
            
            // Redis üzerinden diğer servis instance'larına yayınla
            redisMessagePublisher.publishFriendshipMessage(username, friendshipMessage);
            
            logger.debug("Arkadaşlık mesajı başarıyla gönderildi: kullanıcı={}", username);
        } catch (Exception e) {
            logger.error("Arkadaşlık mesajı gönderilirken hata oluştu: kullanıcı={}, hata={}", username, e.getMessage(), e);
        }
    }

    /**
     * Özel bir destination'a mesaj gönderir
     */
    public void sendToDestination(String destination, Object message) {
        try {
            logger.debug("Mesaj gönderiliyor: hedef={}", destination);
            messagingTemplate.convertAndSend(destination, message);
            logger.debug("Mesaj başarıyla gönderildi: hedef={}", destination);
        } catch (Exception e) {
            logger.error("Mesaj gönderilirken hata oluştu: hedef={}, hata={}", destination, e.getMessage(), e);
        }
    }
    
    /**
     * Özel bir mesajı belirtilen kullanıcıya ve belirtilen kuyruğa gönderir
     */
    public void sendPrivateMessage(String username, String destination, Object message) {
        try {
            logger.debug("Özel mesaj gönderiliyor: kullanıcı={}, hedef={}", username, destination);
            
            // WebSocket üzerinden doğrudan kullanıcıya belirtilen hedefe gönder
            messagingTemplate.convertAndSendToUser(username, destination, message);
            
            // Redis üzerinden diğer servis instance'larına yayınla (gerekirse)
            // Not: Redis'e yayınlama ihtiyacına göre buraya eklenebilir
            
            logger.debug("Özel mesaj başarıyla gönderildi: kullanıcı={}, hedef={}", username, destination);
        } catch (Exception e) {
            logger.error("Özel mesaj gönderilirken hata oluştu: kullanıcı={}, hedef={}, hata={}", 
                    username, destination, e.getMessage(), e);
        }
    }
    
    /**
     * Yazıyor göstergesini belirtilen kullanıcıya gönderir
     */
    public void sendTypingIndicator(String username, TypingIndicator typingIndicator) {
        try {
            logger.debug("Yazıyor göstergesi gönderiliyor: kullanıcı={}, yazıyor={}", 
                    username, typingIndicator.isTyping());
            
            // WebSocket üzerinden doğrudan kullanıcıya gönder
            messagingTemplate.convertAndSendToUser(username, "/queue/typing", typingIndicator);
            
            // Redis üzerinden diğer servis instance'larına yayınla (gerekirse)
            // Not: Redis'e yayınlama ihtiyacına göre buraya eklenebilir
            
            logger.debug("Yazıyor göstergesi başarıyla gönderildi: kullanıcı={}", username);
        } catch (Exception e) {
            logger.error("Yazıyor göstergesi gönderilirken hata oluştu: kullanıcı={}, hata={}", 
                    username, e.getMessage(), e);
        }
    }
} 