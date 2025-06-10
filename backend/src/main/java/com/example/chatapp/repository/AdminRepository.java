package com.example.chatapp.repository;

import com.example.chatapp.model.Admin;
import com.example.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    // Admin kullanıcı adıyla arama yapabilmek için
    Optional<Admin> findByUsername(String username);
}
