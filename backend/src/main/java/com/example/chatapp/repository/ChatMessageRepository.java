package com.example.chatapp.repository;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    List<ChatMessage> findByChatOrderByTimestampAsc(Chat chat);
    
    @Query("SELECT m FROM ChatMessage m WHERE m.chat = :chat ORDER BY m.timestamp DESC")
    List<ChatMessage> findRecentMessages(@Param("chat") Chat chat);

    // Sohbete ait tüm mesajları silme
    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage m WHERE m.chat.id = :chatId")
    void deleteByChatId(@Param("chatId") Long chatId);
}
