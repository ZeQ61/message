package com.example.chatapp.repository;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRepository extends JpaRepository<Chat, Long> {
    
    @Query("SELECT c FROM Chat c JOIN c.participants p WHERE p = :user")
    List<Chat> findByParticipant(@Param("user") User user);
    
    @Query("SELECT c FROM Chat c JOIN c.participants p1 JOIN c.participants p2 WHERE (p1 = :user1 AND p2 = :user2) AND SIZE(c.participants) = 2")
    Optional<Chat> findPrivateChatBetween(@Param("user1") User user1, @Param("user2") User user2);
}
