package com.example.chatapp.websocket;

import java.time.LocalDateTime;

import com.example.chatapp.model.Friendship;

public class FriendshipMessage {
    private Long friendshipId;
    private Long requesterId;
    private String requesterUsername;
    private Long receiverId;
    private String receiverUsername;
    private String status; // "PENDING", "ACCEPTED", "REJECTED" veya "REMOVED"
    private LocalDateTime timestamp;
    private String action; // "NEW_REQUEST", "ACCEPT", "REJECT", "CANCEL", "REMOVE"

    // Constructors
    public FriendshipMessage() {
        this.timestamp = LocalDateTime.now();
    }

    public FriendshipMessage(Long friendshipId, Long requesterId, String requesterUsername, 
                           Long receiverId, String receiverUsername, 
                           String status, String action) {
        this.friendshipId = friendshipId;
        this.requesterId = requesterId;
        this.requesterUsername = requesterUsername;
        this.receiverId = receiverId;
        this.receiverUsername = receiverUsername;
        this.status = status;
        this.action = action;
        this.timestamp = LocalDateTime.now();
    }
    
    // Friendship entity'den oluşturma
    public static FriendshipMessage fromFriendship(Friendship friendship, String action) {
        return new FriendshipMessage(
            friendship.getId(),
            friendship.getRequester().getId(),
            friendship.getRequester().getUsername(),
            friendship.getReceiver().getId(),
            friendship.getReceiver().getUsername(),
            friendship.getStatus().toString(),
            action
        );
    }

    // Getters & Setters
    public Long getFriendshipId() {
        return friendshipId;
    }

    public void setFriendshipId(Long friendshipId) {
        this.friendshipId = friendshipId;
    }

    public Long getRequesterId() {
        return requesterId;
    }

    public void setRequesterId(Long requesterId) {
        this.requesterId = requesterId;
    }

    public String getRequesterUsername() {
        return requesterUsername;
    }

    public void setRequesterUsername(String requesterUsername) {
        this.requesterUsername = requesterUsername;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getReceiverUsername() {
        return receiverUsername;
    }

    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getAction() {
        return action;
    }
    
    public void setAction(String action) {
        this.action = action;
    }
} 