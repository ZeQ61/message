package com.example.chatapp.service;

import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupMessage;
import com.example.chatapp.model.MessageType;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.GroupMessageRepository;
import com.example.chatapp.repository.GroupRepository;
import com.example.chatapp.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class GroupMessageService {

    private static final Logger logger = LoggerFactory.getLogger(GroupMessageService.class);

    private final GroupMessageRepository groupMessageRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final MediaService mediaService;

    @Autowired
    public GroupMessageService(GroupMessageRepository groupMessageRepository,
                               GroupRepository groupRepository,
                               UserRepository userRepository,
                               MediaService mediaService) {
        this.groupMessageRepository = groupMessageRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.mediaService = mediaService;
    }

    // Grup mesajı gönderme
    @Transactional
    public GroupMessage sendMessage(Long groupId, Long senderId, String content) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı grup üyesi mi kontrol et
        if (!group.isMember(sender)) {
            throw new RuntimeException("Sadece grup üyeleri mesaj gönderebilir");
        }
        
        GroupMessage message = new GroupMessage(sender, group, content);
        return groupMessageRepository.save(message);
    }
    
    // Medya içerikli grup mesajı gönderme
    @Transactional
    public GroupMessage sendMediaMessage(Long groupId, Long senderId, MultipartFile media) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı grup üyesi mi kontrol et
        if (!group.isMember(sender)) {
            throw new RuntimeException("Sadece grup üyeleri mesaj gönderebilir");
        }
        
        try {
            // Medyayı yükle
            Map<String, String> uploadResult = mediaService.uploadMedia(media, sender);
            String mediaUrl = uploadResult.get("url");
            String mediaType = uploadResult.get("resourceType");
            
            // Medya türüne göre içerik oluştur
            String content = String.format("{\"type\":\"%s\",\"url\":\"%s\"}", mediaType, mediaUrl);
            
            GroupMessage message = new GroupMessage(sender, group, content);
            return groupMessageRepository.save(message);
        } catch (Exception e) {
            throw new RuntimeException("Medya yüklenemedi: " + e.getMessage());
        }
    }
    
    // Grup mesajlarını getir
    public List<GroupMessage> getGroupMessages(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı grup üyesi mi kontrol et
        if (!group.isMember(user)) {
            throw new RuntimeException("Sadece grup üyeleri mesajları görüntüleyebilir");
        }
        
        return groupMessageRepository.findByGroupAndIsDeletedFalseOrderByTimestampAsc(group);
    }
    
    // Sayfalı grup mesajlarını getir
    public Page<GroupMessage> getGroupMessagesWithPagination(Long groupId, Long userId, int page, int size) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı grup üyesi mi kontrol et
        if (!group.isMember(user)) {
            throw new RuntimeException("Sadece grup üyeleri mesajları görüntüleyebilir");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        return groupMessageRepository.findByGroupAndIsDeletedFalseOrderByTimestampDesc(group, pageable);
    }
    
    // Belirli bir tarihten sonraki mesajları getir
    public List<GroupMessage> getGroupMessagesAfterTimestamp(Long groupId, Long userId, LocalDateTime timestamp) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı grup üyesi mi kontrol et
        if (!group.isMember(user)) {
            throw new RuntimeException("Sadece grup üyeleri mesajları görüntüleyebilir");
        }
        
        return groupMessageRepository.findByGroupAndTimestampAfterAndIsDeletedFalseOrderByTimestampAsc(group, timestamp);
    }
    
    // Mesajı sil (işaretle)
    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        GroupMessage message = groupMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Mesaj bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Sadece mesajı gönderen veya grup yöneticisi mesajı silebilir
        if (!message.getSender().equals(user) && !message.getGroup().isAdmin(user)) {
            throw new RuntimeException("Bu mesajı silme yetkiniz yok");
        }
        
        groupMessageRepository.markMessageAsDeleted(messageId);
    }

    // Yeni mesaj türü desteği için saveGroupMessage metodu ekle
    @Transactional
    public GroupMessage saveGroupMessage(Long groupId, Long senderId, String content, MessageType type) {
        try {
            // Grup ve gönderen kontrolü
            Group group = groupRepository.findById(groupId)
                    .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
            
            User sender = userRepository.findById(senderId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
            
            // Kullanıcının grupta olduğunu kontrol et
            if (!group.isMember(sender)) {
                throw new RuntimeException("Kullanıcı bu grubun üyesi değil");
            }
            
            // Yeni mesaj oluştur
            GroupMessage message = new GroupMessage(sender, group, content, type);
            
            // Mesajı kaydet
            return groupMessageRepository.save(message);
        } catch (Exception e) {
            logger.error("Grup mesajı kaydedilirken hata: {}", e.getMessage());
            throw new RuntimeException("Grup mesajı kaydedilemedi: " + e.getMessage());
        }
    }
} 