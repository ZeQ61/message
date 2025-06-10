package com.example.chatapp.messaging;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Redis aracılığıyla farklı servis instance'ları arasında iletilen mesajları saran sınıf
 */
public class MessageEnvelope {
    
    private String messageId;
    private String sourceInstanceId;
    private String messageType;
    private String payload;
    private LocalDateTime timestamp;
    
    // Boş constructor
    public MessageEnvelope() {
        this.messageId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
    }
    
    // Parametreli constructor
    public MessageEnvelope(String sourceInstanceId, String messageType, String payload) {
        this();
        this.sourceInstanceId = sourceInstanceId;
        this.messageType = messageType;
        this.payload = payload;
    }
    
    // Getters ve Setters
    public String getMessageId() {
        return messageId;
    }
    
    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }
    
    public String getSourceInstanceId() {
        return sourceInstanceId;
    }
    
    public void setSourceInstanceId(String sourceInstanceId) {
        this.sourceInstanceId = sourceInstanceId;
    }
    
    public String getMessageType() {
        return messageType;
    }
    
    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }
    
    public String getPayload() {
        return payload;
    }
    
    public void setPayload(String payload) {
        this.payload = payload;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    @Override
    public String toString() {
        return "MessageEnvelope{" +
                "messageId='" + messageId + '\'' +
                ", sourceInstanceId='" + sourceInstanceId + '\'' +
                ", messageType='" + messageType + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
} 