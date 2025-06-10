package com.example.chatapp.controller;

import com.example.chatapp.dto.GroupDTO;
import com.example.chatapp.model.Group;
import com.example.chatapp.model.GroupInvitation;
import com.example.chatapp.model.User;
import com.example.chatapp.service.GroupService;
import com.example.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;
    private final UserService userService;

    @Autowired
    public GroupController(GroupService groupService, UserService userService) {
        this.groupService = groupService;
        this.userService = userService;
    }

    // Grup oluşturma
    @PostMapping
    public ResponseEntity<?> createGroup(
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "groupImage", required = false) MultipartFile groupImage,
            @RequestParam(value = "memberIds", required = false) List<Long> memberIds,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            Group group = groupService.createGroup(name, description, groupImage, currentUser.getId(), memberIds);
            
            GroupDTO groupDTO = new GroupDTO(
                    group.getId(),
                    group.getName(),
                    group.getDescription(),
                    group.getImageUrl()
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(groupDTO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Kullanıcının gruplarını getir
    @GetMapping
    public ResponseEntity<?> getUserGroups(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            List<Group> groups = groupService.getGroupsByUser(currentUser.getId());
            
            List<GroupDTO> groupDTOs = groups.stream()
                    .map(group -> new GroupDTO(
                            group.getId(),
                            group.getName(),
                            group.getDescription(),
                            group.getImageUrl()
                    ))
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(groupDTOs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grup detaylarını getir
    @GetMapping("/{groupId}")
    public ResponseEntity<?> getGroupDetails(@PathVariable Long groupId, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            Group group = groupService.getGroupById(groupId);
            
            // Kullanıcı grup üyesi değilse erişimi reddet
            if (!group.isMember(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu gruba erişim izniniz yok"));
            }
            
            GroupDTO groupDTO = new GroupDTO(
                    group.getId(),
                    group.getName(),
                    group.getDescription(),
                    group.getImageUrl()
            );
            
            return ResponseEntity.ok(groupDTO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grup üyelerini getir
    @GetMapping("/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(@PathVariable Long groupId, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            Group group = groupService.getGroupById(groupId);
            
            // Kullanıcı grup üyesi değilse erişimi reddet
            if (!group.isMember(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu gruba erişim izniniz yok"));
            }
            
            List<User> members = groupService.getGroupMembers(groupId);
            return ResponseEntity.ok(members);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grup yöneticilerini getir
    @GetMapping("/{groupId}/admins")
    public ResponseEntity<?> getGroupAdmins(@PathVariable Long groupId, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            Group group = groupService.getGroupById(groupId);
            
            // Kullanıcı grup üyesi değilse erişimi reddet
            if (!group.isMember(currentUser)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu gruba erişim izniniz yok"));
            }
            
            List<User> admins = groupService.getGroupAdmins(groupId);
            return ResponseEntity.ok(admins);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Gruba üye ekle (yönetici tarafından)
    @PostMapping("/{groupId}/members/{userId}")
    public ResponseEntity<?> addMemberToGroup(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.addMemberToGroup(groupId, userId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Kullanıcı gruba eklendi"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Gruptan üye çıkar (yönetici tarafından)
    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<?> removeMemberFromGroup(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.removeMemberFromGroup(groupId, userId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Kullanıcı gruptan çıkarıldı"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Yönetici ekle
    @PostMapping("/{groupId}/admins/{userId}")
    public ResponseEntity<?> addAdminToGroup(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.addAdminToGroup(groupId, userId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Kullanıcı yönetici olarak eklendi"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Yönetici çıkar
    @DeleteMapping("/{groupId}/admins/{userId}")
    public ResponseEntity<?> removeAdminFromGroup(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.removeAdminFromGroup(groupId, userId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Kullanıcının yöneticilik rolü kaldırıldı"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grup bilgilerini güncelle
    @PutMapping("/{groupId}")
    public ResponseEntity<?> updateGroup(
            @PathVariable Long groupId,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "groupImage", required = false) MultipartFile groupImage,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            
            GroupDTO groupDTO = new GroupDTO();
            groupDTO.setName(name);
            groupDTO.setDescription(description);
            
            Group updatedGroup = groupService.updateGroup(groupId, groupDTO, groupImage, currentUser.getId());
            
            GroupDTO responseDTO = new GroupDTO(
                    updatedGroup.getId(),
                    updatedGroup.getName(),
                    updatedGroup.getDescription(),
                    updatedGroup.getImageUrl()
            );
            
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grubu sil
    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> deleteGroup(@PathVariable Long groupId, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.deleteGroup(groupId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Grup silindi"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Kullanıcıyı gruba davet et
    @PostMapping("/{groupId}/invite/{userId}")
    public ResponseEntity<?> inviteUserToGroup(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            GroupInvitation invitation = groupService.inviteUserToGroup(groupId, userId, currentUser.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Kullanıcı gruba davet edildi", "invitationId", invitation.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grup davetini kabul et
    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<?> acceptGroupInvitation(
            @PathVariable Long invitationId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.acceptGroupInvitation(invitationId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Grup daveti kabul edildi"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Grup davetini reddet
    @PostMapping("/invitations/{invitationId}/reject")
    public ResponseEntity<?> rejectGroupInvitation(
            @PathVariable Long invitationId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.rejectGroupInvitation(invitationId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Grup daveti reddedildi"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Gruptan ayrıl
    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<?> leaveGroup(@PathVariable Long groupId, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            groupService.leaveGroup(groupId, currentUser.getId());
            return ResponseEntity.ok(Map.of("message", "Gruptan ayrıldınız"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
    
    // Kullanıcının bekleyen davetlerini getir
    @GetMapping("/invitations")
    public ResponseEntity<?> getPendingInvitations(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User currentUser = userService.findByUsername(userDetails.getUsername());
            List<GroupInvitation> invitations = groupService.getPendingInvitationsForUser(currentUser.getId());
            return ResponseEntity.ok(invitations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
} 