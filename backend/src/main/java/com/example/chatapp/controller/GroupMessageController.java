package com.example.chatapp.controller;

import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupMessage;
import com.example.chatapp.model.User;
import com.example.chatapp.service.GroupMessageService;
import com.example.chatapp.service.GroupService;
import com.example.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups/{groupId}/messages")
public class GroupMessageController {

    private final GroupMessageService groupMessageService;
    private final GroupService groupService;
    private final UserService userService;

    @Autowired
    public GroupMessageController(GroupMessageService groupMessageService,
                                 GroupService groupService,
                                 UserService userService) {
        this.groupMessageService = groupMessageService;
        this.groupService = groupService;
        this.userService = userService;
    }

    // Grup mesajlarını getir
    @GetMapping
    public ResponseEntity<?> getGroupMessages(
            @PathVariable Long groupId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            List<GroupMessage> messages = groupMessageService.getGroupMessages(groupId, currentUser.getId());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Sayfalı grup mesajlarını getir
    @GetMapping("/paged")
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
    @GetMapping("/after")
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
    @PostMapping
    public ResponseEntity<?> sendMessage(
            @PathVariable Long groupId,
            @RequestParam String content,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            GroupMessage message = groupMessageService.sendMessage(groupId, currentUser.getId(), content);
            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Medya mesajı gönder
    @PostMapping("/media")
    public ResponseEntity<?> sendMediaMessage(
            @PathVariable Long groupId,
            @RequestParam("media") MultipartFile media,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            GroupMessage message = groupMessageService.sendMediaMessage(groupId, currentUser.getId(), media);
            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Mesajı sil
    @DeleteMapping("/{messageId}")
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