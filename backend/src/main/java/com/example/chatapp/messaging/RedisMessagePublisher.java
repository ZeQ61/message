package com.example.chatapp.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * WebSocket üzerinden gelen mesajları Redis aracılığıyla diğer servis instance'larına ileten sınıf
 */
@Component
public class RedisMessagePublisher {

    private static final Logger logger = LoggerFactory.getLogger(RedisMessagePublisher.class);
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final String instanceId;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public RedisMessagePublisher(RedisTemplate<String, Object> redisTemplate, String instanceId) {
        this.redisTemplate = redisTemplate;
        this.instanceId = instanceId;
    }
    
    /**
     * Chat mesajını Redis'e yayınlar
     */
    public void publishChatMessage(String targetUsername, Object messageData) {
        try {
            String channel = "chat:messages";
            
            // Mesaj içeriğini JSON'a dönüştür
            String messagePayload = objectMapper.writeValueAsString(messageData);
            
            // Mesajı zarfla
            MessageEnvelope envelope = new MessageEnvelope(instanceId, "CHAT", messagePayload);
            
            // Redis'e gönder
            String envelopeJson = objectMapper.writeValueAsString(envelope);
            redisTemplate.convertAndSend(channel, envelopeJson);
            
            logger.debug("Chat mesajı Redis'e yayınlandı: kanal={}, hedef={}", channel, targetUsername);
        } catch (JsonProcessingException e) {
            logger.error("Chat mesajı Redis'e yayınlanırken hata: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Durum mesajını Redis'e yayınlar
     */
    public void publishStatusMessage(Object statusData) {
        try {
            String channel = "chat:status";
            
            // Mesaj içeriğini JSON'a dönüştür
            String messagePayload = objectMapper.writeValueAsString(statusData);
            
            // Mesajı zarfla
            MessageEnvelope envelope = new MessageEnvelope(instanceId, "STATUS", messagePayload);
            
            // Redis'e gönder
            String envelopeJson = objectMapper.writeValueAsString(envelope);
            redisTemplate.convertAndSend(channel, envelopeJson);
            
            logger.debug("Durum mesajı Redis'e yayınlandı: kanal={}", channel);
        } catch (JsonProcessingException e) {
            logger.error("Durum mesajı Redis'e yayınlanırken hata: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Arkadaşlık mesajını Redis'e yayınlar
     */
    public void publishFriendshipMessage(String targetUsername, Object friendshipData) {
        try {
            String channel = "chat:friendship";
            
            // Mesaj içeriğini JSON'a dönüştür
            String messagePayload = objectMapper.writeValueAsString(friendshipData);
            
            // Mesajı zarfla
            MessageEnvelope envelope = new MessageEnvelope(instanceId, "FRIENDSHIP", messagePayload);
            
            // Redis'e gönder
            String envelopeJson = objectMapper.writeValueAsString(envelope);
            redisTemplate.convertAndSend(channel, envelopeJson);
            
            logger.debug("Arkadaşlık mesajı Redis'e yayınlandı: kanal={}, hedef={}", channel, targetUsername);
        } catch (JsonProcessingException e) {
            logger.error("Arkadaşlık mesajı Redis'e yayınlanırken hata: {}", e.getMessage(), e);
        }
    }
} 