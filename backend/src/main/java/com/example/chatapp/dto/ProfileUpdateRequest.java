package com.example.chatapp.dto;

public class ProfileUpdateRequest {
    private String bio;
    private String profileImageUrl;
    private String password;
    
    // Default constructor
    public ProfileUpdateRequest() {
    }
    
    // Constructor with all fields
    public ProfileUpdateRequest(String bio, String profileImageUrl, String password) {
        this.bio = bio;
        this.profileImageUrl = profileImageUrl;
        this.password = password;
    }
    
    // Getters and Setters
    public String getBio() {
        return bio;
    }
    
    public void setBio(String bio) {
        this.bio = bio;
    }
    
    public String getProfileImageUrl() {
        return profileImageUrl;
    }
    
    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
} 