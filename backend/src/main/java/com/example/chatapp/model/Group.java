package com.example.chatapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "groups")
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 50)
    @Column(nullable = false)
    private String name;
    
    private String description;
    
    private String imageUrl;
    
    @ManyToMany
    @JoinTable(
            name = "group_members",
            joinColumns = @JoinColumn(name = "group_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> members = new HashSet<>();
    
    @ManyToMany
    @JoinTable(
            name = "group_admins",
            joinColumns = @JoinColumn(name = "group_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> admins = new HashSet<>();
    
    @ManyToOne
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;
    
    private LocalDateTime createdAt = LocalDateTime.now();
    
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Constructor
    public Group() {
    }

    public Group(String name, String description, String imageUrl, User creator) {
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.creator = creator;
        this.admins.add(creator);    // Yaratıcı otomatik olarak admin olur
        this.members.add(creator);   // Yaratıcı otomatik olarak grup üyesi olur
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
        this.updatedAt = LocalDateTime.now();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
        this.updatedAt = LocalDateTime.now();
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
        this.updatedAt = LocalDateTime.now();
    }

    public Set<User> getMembers() {
        return members;
    }

    public void setMembers(Set<User> members) {
        this.members = members;
    }
    
    public void addMember(User user) {
        this.members.add(user);
        this.updatedAt = LocalDateTime.now();
    }
    
    public void removeMember(User user) {
        this.members.remove(user);
        this.admins.remove(user);  // Eğer adminse, admin rolünü de kaldır
        this.updatedAt = LocalDateTime.now();
    }

    public Set<User> getAdmins() {
        return admins;
    }

    public void setAdmins(Set<User> admins) {
        this.admins = admins;
    }
    
    public void addAdmin(User user) {
        // Yönetici eklenecek kişi önce grup üyesi olmalıdır
        if (!this.members.contains(user)) {
            this.members.add(user);
        }
        this.admins.add(user);
        this.updatedAt = LocalDateTime.now();
    }
    
    public void removeAdmin(User user) {
        // Yaratıcı admin olmaktan çıkarılamaz
        if (!user.equals(this.creator)) {
            this.admins.remove(user);
            this.updatedAt = LocalDateTime.now();
        }
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
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
    
    public boolean isAdmin(User user) {
        return admins.contains(user);
    }
    
    public boolean isMember(User user) {
        return members.contains(user);
    }
} 