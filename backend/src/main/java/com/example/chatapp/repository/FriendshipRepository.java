package com.example.chatapp.repository;

import com.example.chatapp.model.Friendship;
import com.example.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    
    // Kullanıcının gönderdiği tüm arkadaşlık istekleri
    List<Friendship> findByRequester(User requester);
    
    // Kullanıcının aldığı tüm arkadaşlık istekleri
    List<Friendship> findByReceiver(User receiver);
    
    // Kullanıcının gönderdiği ve belirli bir duruma sahip olan istekler 
    List<Friendship> findByRequesterAndStatus(User requester, Friendship.FriendshipStatus status);
    
    // Kullanıcının aldığı ve belirli bir duruma sahip olan istekler
    List<Friendship> findByReceiverAndStatus(User receiver, Friendship.FriendshipStatus status);
    
    // İki kullanıcı arasındaki arkadaşlık durumunu bul
    Optional<Friendship> findByRequesterAndReceiver(User requester, User receiver);
    
    // Kullanıcının tüm arkadaşlık ilişkileri (hem gönderici hem alıcı olduğu)
    List<Friendship> findByRequesterOrReceiver(User requester, User receiver);
    
    // İki kullanıcı arasında kabul edilmiş arkadaşlık var mı kontrol et
    boolean existsByRequesterAndReceiverAndStatus(User requester, User receiver, Friendship.FriendshipStatus status);
    boolean existsByReceiverAndRequesterAndStatus(User receiver, User requester, Friendship.FriendshipStatus status);
} 