package com.example.chatapp.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

public class UserHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        // Header'dan username al
        String username = request.getHeaders().getFirst("username");

        if (username != null) {
            // Principal objesi oluştur ve dön
            return () -> username;
        }
        return null;
    }
}
