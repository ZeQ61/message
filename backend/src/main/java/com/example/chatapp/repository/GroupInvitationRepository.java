package com.example.chatapp.repository;

import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupInvitation;
import com.example.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {
    
    // Kullanıcıya gönderilen bekleyen grup davetlerini bul
    List<GroupInvitation> findByInvitedUserAndStatus(User invitedUser, GroupInvitation.InvitationStatus status);
    
    // Belirli bir kullanıcının gönderdiği bekleyen davetleri bul
    List<GroupInvitation> findByInviterAndStatus(User inviter, GroupInvitation.InvitationStatus status);
    
    // Belirli bir gruba ait bekleyen davetleri bul
    List<GroupInvitation> findByGroupAndStatus(Group group, GroupInvitation.InvitationStatus status);
    
    // Kullanıcı ve grup için bekleyen daveti bul
    Optional<GroupInvitation> findByGroupAndInvitedUserAndStatus(
            Group group, User invitedUser, GroupInvitation.InvitationStatus status);
    
    // Belirli bir gruba ait tüm davetleri sil (grup silindiğinde)
    @Modifying
    @Query("DELETE FROM GroupInvitation gi WHERE gi.group.id = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
    
    // Belirli bir kullanıcı için tüm davetleri bul
    List<GroupInvitation> findByInvitedUser(User invitedUser);
} 