package com.example.chatapp.service;

import com.example.chatapp.model.Chat;
import com.example.chatapp.model.ChatMessage;
import com.example.chatapp.model.User;
import com.example.chatapp.repository.ChatMessageRepository;
import com.example.chatapp.repository.ChatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class ChatService {

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private EncryptionService encryptionService;

    /**
     * Kullanıcının tüm sohbetlerini getirir
     */
    public List<Chat> getUserChats(User user) {
        return chatRepository.findByParticipant(user);
    }

    /**
     * İki kullanıcı arasındaki özel sohbeti getirir, yoksa oluşturur
     */
    public Chat getOrCreatePrivateChat(User user1, User user2) {
        Optional<Chat> existingChat = chatRepository.findPrivateChatBetween(user1, user2);
        
        if (existingChat.isPresent()) {
            return existingChat.get();
        } else {
            Chat newChat = new Chat();
            newChat.getParticipants().add(user1);
            newChat.getParticipants().add(user2);
            return chatRepository.save(newChat);
        }
    }

    /**
     * Belirli bir sohbetteki tüm mesajları getirir ve şifrelerini çözer
     */
    public List<ChatMessage> getChatMessages(Chat chat) {
        List<ChatMessage> messages = chatMessageRepository.findByChatOrderByTimestampAsc(chat);
        
        // Mesajların şifrelerini çöz
        for (ChatMessage message : messages) {
            try {
                // Eğer mesaj şifreliyse şifresini çöz
                if (message.getContent() != null && message.getContent().startsWith("ENC:")) {
                    String encryptedContent = message.getContent().substring(4); // "ENC:" önekini kaldır
                    String decryptedContent = encryptionService.decrypt(encryptedContent);
                    message.setContent(decryptedContent);
                }
            } catch (Exception e) {
                // Şifre çözme hatası olursa orijinal içeriği koruyarak devam et
                System.err.println("Mesaj şifresi çözülemedi: " + e.getMessage());
                // Şifre çözülemeyen mesajları tanımlamak için işaretle
                message.setContent("[Şifrelenmiş içerik görüntülenemiyor]");
            }
        }
        
        return messages;
    }

    /**
     * Yeni bir mesaj gönderir ve içeriğini şifreler
     */
    @Transactional
    public ChatMessage sendMessage(User sender, Chat chat, String content) {
        // Önce katılımcıları zorla yükle ve dönüş değerini sakla
        Chat chatWithParticipants = getChatWithParticipants(chat.getId());
        
        // Kullanıcının bu sohbetin bir katılımcısı olduğundan emin ol - ID karşılaştırması kullan
        boolean isParticipant = false;
        for (User participant : chatWithParticipants.getParticipants()) {
            if (participant.getId().equals(sender.getId())) {
                isParticipant = true;
                break;
            }
        }
        
        if (!isParticipant) {
            throw new IllegalArgumentException("Kullanıcı bu sohbetin katılımcısı değil: " + sender.getUsername());
        }
        
        // Boş veya null içeriği kontrol et
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Mesaj içeriği boş olamaz");
        }
        
        // Mesaj içeriğini şifrele
        String encryptedContent = "ENC:" + encryptionService.encrypt(content);
        
        ChatMessage message = new ChatMessage(sender, chatWithParticipants, encryptedContent);
        return chatMessageRepository.save(message);
    }
    
    /**
     * Sohbet detaylarını getirir
     */
    public Chat getChatById(Long chatId) {
        return chatRepository.findById(chatId)
                .orElseThrow(() -> new IllegalArgumentException("Sohbet bulunamadı: " + chatId));
    }
    
    /**
     * Sohbet detaylarını ve katılımcılarını EAGER olarak yükler
     * Bu metot, LazyInitializationException hatalarını önlemek için kullanılır
     */
    @Transactional
    public Chat getChatWithParticipants(Long chatId) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new IllegalArgumentException("Sohbet bulunamadı: " + chatId));
        
        // Katılımcıları zorla yükle ve dönüş değerini sakla
        Set<User> participants = chat.getParticipants();
        participants.size(); // Bu satır koleksiyonu initialize eder
        
        return chat;
    }
    
    /**
     * Sohbetteki katılımcıları getirir
     */
    public Set<User> getChatParticipants(Chat chat) {
        return chat.getParticipants();
    }

    /**
     * Sohbeti ve ilgili tüm verileri siler
     */
    @Transactional
    public void deleteChat(Long chatId) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new IllegalArgumentException("Sohbet bulunamadı: " + chatId));
        
        // İlişkili mesajları sil
        chatMessageRepository.deleteByChatId(chatId);
        
        // Sohbeti sil (katılımcı ilişkileri de otomatik olarak silinecektir)
        chatRepository.delete(chat);
        
        System.out.println("Sohbet başarıyla silindi: " + chatId);
    }

    /**
     * Kullanıcıyı bir sohbete ekler
     */
    @Transactional
    public void addUserToChat(Chat chat, User user) {
        // Önce katılımcıları zorla yükle
        Chat chatWithParticipants = getChatWithParticipants(chat.getId());
        
        // Kullanıcı zaten sohbette mi kontrol et
        if (chatWithParticipants.getParticipants().contains(user)) {
            System.out.println("Kullanıcı zaten bu sohbetin katılımcısı: " + user.getUsername());
            return;
        }
        
        // Kullanıcıyı sohbete ekle
        chatWithParticipants.getParticipants().add(user);
        chatRepository.save(chatWithParticipants);
        
        System.out.println("Kullanıcı sohbete eklendi: " + user.getUsername() + " -> Chat ID: " + chat.getId());
    }
}
