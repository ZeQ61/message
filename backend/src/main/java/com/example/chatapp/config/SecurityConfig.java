package com.example.chatapp.config;

import com.example.chatapp.service.AdminDetailsServiceImpl;
import com.example.chatapp.service.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.Collections;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;

    @Autowired
    @Qualifier("userDetailsServiceImpl")
    private UserDetailsServiceImpl userDetailsService;
    
    @Autowired
    @Qualifier("adminDetailsServiceImpl")
    private AdminDetailsServiceImpl adminDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf().disable()
            .authorizeHttpRequests()
            // Public endpoints
            .requestMatchers("/user/login", "/user/register").permitAll()
            .requestMatchers("/admin/login", "/admin/register").permitAll()
            // WebSocket endpoint'leri için izin
            .requestMatchers("/ws/**").permitAll()
            .requestMatchers("/ws/info").permitAll()
            // Dosyalara erişim için daha kapsamlı izinler
            .requestMatchers("/user/images/**").permitAll()
            .requestMatchers("/uploads/**").permitAll()
            // Diğer dosya erişim yolları için izinler
            .requestMatchers("/resources/**", "/static/**", "/images/**").permitAll()
            // Profil resmi düzeltme endpoint'i
            .requestMatchers("/api/users/fix-profile-images").permitAll()
            // Kullanıcı arama endpoint'i
            .requestMatchers("/user/users/search").permitAll()
            // Other endpoints requires authentication
            .anyRequest().authenticated()
            .and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("https://frontend-gamma-six-67.vercel.app", "http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"));
        configuration.setExposedHeaders(Collections.singletonList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        source.registerCorsConfiguration("/ws/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public WebMvcConfigurer securityResourceConfigurer() {
        return new WebMvcConfigurer() {            
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // Yükleme dizinine doğrudan erişim
                registry.addResourceHandler("/uploads/**")
                        .addResourceLocations("file:uploads/");
                        
                // Kullanıcı resimlerine özel erişim
                registry.addResourceHandler("/user/images/**")
                        .addResourceLocations("file:uploads/images/");
                        
                System.out.println("Resource handlers configured for: /uploads/ and /user/images/");
            }
        };
    }
}
