package com.example.chatapp.service;

import com.example.chatapp.dto.GroupDTO;
import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupInvitation;
import com.example.chatapp.model.GroupMessage;
import com.example.chatapp.model.MessageType;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.GroupInvitationRepository;
import com.example.chatapp.repository.GroupMessageRepository;
import com.example.chatapp.repository.GroupRepository;
import com.example.chatapp.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupInvitationRepository groupInvitationRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final MediaService mediaService;

    @Autowired
    public GroupService(GroupRepository groupRepository,
                        UserRepository userRepository,
                        GroupInvitationRepository groupInvitationRepository,
                        GroupMessageRepository groupMessageRepository,
                        MediaService mediaService) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.groupInvitationRepository = groupInvitationRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.mediaService = mediaService;
    }

    // Grup oluşturma
    @Transactional
    public Group createGroup(String name, String description, MultipartFile groupImage, Long creatorId, List<Long> initialMemberIds) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        // Grup resmi yükleme
        String imageUrl = null;
        if (groupImage != null && !groupImage.isEmpty()) {
            try {
                imageUrl = mediaService.uploadFile(groupImage);
            } catch (Exception e) {
                throw new RuntimeException("Grup resmi yüklenemedi: " + e.getMessage());
            }
        }

        Group group = new Group(name, description, imageUrl, creator);
        
        // Başlangıç üyelerini ekle (eğer varsa)
        if (initialMemberIds != null && !initialMemberIds.isEmpty()) {
            for (Long userId : initialMemberIds) {
                if (!userId.equals(creatorId)) { // Yaratıcı zaten eklenmiş
                    userRepository.findById(userId).ifPresent(group::addMember);
                }
            }
        }
        
        return groupRepository.save(group);
    }
    
    // Grupları getir
    public List<Group> getGroupsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        return groupRepository.findByMembersContaining(user);
    }
    
    // Grup yöneticisi olan grupları getir
    public List<Group> getGroupsByAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        return groupRepository.findByAdminsContaining(user);
    }
    
    // Grup detaylarını getir
    public Group getGroupById(Long groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
    }
    
    // Grup detaylarını üyeleri ile birlikte getir (Eager loading)
    @Transactional
    public Group getGroupByIdWithMembers(Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        // Hibernate proxy'yi initialize et
        group.getMembers().size();
        
        return group;
    }
    
    // Grup üyelerini getir
    public List<User> getGroupMembers(Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        return group.getMembers().stream().collect(Collectors.toList());
    }
    
    // Grup yöneticilerini getir
    public List<User> getGroupAdmins(Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        return group.getAdmins().stream().collect(Collectors.toList());
    }
    
    // Gruba üye ekle (yöneticiler tarafından)
    @Transactional
    public void addMemberToGroup(Long groupId, Long userId, Long adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yönetici bulunamadı"));
        
        if (!group.isAdmin(admin)) {
            throw new RuntimeException("Bu işlem için yönetici olmanız gerekiyor");
        }
        
        group.addMember(user);
        groupRepository.save(group);
    }
    
    // Gruptan üye çıkar (yöneticiler tarafından)
    @Transactional
    public void removeMemberFromGroup(Long groupId, Long userId, Long adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yönetici bulunamadı"));
        
        // Yönetici kontrolü
        if (!group.isAdmin(admin)) {
            throw new RuntimeException("Bu işlem için yönetici olmanız gerekiyor");
        }
        
        // Grup yaratıcısı çıkarılamaz
        if (user.equals(group.getCreator())) {
            throw new RuntimeException("Grup yaratıcısı gruptan çıkarılamaz");
        }
        
        group.removeMember(user);
        groupRepository.save(group);
    }
    
    // Grubu sil (sadece grup yaratıcısı tarafından)
    @Transactional
    public void deleteGroup(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Sadece grup yaratıcısı grubu silebilir
        if (!group.getCreator().equals(user)) {
            throw new RuntimeException("Sadece grup yaratıcısı grubu silebilir");
        }
        
        // İlişkili tüm grup davetlerini sil
        groupInvitationRepository.deleteAllByGroupId(groupId);
        
        // İlişkili tüm grup mesajlarını sil
        groupMessageRepository.deleteAllByGroupId(groupId);
        
        // Grubu sil
        groupRepository.delete(group);
    }
    
    // Yönetici ekle
    @Transactional
    public void addAdminToGroup(Long groupId, Long userId, Long adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yönetici bulunamadı"));
        
        // Yönetici kontrolü
        if (!group.isAdmin(admin)) {
            throw new RuntimeException("Bu işlem için yönetici olmanız gerekiyor");
        }
        
        // Kullanıcı grup üyesi olmalı
        if (!group.isMember(user)) {
            throw new RuntimeException("Kullanıcı önce gruba eklenmelidir");
        }
        
        group.addAdmin(user);
        groupRepository.save(group);
    }
    
    // Yönetici çıkar
    @Transactional
    public void removeAdminFromGroup(Long groupId, Long userId, Long adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yönetici bulunamadı"));
        
        // Sadece yaratıcı diğer yöneticileri çıkarabilir
        if (!group.getCreator().equals(admin)) {
            throw new RuntimeException("Sadece grup yaratıcısı yöneticilik rolünü kaldırabilir");
        }
        
        // Yaratıcı yöneticilikten çıkarılamaz
        if (user.equals(group.getCreator())) {
            throw new RuntimeException("Grup yaratıcısı yöneticilikten çıkarılamaz");
        }
        
        group.removeAdmin(user);
        groupRepository.save(group);
    }
    
    // Grup bilgilerini güncelle
    @Transactional
    public Group updateGroup(Long groupId, GroupDTO groupDTO, MultipartFile groupImage, Long adminId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yönetici bulunamadı"));
        
        // Yönetici kontrolü
        if (!group.isAdmin(admin)) {
            throw new RuntimeException("Bu işlem için yönetici olmanız gerekiyor");
        }
        
        // Grup bilgilerini güncelle
        if (groupDTO.getName() != null && !groupDTO.getName().isEmpty()) {
            group.setName(groupDTO.getName());
        }
        
        if (groupDTO.getDescription() != null) {
            group.setDescription(groupDTO.getDescription());
        }
        
        // Grup resmi güncelleme
        if (groupImage != null && !groupImage.isEmpty()) {
            try {
                String imageUrl = mediaService.uploadFile(groupImage);
                group.setImageUrl(imageUrl);
            } catch (Exception e) {
                throw new RuntimeException("Grup resmi yüklenemedi: " + e.getMessage());
            }
        }
        
        return groupRepository.save(group);
    }
    
    // Kullanıcıyı gruba davet et
    @Transactional
    public GroupInvitation inviteUserToGroup(Long groupId, Long invitedUserId, Long inviterId) {
        System.out.println("=== INVITE METHOD CALLED ===");
        System.out.println("Group ID: " + groupId);
        System.out.println("Invited User ID: " + invitedUserId);
        System.out.println("Inviter ID: " + inviterId);
        
        try {
            Group group = groupRepository.findById(groupId)
                    .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
            System.out.println("Group found: " + group.getName());
            
            User invitedUser = userRepository.findById(invitedUserId)
                    .orElseThrow(() -> new RuntimeException("Davet edilecek kullanıcı bulunamadı"));
            System.out.println("Invited user found: " + invitedUser.getUsername());
            
            User inviter = userRepository.findById(inviterId)
                    .orElseThrow(() -> new RuntimeException("Davet eden kullanıcı bulunamadı"));
            System.out.println("Inviter found: " + inviter.getUsername());
            
            // Davet eden kişi grup üyesi olmalı
            System.out.println("Checking if inviter is group member...");
            if (!group.isMember(inviter)) {
                System.out.println("Inviter is NOT a group member!");
                throw new RuntimeException("Sadece grup üyeleri kullanıcıları davet edebilir");
            }
            System.out.println("Inviter is a group member");
            
            // Kullanıcı zaten grupta mı kontrol et
            System.out.println("Checking if invited user is already a member...");
            if (group.isMember(invitedUser)) {
                System.out.println("Invited user is already a member!");
                throw new RuntimeException("Kullanıcı zaten grubun üyesi");
            }
            System.out.println("Invited user is not a member yet");
            
            // Kullanıcı zaten davet edilmiş mi kontrol et
            System.out.println("Checking for existing invitations...");
            Optional<GroupInvitation> existingInvitation = groupInvitationRepository
                    .findByGroupAndInvitedUserAndStatus(group, invitedUser, GroupInvitation.InvitationStatus.PENDING);
            
            if (existingInvitation.isPresent()) {
                System.out.println("Existing invitation found!");
                throw new RuntimeException("Bu kullanıcıya zaten davet gönderilmiş");
            }
            System.out.println("No existing invitation found");
            
            // Yeni davet oluştur
            System.out.println("Creating new invitation...");
            GroupInvitation invitation = new GroupInvitation(group, invitedUser, inviter);
            
            // Davet mesajı oluştur
            System.out.println("Creating invite message...");
            String content = inviter.getUsername() + ", " + invitedUser.getUsername() + " kullanıcısını gruba davet etti";
            GroupMessage inviteMessage = new GroupMessage(inviter, group, content, MessageType.GROUP_INVITE);
            groupMessageRepository.save(inviteMessage);
            System.out.println("Invite message saved");
            
            GroupInvitation savedInvitation = groupInvitationRepository.save(invitation);
            System.out.println("Invitation saved successfully with ID: " + savedInvitation.getId());
            return savedInvitation;
        } catch (Exception e) {
            System.err.println("ERROR in inviteUserToGroup: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    // Grup davetini kabul et
    @Transactional
    public void acceptGroupInvitation(Long invitationId, Long userId) {
        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Davet bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı kontrolü
        if (!invitation.getInvitedUser().equals(user)) {
            throw new RuntimeException("Bu daveti sadece davet edilen kullanıcı kabul edebilir");
        }
        
        // Davet durumunu güncelle
        invitation.setStatus(GroupInvitation.InvitationStatus.ACCEPTED);
        groupInvitationRepository.save(invitation);
        
        // Kullanıcıyı gruba ekle
        Group group = invitation.getGroup();
        group.addMember(user);
        groupRepository.save(group);
        
        // Katılma mesajı oluştur
        String content = user.getUsername() + " gruba katıldı";
        GroupMessage joinMessage = new GroupMessage(user, group, content, MessageType.GROUP_JOIN);
        groupMessageRepository.save(joinMessage);
    }
    
    // Grup davetini reddet
    @Transactional
    public void rejectGroupInvitation(Long invitationId, Long userId) {
        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Davet bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Kullanıcı kontrolü
        if (!invitation.getInvitedUser().equals(user)) {
            throw new RuntimeException("Bu daveti sadece davet edilen kullanıcı reddedebilir");
        }
        
        // Davet durumunu güncelle
        invitation.setStatus(GroupInvitation.InvitationStatus.REJECTED);
        groupInvitationRepository.save(invitation);
    }
    
    // Gruptan ayrıl (kullanıcının kendisi için)
    @Transactional
    public void leaveGroup(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Grup yaratıcısı gruptan ayrılamaz
        if (user.equals(group.getCreator())) {
            throw new RuntimeException("Grup yaratıcısı gruptan ayrılamaz. Grup silinmeli");
        }
        
        // Kullanıcıyı gruptan çıkar
        group.removeMember(user);
        groupRepository.save(group);
        
        // Ayrılma mesajı oluştur
        String content = user.getUsername() + " gruptan ayrıldı";
        GroupMessage leaveMessage = new GroupMessage(user, group, content, MessageType.GROUP_LEAVE);
        groupMessageRepository.save(leaveMessage);
    }
    
    // Kullanıcının bekleyen grup davetlerini getir
    public List<GroupInvitation> getPendingInvitationsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        return groupInvitationRepository.findByInvitedUserAndStatus(user, GroupInvitation.InvitationStatus.PENDING);
    }
} 