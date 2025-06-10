package com.example.chatapp.config;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class WebSocketRateLimiter implements ChannelInterceptor {
    private final LoadingCache<String, AtomicInteger> requestCounts;
    
    public WebSocketRateLimiter() {
        requestCounts = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.MINUTES)
            .build(new CacheLoader<String, AtomicInteger>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });
    }
    
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && accessor.getUser() != null) {
            Principal user = accessor.getUser();
            String username = user.getName();
            
            // Sadece mesaj gönderme işlemlerini sınırla
            if (accessor.getDestination() != null && accessor.getDestination().startsWith("/app/chat.")) {
                // Dakikada 60 mesaj sınırı (saniyede 1)
                if (requestCounts.getUnchecked(username).incrementAndGet() > 60) {
                    throw new MessageDeliveryException("Çok fazla mesaj gönderimi: Hız sınırı aşıldı");
                }
            }
        }
        
        return message;
    }
} 