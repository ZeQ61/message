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
        this.type = type;
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
        this.type = type;
    }
} 