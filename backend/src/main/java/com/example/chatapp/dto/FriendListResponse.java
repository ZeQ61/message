package com.example.chatapp.dto;

import java.util.List;

public class FriendListResponse {
    
    private List<FriendshipResponse> friends;
    private List<FriendshipResponse> pendingRequests;
    private List<FriendshipResponse> receivedRequests;
    
    // Constructor
    public FriendListResponse() {
    }
    
    public FriendListResponse(List<FriendshipResponse> friends, List<FriendshipResponse> pendingRequests, List<FriendshipResponse> receivedRequests) {
        this.friends = friends;
        this.pendingRequests = pendingRequests;
        this.receivedRequests = receivedRequests;
    }
    
    // Getter ve Setter'lar
    public List<FriendshipResponse> getFriends() {
        return friends;
    }
    
    public void setFriends(List<FriendshipResponse> friends) {
        this.friends = friends;
    }
    
    public List<FriendshipResponse> getPendingRequests() {
        return pendingRequests;
    }
    
    public void setPendingRequests(List<FriendshipResponse> pendingRequests) {
        this.pendingRequests = pendingRequests;
    }
    
    public List<FriendshipResponse> getReceivedRequests() {
        return receivedRequests;
    }
    
    public void setReceivedRequests(List<FriendshipResponse> receivedRequests) {
        this.receivedRequests = receivedRequests;
    }
} 