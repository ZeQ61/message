package com.example.chatapp.websocket;

import java.time.LocalDateTime;

public class StatusMessage {
    private Long userId;
    private String username;
    private boolean isOnline;
    private LocalDateTime timestamp;

    // Constructors
    public StatusMessage() {
        this.timestamp = LocalDateTime.now();
    }

    public StatusMessage(Long userId, String username, boolean isOnline) {
        this.userId = userId;
        this.username = username;
        this.isOnline = isOnline;
        this.timestamp = LocalDateTime.now();
    }

    // Getters & Setters
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

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
} 