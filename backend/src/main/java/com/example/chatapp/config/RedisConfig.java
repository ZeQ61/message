package com.example.chatapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.example.chatapp.messaging.RedisMessagePublisher;
import com.example.chatapp.messaging.RedisMessageSubscriber;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;

@Configuration
@EnableScheduling
public class RedisConfig {

    @Value("${app.instance-id}")
    private String instanceId;

    /**
     * Redis için mesaj dinleyici container'ı oluşturur
     */
    @Bean
    public RedisMessageListenerContainer redisContainer(RedisConnectionFactory connectionFactory,
                                                      MessageListenerAdapter chatMessageAdapter,
                                                      MessageListenerAdapter groupMessageAdapter,
                                                      MessageListenerAdapter statusMessageAdapter,
                                                      MessageListenerAdapter friendshipMessageAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        
        // Farklı mesaj kanalları için dinleyiciler ekle
        container.addMessageListener(chatMessageAdapter, new PatternTopic("chat:messages"));
        container.addMessageListener(groupMessageAdapter, new PatternTopic("chat:group-messages"));
        container.addMessageListener(statusMessageAdapter, new PatternTopic("chat:status"));
        container.addMessageListener(friendshipMessageAdapter, new PatternTopic("chat:friendship"));
        
        return container;
    }

    /**
     * Chat mesajları için Redis dinleyici adaptörü
     */
    @Bean
    public MessageListenerAdapter chatMessageAdapter(RedisMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "receiveChatMessage");
    }

    /**
     * Grup mesajları için Redis dinleyici adaptörü
     */
    @Bean
    public MessageListenerAdapter groupMessageAdapter(RedisMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "receiveGroupMessage");
    }

    /**
     * Durum güncellemeleri için Redis dinleyici adaptörü
     */
    @Bean
    public MessageListenerAdapter statusMessageAdapter(RedisMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "receiveStatusMessage");
    }

    /**
     * Arkadaşlık güncellemeleri için Redis dinleyici adaptörü
     */
    @Bean
    public MessageListenerAdapter friendshipMessageAdapter(RedisMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "receiveFriendshipMessage");
    }

    /**
     * Redis mesaj aboneliği yöneticisi
     */
    @Bean
    public RedisMessageSubscriber redisMessageSubscriber(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        return new RedisMessageSubscriber(messagingTemplate, objectMapper, instanceId);
    }

    /**
     * Redis mesaj yayınlayıcısı
     */
    @Bean
    public RedisMessagePublisher redisMessagePublisher(RedisTemplate<String, Object> redisTemplate) {
        return new RedisMessagePublisher(redisTemplate, instanceId);
    }

    /**
     * Redis template'i
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // JSON serileştirme için ObjectMapper'ı yapılandır
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        
        // Key ve Value için farklı serileştiriciler kullan
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new Jackson2JsonRedisSerializer<>(Object.class));
        
        return template;
    }
    
    /**
     * ObjectMapper bean'i
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        return objectMapper;
    }
} 