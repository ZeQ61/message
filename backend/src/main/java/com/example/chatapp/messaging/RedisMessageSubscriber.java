package com.example.chatapp.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Redis üzerinden gelen mesajları dinleyen ve WebSocket üzerinden ilgili kullanıcılara ileten sınıf
 */
@Component
public class RedisMessageSubscriber {

    private static final Logger logger = LoggerFactory.getLogger(RedisMessageSubscriber.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final String instanceId;

    public RedisMessageSubscriber(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper, String instanceId) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.instanceId = instanceId;
    }

    /**
     * Redis'ten gelen chat mesajlarını işler
     */
    public void receiveChatMessage(String message) {
        try {
            // Mesaj bilgilerini ayrıştır
            MessageEnvelope envelope = objectMapper.readValue(message, MessageEnvelope.class);
            
            // Eğer mesaj bu instance'dan geldiyse işleme, çünkü zaten gönderildi
            if (instanceId.equals(envelope.getSourceInstanceId())) {
                logger.debug("Bu instance'dan gelen chat mesajı - atlanıyor: {}", envelope.getMessageId());
                return;
            }

            // Mesaj içeriğini JSON nesnesine dönüştür
            Map<String, Object> messageData = objectMapper.readValue(envelope.getPayload(), Map.class);
            
            // Hedef kullanıcı adını al
            String targetUsername = (String) messageData.get("targetUsername");
            
            // Mesajı hedef kullanıcıya ilet
            if (targetUsername != null) {
                logger.debug("Chat mesajı Redis'ten alındı, kullanıcıya gönderiliyor: {}", targetUsername);
                messagingTemplate.convertAndSendToUser(targetUsername, "/queue/messages", messageData);
            } else {
                // Eğer hedef kullanıcı belirtilmemişse, genel bir topic'e gönder
                logger.debug("Chat mesajı Redis'ten alındı, genel topic'e gönderiliyor");
                messagingTemplate.convertAndSend("/topic/chat", messageData);
            }
        } catch (JsonProcessingException e) {
            logger.error("Redis'ten gelen chat mesajı işlenirken hata: {}", e.getMessage(), e);
        }
    }

    /**
     * Redis'ten gelen grup mesajlarını işler
     */
    public void receiveGroupMessage(String message) {
        try {
            // Mesaj bilgilerini ayrıştır
            MessageEnvelope envelope = objectMapper.readValue(message, MessageEnvelope.class);
            
            // Eğer mesaj bu instance'dan geldiyse işleme, çünkü zaten gönderildi
            if (instanceId.equals(envelope.getSourceInstanceId())) {
                logger.debug("Bu instance'dan gelen grup mesajı - atlanıyor: {}", envelope.getMessageId());
                return;
            }

            // Mesaj içeriğini JSON nesnesine dönüştür
            Map<String, Object> messageData = objectMapper.readValue(envelope.getPayload(), Map.class);
            
            // Grup ID'sini al
            Long groupId = ((Number) messageData.get("groupId")).longValue();
            
            // Mesajı grup kanalına ilet
            if (groupId != null) {
                logger.debug("Grup mesajı Redis'ten alındı, gruba gönderiliyor: {}", groupId);
                messagingTemplate.convertAndSend("/topic/group/" + groupId, messageData);
            } else {
                logger.warn("Grup mesajında groupId bulunamadı, mesaj atlanıyor");
            }
        } catch (Exception e) {
            logger.error("Redis'ten gelen grup mesajı işlenirken hata: {}", e.getMessage(), e);
        }
    }

    /**
     * Redis'ten gelen durum güncelleme mesajlarını işler
     */
    public void receiveStatusMessage(String message) {
        try {
            // Mesaj bilgilerini ayrıştır
            MessageEnvelope envelope = objectMapper.readValue(message, MessageEnvelope.class);
            
            // Eğer mesaj bu instance'dan geldiyse işleme, çünkü zaten gönderildi
            if (instanceId.equals(envelope.getSourceInstanceId())) {
                logger.debug("Bu instance'dan gelen durum mesajı - atlanıyor: {}", envelope.getMessageId());
                return;
            }

            // Mesaj içeriğini JSON nesnesine dönüştür
            Map<String, Object> statusData = objectMapper.readValue(envelope.getPayload(), Map.class);
            
            // Durum mesajını tüm kullanıcılara yayınla
            logger.debug("Durum mesajı Redis'ten alındı, tüm kullanıcılara gönderiliyor");
            messagingTemplate.convertAndSend("/topic/status", statusData);
        } catch (JsonProcessingException e) {
            logger.error("Redis'ten gelen durum mesajı işlenirken hata: {}", e.getMessage(), e);
        }
    }

    /**
     * Redis'ten gelen arkadaşlık güncelleme mesajlarını işler
     */
    public void receiveFriendshipMessage(String message) {
        try {
            // Mesaj bilgilerini ayrıştır
            MessageEnvelope envelope = objectMapper.readValue(message, MessageEnvelope.class);
            
            // Eğer mesaj bu instance'dan geldiyse işleme, çünkü zaten gönderildi
            if (instanceId.equals(envelope.getSourceInstanceId())) {
                logger.debug("Bu instance'dan gelen arkadaşlık mesajı - atlanıyor: {}", envelope.getMessageId());
                return;
            }

            // Mesaj içeriğini JSON nesnesine dönüştür
            Map<String, Object> friendshipData = objectMapper.readValue(envelope.getPayload(), Map.class);
            
            // Hedef kullanıcı adını al
            String targetUsername = (String) friendshipData.get("targetUsername");
            
            // Mesajı hedef kullanıcıya ilet
            if (targetUsername != null) {
                logger.debug("Arkadaşlık mesajı Redis'ten alındı, kullanıcıya gönderiliyor: {}", targetUsername);
                messagingTemplate.convertAndSendToUser(targetUsername, "/queue/friendship", friendshipData);
            } else {
                // Eğer hedef kullanıcı belirtilmemişse, genel bir topic'e gönder
                logger.debug("Arkadaşlık mesajı Redis'ten alındı, genel topic'e gönderiliyor");
                messagingTemplate.convertAndSend("/topic/friendship", friendshipData);
            }
        } catch (JsonProcessingException e) {
            logger.error("Redis'ten gelen arkadaşlık mesajı işlenirken hata: {}", e.getMessage(), e);
        }
    }
} 