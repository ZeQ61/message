package com.example.chatapp.dto;

import jakarta.validation.constraints.NotNull;

public class FriendRequest {
    
    @NotNull(message = "Alıcı kullanıcı ID'si boş olamaz")
    private Long receiverId;

    // Constructor
    public FriendRequest() {
    }

    public FriendRequest(Long receiverId) {
        this.receiverId = receiverId;
    }

    // Getter ve Setter'lar
    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }
} 