package com.example.chatapp.websocket;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

public class ChatWebSocketHandler extends TextWebSocketHandler {

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Mesaj alındığında yapılacak işlemler
        System.out.println("Yeni mesaj alındı: " + message.getPayload());

        // Mesajı geri gönder (echo)
        session.sendMessage(new TextMessage("Mesajınız alındı: " + message.getPayload()));
    }
}
