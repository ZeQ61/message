package com.example.chatapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class GroupDTO {

    private Long id;

    @NotBlank(message = "Grup adı boş olamaz")
    @Size(min = 3, max = 50, message = "Grup adı 3-50 karakter arasında olmalıdır")
    private String name;
    
    private String description;
    
    private String imageUrl;
    
    private Long creatorId;
    
    private List<Long> memberIds;
    
    private List<Long> adminIds;
    
    // Constructor
    public GroupDTO() {
    }
    
    public GroupDTO(Long id, String name, String description, String imageUrl) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
    }

    // Getter ve Setter'lar
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    public Long getCreatorId() {
        return creatorId;
    }
    
    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }
    
    public List<Long> getMemberIds() {
        return memberIds;
    }
    
    public void setMemberIds(List<Long> memberIds) {
        this.memberIds = memberIds;
    }
    
    public List<Long> getAdminIds() {
        return adminIds;
    }
    
    public void setAdminIds(List<Long> adminIds) {
        this.adminIds = adminIds;
    }
} 