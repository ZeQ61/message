package com.example.chatapp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "group_messages")
public class GroupMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(nullable = false)
    private String content;

    private LocalDateTime timestamp = LocalDateTime.now();
    
    private boolean isDeleted = false;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    // Veritabanında sadece belirli değerler kabul ediliyor, diğer değerler için MESSAGE kullanılmalı
    // Kabul edilen değerler: MESSAGE, JOIN, LEAVE, FILE, IMAGE, VIDEO, AUDIO, SYSTEM, DIRECT, GROUP, GROUP_JOIN, GROUP_LEAVE
    private MessageType type = MessageType.MESSAGE;

    // Constructor
    public GroupMessage() {}

    public GroupMessage(User sender, Group group, String content) {
        this.sender = sender;
        this.group = group;
        this.content = content;
        this.timestamp = LocalDateTime.now();
        this.type = MessageType.MESSAGE;
    }
    
    public GroupMessage(User sender, Group group, String content, MessageType type) {
        this.sender = sender;
        this.group = group;
        this.content = content;
        this.timestamp = LocalDateTime.now();
        
        // Veritabanı kısıtlaması nedeniyle, sadece kabul edilen değerleri kullan
        // Eğer kabul edilmeyen bir değer gelirse MESSAGE olarak ayarla
        if (isValidMessageType(type)) {
            this.type = type;
        } else {
            this.type = MessageType.MESSAGE;
        }
    }
    
    // Veritabanı kısıtlamasına uygun mesaj tipleri
    private boolean isValidMessageType(MessageType type) {
        switch (type) {
            case MESSAGE:
            case JOIN:
            case LEAVE:
            case FILE:
            case IMAGE:
            case VIDEO:
            case AUDIO:
            case SYSTEM:
            case DIRECT:
            case GROUP:
            case GROUP_JOIN:
            case GROUP_LEAVE:
                return true;
            default:
                return false;
        }
    }

    // Getter ve Setter'lar
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public Group getGroup() {
        return group;
    }

    public void setGroup(Group group) {
        this.group = group;
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
    
    public boolean isDeleted() {
        return isDeleted;
    }
    
    public void setDeleted(boolean isDeleted) {
        this.isDeleted = isDeleted;
    }
    
    public MessageType getType() {
        return type;
    }
    
    public void setType(MessageType type) {
        // Veritabanı kısıtlaması nedeniyle, sadece kabul edilen değerleri kullan
        if (isValidMessageType(type)) {
            this.type = type;
        } else {
            this.type = MessageType.MESSAGE;
        }
    }
} 