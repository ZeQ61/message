package com.example.chatapp.model;

/**
 * Mesaj tiplerini tanımlayan enum
 */
public enum MessageType {
    MESSAGE,  // Normal metin mesajı
    JOIN,     // Gruba katılma bildirimi
    LEAVE,    // Gruptan ayrılma bildirimi
    FILE,     // Dosya mesajı
    IMAGE,    // Resim mesajı
    VIDEO,    // Video mesajı
    AUDIO,    // Ses mesajı
    SYSTEM    // Sistem mesajı
} 