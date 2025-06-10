package com.example.chatapp.websocket;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.User;
import com.example.chatapp.service.ChatService;
import com.example.chatapp.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class TypingIndicatorController {

    @Autowired
    private WebSocketMessageDispatcher messageDispatcher;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ChatService chatService;
    
    /**
     * Kullanıcının yazıyor durumunu diğer sohbet katılımcılarına iletir
     */
    @MessageMapping("/chat.typing")
    public void processTypingIndicator(@Payload TypingIndicator typingIndicator, Principal principal) {
        try {
            // Kullanıcı kimliğini doğrula
            User user = userService.findByUsername(principal.getName());
            if (user == null) {
                System.err.println("Kullanıcı bulunamadı: " + principal.getName());
                return;
            }
            
            // Sohbet kontrolü
            Chat chat = chatService.getChatWithParticipants(typingIndicator.getChatId());
            if (chat == null) {
                System.err.println("Sohbet bulunamadı: " + typingIndicator.getChatId());
                return;
            }
            
            // Kullanıcının sohbetin katılımcısı olduğunu kontrol et
            boolean isParticipant = false;
            for (User participant : chat.getParticipants()) {
                if (participant.getId().equals(user.getId())) {
                    isParticipant = true;
                    break;
                }
            }
            
            if (!isParticipant) {
                System.err.println("Kullanıcı bu sohbetin katılımcısı değil: " + user.getUsername());
                return;
            }
            
            // Yazıyor bilgisini güncelle
            typingIndicator.setUserId(user.getId());
            typingIndicator.setUsername(user.getUsername());
            
            // Sohbetteki her kullanıcıya bildir (gönderen hariç)
            for (User participant : chat.getParticipants()) {
                if (!participant.getId().equals(user.getId())) {
                    messageDispatcher.sendTypingIndicator(participant.getUsername(), typingIndicator);
                }
            }
            
            System.out.println("Yazıyor bildirimi gönderildi - " + user.getUsername() + 
                    (typingIndicator.isTyping() ? " yazıyor" : " yazmayı bıraktı") + 
                    " - Sohbet: " + chat.getId());
        } catch (Exception e) {
            System.err.println("Yazıyor bildirimi işlenirken hata: " + e.getMessage());
            e.printStackTrace();
        }
    }
} 