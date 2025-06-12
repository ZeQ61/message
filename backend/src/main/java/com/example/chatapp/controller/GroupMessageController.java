package com.example.chatapp.controller;

import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupMessage;
import com.example.chatapp.model.MessageType;
import com.example.chatapp.model.User;
import com.example.chatapp.model.UserPrincipal;
import com.example.chatapp.service.GroupMessageService;
import com.example.chatapp.service.GroupService;
import com.example.chatapp.service.UserService;
import com.example.chatapp.websocket.WebSocketMessageDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
public class GroupMessageController {

    private static final Logger logger = LoggerFactory.getLogger(GroupMessageController.class);

    private final GroupMessageService groupMessageService;
    private final GroupService groupService;
    private final UserService userService;
    private final WebSocketMessageDispatcher webSocketMessageDispatcher;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    public GroupMessageController(GroupMessageService groupMessageService,
                                 GroupService groupService,
                                 UserService userService,
                                 WebSocketMessageDispatcher webSocketMessageDispatcher) {
        this.groupMessageService = groupMessageService;
        this.groupService = groupService;
        this.userService = userService;
        this.webSocketMessageDispatcher = webSocketMessageDispatcher;
    }

    // WebSocket ile gönderilen grup mesajlarını işleme
    @MessageMapping("/group.message.{groupId}")
    public void sendGroupMessage(
            @DestinationVariable Long groupId, 
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        
        logger.info("Grup mesajı alındı, groupId: {}", groupId);
        logger.debug("Mesaj detayları: {}", payload);
        
        try {
            // Kullanıcı bilgilerini al
            String username = null;
            if (headerAccessor.getUser() instanceof UserPrincipal) {
                username = ((UserPrincipal) headerAccessor.getUser()).getName();
                logger.info("Mesaj gönderen kullanıcı: {}", username);
            } else {
                logger.warn("Kullanıcı bilgisi alınamadı, anonim mesaj");
                return; // Anonim mesajları kabul etme
            }
            
            User sender = userService.findByUsername(username);
            if (sender == null) {
                logger.error("Kullanıcı bulunamadı: {}", username);
                return;
            }
            
            // Grup kontrolü
            Group group = groupService.getGroupById(groupId);
            if (!group.isMember(sender)) {
                logger.error("Kullanıcı {} grup {} üyesi değil, mesaj reddedildi", username, groupId);
                return;
            }
            
            // Mesaj içeriğini al
            String content = payload.get("content") != null ? payload.get("content").toString() : "";
            
            // Mesaj türünü belirle
            MessageType messageType = MessageType.MESSAGE;
            if (payload.get("type") != null) {
                try {
                    messageType = MessageType.valueOf(payload.get("type").toString());
                } catch (IllegalArgumentException e) {
                    logger.warn("Geçersiz mesaj türü: {}, varsayılan MESSAGE kullanılıyor", payload.get("type"));
                }
            }
            
            // Mesajı kaydet
            GroupMessage message = groupMessageService.saveGroupMessage(groupId, sender.getId(), content, messageType);
            
            if (message != null) {
                logger.info("Grup mesajı kaydedildi, id: {}", message.getId());
                
                // Mesajı grup kanalına gönder
                webSocketMessageDispatcher.sendGroupMessage(groupId, message);
                
                return;
            } else {
                logger.error("Grup mesajı kaydedilemedi");
                return;
            }
        } catch (Exception e) {
            logger.error("Grup mesajı işlenirken hata: {}", e.getMessage(), e);
            return;
        }
    }

