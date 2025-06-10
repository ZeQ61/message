package com.example.chatapp.websocket;

import java.time.LocalDateTime;

/**
 * Kullanıcının yazıyor durumunu ileten WebSocket mesajı
 */
public class TypingIndicator {
    private Long userId;
    private String username;
    private Long chatId;
    private boolean typing;
    private LocalDateTime timestamp;
    
    public TypingIndicator() {
        this.timestamp = LocalDateTime.now();
    }
    
    public TypingIndicator(Long userId, String username, Long chatId, boolean typing) {
        this.userId = userId;
        this.username = username;
        this.chatId = chatId;
        this.typing = typing;
        this.timestamp = LocalDateTime.now();
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
    
    public Long getChatId() {
        return chatId;
    }
    
    public void setChatId(Long chatId) {
        this.chatId = chatId;
    }
    
    public boolean isTyping() {
        return typing;
    }
    
    public void setTyping(boolean typing) {
        this.typing = typing;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
} 