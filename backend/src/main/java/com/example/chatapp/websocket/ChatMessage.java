package com.example.chatapp.websocket;

import java.time.LocalDateTime;

/**
 * WebSocket üzerinden gönderilen mesaj nesnesi
 */
public class ChatMessage {
    private Long id;
    private Long chatId;
    private Long senderId;
    private String senderUsername;
    private String senderName;
    private String senderProfileImage;
    private String content;
    private LocalDateTime timestamp;
    private MessageType type;

    public enum MessageType {
        CHAT, // Normal sohbet mesajı
        JOIN, // Kullanıcı sohbete katıldı
        LEAVE // Kullanıcı sohbetten ayrıldı
    }

    public ChatMessage() {
        this.timestamp = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getChatId() {
        return chatId;
    }

    public void setChatId(Long chatId) {
        this.chatId = chatId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderProfileImage() {
        return senderProfileImage;
    }

    public void setSenderProfileImage(String senderProfileImage) {
        this.senderProfileImage = senderProfileImage;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }
}
