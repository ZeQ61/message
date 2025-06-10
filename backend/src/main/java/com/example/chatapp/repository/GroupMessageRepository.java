package com.example.chatapp.repository;

import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {
    
    // Bir gruba ait tüm mesajları getir (silinmemiş olanlar)
    List<GroupMessage> findByGroupAndIsDeletedFalseOrderByTimestampAsc(Group group);
    
    // Sayfalı şekilde bir grubun mesajlarını getir
    Page<GroupMessage> findByGroupAndIsDeletedFalseOrderByTimestampDesc(Group group, Pageable pageable);
    
    // Belirli bir tarihten sonraki grup mesajlarını getir
    List<GroupMessage> findByGroupAndTimestampAfterAndIsDeletedFalseOrderByTimestampAsc(Group group, LocalDateTime timestamp);
    
    // Bir grup mesajını "silindi" olarak işaretle
    @Modifying
    @Query("UPDATE GroupMessage gm SET gm.isDeleted = true WHERE gm.id = :messageId")
    void markMessageAsDeleted(@Param("messageId") Long messageId);
    
    // Bir gruptaki tüm mesajları sil (grup silindiğinde)
    @Modifying
    @Query("DELETE FROM GroupMessage gm WHERE gm.group.id = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
} 