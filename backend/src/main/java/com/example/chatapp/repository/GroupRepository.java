package com.example.chatapp.repository;

import com.example.chatapp.model.Group;
import com.example.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    
    // Belirli bir kullanıcının üye olduğu tüm grupları getir
    List<Group> findByMembersContaining(User user);
    
    // Belirli bir kullanıcının yönetici olduğu tüm grupları getir
    List<Group> findByAdminsContaining(User user);
    
    // Belirli bir kullanıcının oluşturduğu tüm grupları getir
    List<Group> findByCreator(User creator);
    
    // Grup adına göre arama
    List<Group> findByNameContainingIgnoreCase(String name);
    
    // Bir kullanıcının belirli bir grubun üyesi olup olmadığını kontrol et
    @Query("SELECT CASE WHEN COUNT(g) > 0 THEN true ELSE false END FROM Group g JOIN g.members m WHERE g.id = :groupId AND m.id = :userId")
    boolean isUserMemberOfGroup(@Param("groupId") Long groupId, @Param("userId") Long userId);
    
    // Bir kullanıcının belirli bir grubun yöneticisi olup olmadığını kontrol et
    @Query("SELECT CASE WHEN COUNT(g) > 0 THEN true ELSE false END FROM Group g JOIN g.admins a WHERE g.id = :groupId AND a.id = :userId")
    boolean isUserAdminOfGroup(@Param("groupId") Long groupId, @Param("userId") Long userId);
} 