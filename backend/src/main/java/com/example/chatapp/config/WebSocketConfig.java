package com.example.chatapp.config;

import com.example.chatapp.model.UserPrincipal;
import com.example.chatapp.service.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    @Qualifier("userDetailsServiceImpl")
    private UserDetailsService userDetailsService;

    @Autowired
    private WebSocketRateLimiter webSocketRateLimiter;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Kullanıcılara mesaj göndermek için kullanılacak ön ek
        config.enableSimpleBroker("/topic", "/queue", "/user");
        
        // Uygulamadan gelen mesajlar için ön ek
        config.setApplicationDestinationPrefixes("/app");
        
        // Belirli bir kullanıcıya mesaj göndermek için
        config.setUserDestinationPrefix("/user");
        
        logger.info("WebSocket mesaj brokeri yapılandırıldı:");
        logger.debug("- Broker ön ekleri: /topic, /queue, /user");
        logger.debug("- Uygulama hedef ön eki: /app");
        logger.debug("- Kullanıcı hedef ön eki: /user");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("*")
                .withSockJS();

        logger.info("WebSocket endpoint kaydedildi: /ws (SockJS ile) - Tüm originlere izin veriliyor");
    }


    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // WebSocket bağlantısı kurulurken token doğrulama
                    String token = extractToken(accessor);
                    logger.debug("WebSocket bağlantısı için token alındı: {}", (token != null ? "Token mevcut" : "Token bulunamadı"));
                    
                    try {
                        if (token != null) {
                            // Token'dan kullanıcı adını çıkar
                            String username = jwtService.extractUsername(token);
                            logger.debug("Token'dan kullanıcı adı çıkarıldı: {}", username);
                            
                            if (username != null) {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                
                                // Token geçerliliğini kontrol et
                                if (jwtService.isTokenValid(token, userDetails)) {
                                    // Standart authentication token oluştur
                                    UsernamePasswordAuthenticationToken authentication = 
                                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                    
                                    SecurityContextHolder.getContext().setAuthentication(authentication);
                                    
                                    // Principal'ı genişletilmiş bir sınıfla değiştir
                                    UserPrincipal customPrincipal = new UserPrincipal(username, userDetails);
                                    accessor.setUser(customPrincipal);
                                    
                                    logger.info("WebSocket bağlantısı için kullanıcı doğrulandı: {}", username);
                                } else {
                                    logger.warn("WebSocket bağlantısı için geçersiz token: Token süresi dolmuş veya geçersiz");
                                }
                            } else {
                                logger.warn("Token'dan kullanıcı adı çıkarılamadı");
                            }
                        } else {
                            logger.warn("WebSocket bağlantısı için token bulunamadı");
                        }
                    } catch (Exception e) {
                        logger.error("WebSocket token doğrulama sırasında hata: {}", e.getMessage());
                        logger.debug("Hata detayı:", e);
                    }
                }
                
                return message;
            }
            
            private String extractToken(StompHeaderAccessor accessor) {
                try {
                    // Önce Authorization başlığından token'i almayı dene
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        logger.debug("Token Authorization başlığından alındı");
                        return authHeader.substring(7);
                    }
                    
                    // Handshake başlıklarından token'i almayı dene
                    if (accessor.getSessionAttributes() != null) {
                        Object tokenObj = accessor.getSessionAttributes().get("token");
                        if (tokenObj != null) {
                            logger.debug("Token handshake başlıklarından alındı");
                            return tokenObj.toString();
                        }
                    }
                    
                    // NOT: Güvenlik nedeniyle URL parametrelerinden token çıkarma yöntemini kaldırdık
                    // URL üzerinden token göndermek güvenli değildir
                    
                    logger.debug("Token bulunamadı");
                    return null;
                } catch (Exception e) {
                    logger.error("Token çıkarılırken hata: {}", e.getMessage());
                    return null;
                }
            }
        });
        
        // Hız sınırlaması için interceptor
        registration.interceptors(webSocketRateLimiter);
    }
}
