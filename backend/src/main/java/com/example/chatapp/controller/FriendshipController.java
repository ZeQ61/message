package com.example.chatapp.controller;

import com.example.chatapp.dto.FriendListResponse;
import com.example.chatapp.dto.FriendRequest;
import com.example.chatapp.dto.FriendResponseRequest;
import com.example.chatapp.dto.FriendshipResponse;
import com.example.chatapp.model.User;
import com.example.chatapp.service.FriendshipService;
import com.example.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/friendship")
public class FriendshipController {

    @Autowired
    private FriendshipService friendshipService;

    @Autowired
    private UserService userService;

    // Arkadaşlık isteği gönderme
    @PostMapping("/request")
    public ResponseEntity<FriendshipResponse> sendFriendRequest(
            Authentication authentication,
            @Valid @RequestBody FriendRequest request) {
        User currentUser = userService.getCurrentUser(authentication);
        FriendshipResponse response = friendshipService.sendFriendRequest(currentUser, request.getReceiverId());
        return ResponseEntity.ok(response);
    }

    // Arkadaşlık isteğini kabul etme
    @PostMapping("/accept")
    public ResponseEntity<FriendshipResponse> acceptFriendRequest(
            Authentication authentication,
            @Valid @RequestBody FriendResponseRequest request) {
        User currentUser = userService.getCurrentUser(authentication);
        FriendshipResponse response = friendshipService.acceptFriendRequest(currentUser, request.getFriendshipId());
        return ResponseEntity.ok(response);
    }

    // Arkadaşlık isteğini reddetme
    @PostMapping("/reject")
    public ResponseEntity<FriendshipResponse> rejectFriendRequest(
            Authentication authentication,
            @Valid @RequestBody FriendResponseRequest request) {
        User currentUser = userService.getCurrentUser(authentication);
        FriendshipResponse response = friendshipService.rejectFriendRequest(currentUser, request.getFriendshipId());
        return ResponseEntity.ok(response);
    }

    // Arkadaşlık isteğini iptal etme
    @DeleteMapping("/cancel/{friendshipId}")
    public ResponseEntity<Void> cancelFriendRequest(
            Authentication authentication,
            @PathVariable Long friendshipId) {
        User currentUser = userService.getCurrentUser(authentication);
        friendshipService.cancelFriendRequest(currentUser, friendshipId);
        return ResponseEntity.ok().build();
    }

    // Arkadaşı silme
    @DeleteMapping("/remove/{friendshipId}")
    public ResponseEntity<Void> removeFriend(
            Authentication authentication,
            @PathVariable Long friendshipId) {
        User currentUser = userService.getCurrentUser(authentication);
        friendshipService.removeFriend(currentUser, friendshipId);
        return ResponseEntity.ok().build();
    }

    // Arkadaşlık listesini getirme
    @GetMapping("/list")
    public ResponseEntity<FriendListResponse> getFriendsList(Authentication authentication) {
        User currentUser = userService.getCurrentUser(authentication);
        FriendListResponse response = friendshipService.getFriendsList(currentUser);
        return ResponseEntity.ok(response);
    }
    
    // Kullanıcı arama
    @GetMapping("/search")
    public ResponseEntity<List<FriendshipResponse.UserSummary>> searchUsers(
            Authentication authentication,
            @RequestParam String query) {
        User currentUser = userService.getCurrentUser(authentication);
        List<FriendshipResponse.UserSummary> users = friendshipService.searchUsers(currentUser, query);
        return ResponseEntity.ok(users);
    }
} 