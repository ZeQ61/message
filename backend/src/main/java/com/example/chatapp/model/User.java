package com.example.chatapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.example.chatapp.model.Role;



import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // id otomatik artacak
    private Long id;

    @NotBlank
    @Size(min = 3, max = 20)
    private String isim;

    @NotBlank
    @Size(min = 3, max = 20)
    private String soyad;

    @NotBlank
    @Size(min = 3, max = 20)
    @Column(nullable = false, unique = true)
    private String username; // Kullanıcı adı

    @NotBlank
    @Size(min = 6)
    private String password; // Şifre

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email; // Email adresi

    @Enumerated(EnumType.STRING)
    private Role role = Role.USER; // Kullanıcı rolü (Admin/User)

    private boolean isOnline; // Online durumu

    private String profileImageUrl; // Profil fotoğrafı (opsiyonel)

    private String bio; // Kullanıcı bio (opsiyonel)

    private LocalDateTime createdAt; // Kayıt zamanı

    private LocalDateTime updatedAt; // Güncelleme zamanı

    // Constructor'lar
    public User() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public User(String isim,String soyad, String username, String password, String email, Role role, boolean isOnline, String profileImageUrl, String bio) {
        this.isim = isim;
        this.soyad = soyad;
        this.username = username;
        this.password = password;
        this.email = email;
        this.role = role;
        this.isOnline = isOnline;
        this.profileImageUrl = profileImageUrl;
        this.bio = bio;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        
        User user = (User) o;
        
        // ID ile karşılaştırma - koleksiyonlarda doğru çalışması için kritik
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}
