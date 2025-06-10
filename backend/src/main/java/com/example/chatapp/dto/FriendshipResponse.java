package com.example.chatapp.dto;

import com.example.chatapp.model.Friendship;
import java.time.LocalDateTime;

public class FriendshipResponse {
    
    private Long id;
    private UserSummary requester;
    private UserSummary receiver;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserSummary friend; // Kullanıcının gerçek arkadaşını tutacak alan
    
    // İç içe kullanıcı özeti sınıfı
    public static class UserSummary {
        private Long id;
        private String username;
        private String isim;
        private String soyad;
        private String profileImageUrl;
        private boolean isOnline;
        
        public UserSummary() {
        }
        
        public UserSummary(Long id, String username, String isim, String soyad, String profileImageUrl, boolean isOnline) {
            this.id = id;
            this.username = username;
            this.isim = isim;
            this.soyad = soyad;
            this.profileImageUrl = profileImageUrl;
            this.isOnline = isOnline;
        }
        
        // Getter ve Setter'lar
        public Long getId() {
            return id;
        }
        
        public void setId(Long id) {
            this.id = id;
        }
        
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getIsim() {
            return isim;
        }
        
        public void setIsim(String isim) {
            this.isim = isim;
        }
        
        public String getSoyad() {
            return soyad;
        }
        
        public void setSoyad(String soyad) {
            this.soyad = soyad;
        }
        
        public String getProfileImageUrl() {
            return profileImageUrl;
        }
        
        public void setProfileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
        }
        
        public boolean isOnline() {
            return isOnline;
        }
        
        public void setOnline(boolean online) {
            isOnline = online;
        }
    }
    
    // Constructors
    public FriendshipResponse() {
    }
    
    // Standart constructor
    public FriendshipResponse(Friendship friendship) {
        this.id = friendship.getId();
        this.requester = new UserSummary(
            friendship.getRequester().getId(),
            friendship.getRequester().getUsername(),
            friendship.getRequester().getIsim(),
            friendship.getRequester().getSoyad(),
            friendship.getRequester().getProfileImageUrl(),
            friendship.getRequester().isOnline()
        );
        this.receiver = new UserSummary(
            friendship.getReceiver().getId(),
            friendship.getReceiver().getUsername(),
            friendship.getReceiver().getIsim(),
            friendship.getReceiver().getSoyad(),
            friendship.getReceiver().getProfileImageUrl(),
            friendship.getReceiver().isOnline()
        );
        this.status = friendship.getStatus().toString();
        this.createdAt = friendship.getCreatedAt();
        this.updatedAt = friendship.getUpdatedAt();
        
        // Kullanıcının gerçek arkadaşını otomatik olarak belirleyemeyiz
        // Bu durumda, frontend tarafında friendship.requester.id === user.id ? friendship.receiver : friendship.requester
        // şeklinde belirlenecek
    }
    
    // Oturum açan kullanıcıya göre arkadaşı belirleyen constructor
    public FriendshipResponse(Friendship friendship, Long currentUserId) {
        this.id = friendship.getId();
        this.requester = new UserSummary(
            friendship.getRequester().getId(),
            friendship.getRequester().getUsername(),
            friendship.getRequester().getIsim(),
            friendship.getRequester().getSoyad(),
            friendship.getRequester().getProfileImageUrl(),
            friendship.getRequester().isOnline()
        );
        this.receiver = new UserSummary(
            friendship.getReceiver().getId(),
            friendship.getReceiver().getUsername(),
            friendship.getReceiver().getIsim(),
            friendship.getReceiver().getSoyad(),
            friendship.getReceiver().getProfileImageUrl(),
            friendship.getReceiver().isOnline()
        );
        this.status = friendship.getStatus().toString();
        this.createdAt = friendship.getCreatedAt();
        this.updatedAt = friendship.getUpdatedAt();
        
        // Oturum açan kullanıcıya göre doğru arkadaşı belirle
        if (friendship.getRequester().getId().equals(currentUserId)) {
            this.friend = this.receiver; // Kullanıcının kendisi requester ise, arkadaşı receiver
        } else {
            this.friend = this.requester; // Kullanıcının kendisi receiver ise, arkadaşı requester
        }
    }
    
    // Getter ve Setter'lar
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public UserSummary getRequester() {
        return requester;
    }
    
    public void setRequester(UserSummary requester) {
        this.requester = requester;
    }
    
    public UserSummary getReceiver() {
        return receiver;
    }
    
    public void setReceiver(UserSummary receiver) {
        this.receiver = receiver;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public UserSummary getFriend() {
        return friend;
    }
    
    public void setFriend(UserSummary friend) {
        this.friend = friend;
    }
} 