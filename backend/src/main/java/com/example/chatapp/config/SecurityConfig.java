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
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

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
            .cors().and()
            .csrf().disable()
            .authorizeHttpRequests()
            // Public endpoints
            .requestMatchers("/user/login", "/user/register").permitAll()
            .requestMatchers("/admin/login", "/admin/register").permitAll()
            // WebSocket endpoint'leri için izin
            .requestMatchers("/ws/**").permitAll()
            // Dosyalara erişim için daha kapsamlı izinler
            .requestMatchers("/user/images/**").permitAll()
            .requestMatchers("/uploads/**").permitAll()
            // Diğer dosya erişim yolları için izinler
            .requestMatchers("/resources/**", "/static/**", "/images/**").permitAll()
            // Other endpoints requires authentication
            .anyRequest().authenticated()
            .and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
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
