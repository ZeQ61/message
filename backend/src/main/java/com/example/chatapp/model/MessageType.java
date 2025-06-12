package com.example.chatapp.model;

/**
 * Mesaj tiplerini tanımlayan enum
 */
public enum MessageType {
    MESSAGE,       // Normal metin mesajı
    JOIN,          // Gruba katılma bildirimi
    LEAVE,         // Gruptan ayrılma bildirimi
    FILE,          // Dosya mesajı
    IMAGE,         // Resim mesajı
    VIDEO,         // Video mesajı
    AUDIO,         // Ses mesajı
    SYSTEM,        // Sistem mesajı
    DIRECT,        // Doğrudan mesaj (birebir)
    GROUP,         // Grup mesajı
    GROUP_JOIN,    // Gruba katılma mesajı
    GROUP_LEAVE,   // Gruptan ayrılma mesajı
    GROUP_INVITE,  // Grup daveti mesajı
    GROUP_ADMIN,   // Grup yönetici değişikliği mesajı
    GROUP_UPDATE   // Grup bilgileri güncelleme mesajı
} 