package com.example.chatapp.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stories")
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    private String mediaUrl;

    private String caption;

    private LocalDateTime postedAt = LocalDateTime.now();

    private LocalDateTime expiresAt;
}
