package com.example.chatapp.dto;

import jakarta.validation.constraints.NotNull;

public class FriendResponseRequest {
    
    @NotNull(message = "Arkadaşlık isteği ID'si boş olamaz")
    private Long friendshipId;
    
    @NotNull(message = "Yanıt boş olamaz")
    private String response; // "ACCEPTED" veya "REJECTED" değerlerini alır
    
    // Constructor
    public FriendResponseRequest() {
    }
    
    public FriendResponseRequest(Long friendshipId, String response) {
        this.friendshipId = friendshipId;
        this.response = response;
    }
    
    // Getter ve Setter'lar
    public Long getFriendshipId() {
        return friendshipId;
    }
    
    public void setFriendshipId(Long friendshipId) {
        this.friendshipId = friendshipId;
    }
    
    public String getResponse() {
        return response;
    }
    
    public void setResponse(String response) {
        this.response = response;
    }
} 