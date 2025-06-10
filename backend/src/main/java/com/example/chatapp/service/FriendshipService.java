package com.example.chatapp.service;

import com.example.chatapp.dto.FriendListResponse;
import com.example.chatapp.dto.FriendshipResponse;
import com.example.chatapp.model.Friendship;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.FriendshipRepository;
import com.example.chatapp.repository.UserRepository;
import com.example.chatapp.websocket.FriendshipMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Arkadaşlık isteği gönderme
    @Transactional
    public FriendshipResponse sendFriendRequest(User requester, Long receiverId) {
        // Alıcı kullanıcıyı bul
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));

        // Kendinize arkadaşlık isteği gönderemezsiniz
        if(requester.getId().equals(receiverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kendinize arkadaşlık isteği gönderemezsiniz");
        }

        // Mevcut bir arkadaşlık ilişkisi var mı kontrol et
        Optional<Friendship> existingRelation1 = friendshipRepository.findByRequesterAndReceiver(requester, receiver);
        Optional<Friendship> existingRelation2 = friendshipRepository.findByRequesterAndReceiver(receiver, requester);
        
        if(existingRelation1.isPresent() || existingRelation2.isPresent()) {
            Friendship existingFriendship = existingRelation1.isPresent() ? existingRelation1.get() : existingRelation2.get();
            String status = existingFriendship.getStatus().toString();
            
            if(status.equals("ACCEPTED")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu kullanıcı zaten arkadaşınız");
            } else if(status.equals("PENDING")) {
                if(existingRelation1.isPresent()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu kullanıcıya zaten istek gönderdiniz");
                } else {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu kullanıcı size zaten istek gönderdi");
                }
            } else if(status.equals("REJECTED")) {
                // Reddedilmiş isteği sil ve yeni istek oluştur
                friendshipRepository.delete(existingFriendship);
            }
        }

        // Yeni arkadaşlık isteği oluştur
        Friendship friendship = new Friendship(requester, receiver);
        Friendship savedFriendship = friendshipRepository.save(friendship);
        
        // WebSocket üzerinden bildirim gönder
        FriendshipMessage message = FriendshipMessage.fromFriendship(savedFriendship, "NEW_REQUEST");
        messagingTemplate.convertAndSend("/topic/friendship", message);
        System.out.println("New friendship request notification sent: " + requester.getUsername() + " -> " + receiver.getUsername());

        return new FriendshipResponse(savedFriendship);
    }

    // Arkadaşlık isteğini kabul etme
    @Transactional
    public FriendshipResponse acceptFriendRequest(User user, Long friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Arkadaşlık isteği bulunamadı"));

        // Sadece isteğin alıcısı kabul edebilir
        if(!friendship.getReceiver().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu isteği kabul etmeye yetkiniz yok");
        }

        // İstek zaten kabul edilmiş mi kontrol et
        if(friendship.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu istek zaten kabul edilmiş");
        }

        // İsteği kabul et
        friendship.setStatus(Friendship.FriendshipStatus.ACCEPTED);
        Friendship savedFriendship = friendshipRepository.save(friendship);
        
        // WebSocket üzerinden bildirim gönder
        FriendshipMessage message = FriendshipMessage.fromFriendship(savedFriendship, "ACCEPT");
        messagingTemplate.convertAndSend("/topic/friendship", message);
        System.out.println("Friendship accepted notification sent: " + friendship.getRequester().getUsername() + " <-> " + friendship.getReceiver().getUsername());

        return new FriendshipResponse(savedFriendship);
    }

    // Arkadaşlık isteğini reddetme
    @Transactional
    public FriendshipResponse rejectFriendRequest(User user, Long friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Arkadaşlık isteği bulunamadı"));

        // Sadece isteğin alıcısı reddedebilir
        if(!friendship.getReceiver().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu isteği reddetmeye yetkiniz yok");
        }

        // İstek zaten reddedilmiş mi kontrol et
        if(friendship.getStatus() == Friendship.FriendshipStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu istek zaten reddedilmiş");
        }

        // İsteği reddet
        friendship.setStatus(Friendship.FriendshipStatus.REJECTED);
        Friendship savedFriendship = friendshipRepository.save(friendship);
        
        // WebSocket üzerinden bildirim gönder
        FriendshipMessage message = FriendshipMessage.fromFriendship(savedFriendship, "REJECT");
        messagingTemplate.convertAndSend("/topic/friendship", message);
        System.out.println("Friendship rejected notification sent: " + friendship.getRequester().getUsername() + " -> " + friendship.getReceiver().getUsername());

        return new FriendshipResponse(savedFriendship);
    }

    // Arkadaşlık isteğini iptal etme (gönderen tarafından)
    @Transactional
    public void cancelFriendRequest(User user, Long friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Arkadaşlık isteği bulunamadı"));

        // Sadece isteğin göndereni iptal edebilir
        if(!friendship.getRequester().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu isteği iptal etmeye yetkiniz yok");
        }

        // İstek beklemede mi kontrol et
        if(friendship.getStatus() != Friendship.FriendshipStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sadece bekleyen istekler iptal edilebilir");
        }
        
        // WebSocket üzerinden bildirim gönder (silmeden önce)
        FriendshipMessage message = FriendshipMessage.fromFriendship(friendship, "CANCEL");
        messagingTemplate.convertAndSend("/topic/friendship", message);
        System.out.println("Friendship canceled notification sent: " + friendship.getRequester().getUsername() + " -> " + friendship.getReceiver().getUsername());

        // İsteği sil
        friendshipRepository.delete(friendship);
    }

    // Arkadaşı silme
    @Transactional
    public void removeFriend(User user, Long friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Arkadaşlık bulunamadı"));

        // Kullanıcı bu arkadaşlık ilişkisinin bir parçası mı?
        if(!friendship.getRequester().getId().equals(user.getId()) && !friendship.getReceiver().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu arkadaşlık ilişkisini yönetmeye yetkiniz yok");
        }

        // İlişki kabul edilmiş mi kontrol et
        if(friendship.getStatus() != Friendship.FriendshipStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu bir arkadaşlık ilişkisi değil");
        }
        
        // WebSocket üzerinden bildirim gönder (silmeden önce)
        FriendshipMessage message = FriendshipMessage.fromFriendship(friendship, "REMOVE");
        messagingTemplate.convertAndSend("/topic/friendship", message);
        System.out.println("Friendship removed notification sent: " + friendship.getRequester().getUsername() + " <-> " + friendship.getReceiver().getUsername());

        // Arkadaşlık ilişkisini sil
        friendshipRepository.delete(friendship);
    }

    // Kullanıcının arkadaş listesini ve bekleyen istekleri getir - optimize edilmiş
    @Transactional
    public FriendListResponse getFriendsList(User user) {
        // Kabul edilmiş arkadaşlıkları bul (kullanıcı hem gönderen hem alıcı olabilir)
        List<Friendship> acceptedAsSender = friendshipRepository.findByRequesterAndStatus(user, Friendship.FriendshipStatus.ACCEPTED);
        List<Friendship> acceptedAsReceiver = friendshipRepository.findByReceiverAndStatus(user, Friendship.FriendshipStatus.ACCEPTED);

        // Bekleyen giden istekleri bul
        List<Friendship> pendingRequests = friendshipRepository.findByRequesterAndStatus(user, Friendship.FriendshipStatus.PENDING);

        // Bekleyen gelen istekleri bul
        List<Friendship> receivedRequests = friendshipRepository.findByReceiverAndStatus(user, Friendship.FriendshipStatus.PENDING);

        // Arkadaşları özel DTO formatına dönüştür
        List<FriendshipResponse> friendResponses = new ArrayList<>();
        
        // Tüm kabul edilmiş arkadaşlıkları birleştir
        List<Friendship> allAcceptedFriendships = new ArrayList<>();
        allAcceptedFriendships.addAll(acceptedAsSender);
        allAcceptedFriendships.addAll(acceptedAsReceiver);
        
        // Arkadaşlıkları dönüştür ve her biri için doğru arkadaş bilgisini belirle
        for (Friendship friendship : allAcceptedFriendships) {
            // Kullanıcının ID'sini kullanarak arkadaşı belirleyen constructor'ı kullan
            FriendshipResponse response = new FriendshipResponse(friendship, user.getId());
            friendResponses.add(response);
        }

        // Giden istekleri DTO'lara dönüştür
        List<FriendshipResponse> pendingResponses = pendingRequests.stream()
                .map(FriendshipResponse::new)
                .collect(Collectors.toList());

        // Gelen istekleri DTO'lara dönüştür
        List<FriendshipResponse> receivedResponses = receivedRequests.stream()
                .map(FriendshipResponse::new)
                .collect(Collectors.toList());

        return new FriendListResponse(friendResponses, pendingResponses, receivedResponses);
    }

    // Kullanıcı arama
    public List<FriendshipResponse.UserSummary> searchUsers(User currentUser, String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        // Kullanıcı adı veya email ile arama yap
        List<User> users = userRepository.findByUsernameContainingOrEmailContainingOrIsimContainingOrSoyadContaining(query, query, query, query);

        // Kendini listeden çıkar
        users = users.stream()
                .filter(user -> !user.getId().equals(currentUser.getId()))
                .collect(Collectors.toList());
                
        // Kullanıcı bilgilerini DTO'ya dönüştür
        return users.stream()
                .map(user -> {
                    // Güncel çevrimiçi durumunu kullanarak DTO'yu oluştur
                    return new FriendshipResponse.UserSummary(
                        user.getId(),
                        user.getUsername(),
                        user.getIsim(),
                        user.getSoyad(),
                        user.getProfileImageUrl(),
                        user.isOnline()
                    );
                })
                .collect(Collectors.toList());
    }

    // İki kullanıcının arkadaş olup olmadığını kontrol et
    public boolean areFriends(Long userId1, Long userId2) {
        User user1 = userRepository.findById(userId1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı: " + userId1));
        
        User user2 = userRepository.findById(userId2)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı: " + userId2));
        
        // İki yönlü de kontrol edelim (user1->user2 veya user2->user1)
        return friendshipRepository.existsByRequesterAndReceiverAndStatus(user1, user2, Friendship.FriendshipStatus.ACCEPTED) ||
               friendshipRepository.existsByRequesterAndReceiverAndStatus(user2, user1, Friendship.FriendshipStatus.ACCEPTED);
    }
    
    // Kullanıcının arkadaşları arasında arama yap
    public List<User> searchFriends(User currentUser, String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        // Kullanıcının tüm arkadaşlıklarını getir
        List<Friendship> acceptedAsSender = friendshipRepository.findByRequesterAndStatus(currentUser, Friendship.FriendshipStatus.ACCEPTED);
        List<Friendship> acceptedAsReceiver = friendshipRepository.findByReceiverAndStatus(currentUser, Friendship.FriendshipStatus.ACCEPTED);
        
        // Tüm arkadaşları bir listeye topla
        List<User> allFriends = new ArrayList<>();
        
        // Gönderici olduğu arkadaşlıklarda arkadaş alıcıdır
        for (Friendship friendship : acceptedAsSender) {
            allFriends.add(friendship.getReceiver());
        }
        
        // Alıcı olduğu arkadaşlıklarda arkadaş göndericidir
        for (Friendship friendship : acceptedAsReceiver) {
            allFriends.add(friendship.getRequester());
        }
        
        // Arkadaşlar arasında arama yap
        return allFriends.stream()
            .filter(friend -> 
                friend.getUsername().toLowerCase().contains(query.toLowerCase()) || 
                (friend.getIsim() != null && friend.getIsim().toLowerCase().contains(query.toLowerCase())) ||
                (friend.getSoyad() != null && friend.getSoyad().toLowerCase().contains(query.toLowerCase())) ||
                (friend.getEmail() != null && friend.getEmail().toLowerCase().contains(query.toLowerCase()))
            )
            .collect(Collectors.toList());
    }
} 