    // Grup katılma işlemi
    @MessageMapping("/group.join.{groupId}")
    @Transactional
    public void joinGroup(
            @DestinationVariable Long groupId,
            SimpMessageHeaderAccessor headerAccessor) {
        
        logger.info("Grup katılma isteği alındı, groupId: {}", groupId);
        
        try {
            // Kullanıcı bilgilerini al
            String username = null;
            if (headerAccessor.getUser() instanceof UserPrincipal) {
                username = ((UserPrincipal) headerAccessor.getUser()).getName();
                logger.info("Gruba katılan kullanıcı: {}", username);
            } else {
                logger.warn("Kullanıcı bilgisi alınamadı, katılma işlemi iptal edildi");
                return;
            }
            
            User user = userService.findByUsername(username);
            if (user == null) {
                logger.error("Kullanıcı bulunamadı: {}", username);
                return;
            }
            
            // Grup kontrolü - Eager loading ile grup üyelerini yükle
            Group group = groupService.getGroupByIdWithMembers(groupId);
            if (!group.isMember(user)) {
                logger.error("Kullanıcı {} grup {} üyesi değil, katılma isteği reddedildi", username, groupId);
                return;
            }
            
            // Katılma mesajı oluştur
            GroupMessage joinMessage = groupMessageService.saveGroupMessage(
                    groupId, 
                    user.getId(), 
                    user.getUsername() + " gruba katıldı", 
                    MessageType.MESSAGE);
            
            if (joinMessage != null) {
                logger.info("Grup katılma mesajı kaydedildi, id: {}", joinMessage.getId());
                
                // Mesajı grup kanalına gönder
                webSocketMessageDispatcher.sendGroupMessage(groupId, joinMessage);
                
                return;
            } else {
                logger.error("Grup katılma mesajı kaydedilemedi");
                return;
            }
        } catch (Exception e) {
            logger.error("Grup katılma işlemi sırasında hata: {}", e.getMessage(), e);
            return;
        }
    }

    // Grup mesajlarını getir
    @GetMapping("/{groupId}/messages")
    public ResponseEntity<?> getGroupMessages(
            @PathVariable Long groupId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            if (userDetails == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Kullanıcı bilgisi alınamadı"));
            }
            
            User currentUser = userService.findByUsername(userDetails.getUsername());
            if (currentUser == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Kullanıcı bulunamadı"));
            }
            
            List<GroupMessage> messages = groupMessageService.getGroupMessages(groupId, currentUser.getId());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            logger.error("Grup mesajları getirilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    // Sayfalı grup mesajlarını getir
    @GetMapping("/{groupId}/messages/paged")
    public ResponseEntity<?> getGroupMessagesWithPagination(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            Page<GroupMessage> messages = groupMessageService.getGroupMessagesWithPagination(
                    groupId, currentUser.getId(), page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Belirli bir tarihten sonraki mesajları getir (real-time güncelleme için)
    @GetMapping("/{groupId}/messages/after")
    public ResponseEntity<?> getGroupMessagesAfterTimestamp(
            @PathVariable Long groupId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime timestamp,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            List<GroupMessage> messages = groupMessageService.getGroupMessagesAfterTimestamp(
                    groupId, currentUser.getId(), timestamp);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Metin mesajı gönder
    @PostMapping("/{groupId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long groupId,
            @RequestParam String content,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            GroupMessage message = groupMessageService.sendMessage(groupId, currentUser.getId(), content);
            
            // Mesajı WebSocket üzerinden grup kanalına gönder
            webSocketMessageDispatcher.sendGroupMessage(groupId, message);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Medya mesajı gönder
    @PostMapping("/{groupId}/messages/media")
    public ResponseEntity<?> sendMediaMessage(
            @PathVariable Long groupId,
            @RequestParam("media") MultipartFile media,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            GroupMessage message = groupMessageService.sendMediaMessage(groupId, currentUser.getId(), media);
            
            // Mesajı WebSocket üzerinden grup kanalına gönder
            webSocketMessageDispatcher.sendGroupMessage(groupId, message);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Mesajı sil
    @DeleteMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable Long groupId,
            @PathVariable Long messageId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            
            // Kullanıcı grup üyesi mi kontrol et
            Group group = groupService.getGroupById(groupId);
            if (!group.isMember(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu gruba erişim izniniz yok"));
            }
            
            groupMessageService.deleteMessage(messageId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Mesaj silindi"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
} 