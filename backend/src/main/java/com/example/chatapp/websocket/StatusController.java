package com.example.chatapp.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class StatusController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/status")
    public void processStatusUpdate(StatusMessage message) {
        // Tüm kullanıcılara durum değişikliğini bildir
        messagingTemplate.convertAndSend("/topic/status", message);
        
        System.out.println("Status update broadcasted: User " + message.getUsername() + 
                          " is now " + (message.isOnline() ? "online" : "offline"));
    }
    
    @MessageMapping("/friendship")
    public void processFriendshipUpdate(FriendshipMessage message) {
        // Tüm kullanıcılara arkadaşlık güncellemesini bildir
        messagingTemplate.convertAndSend("/topic/friendship", message);
        
        System.out.println("Friendship update broadcasted: " + message.getAction() + 
                          " between " + message.getRequesterUsername() + " and " + 
                          message.getReceiverUsername() + ", status: " + message.getStatus());
    }
} 