package com.example.chatapp.config;

import com.example.chatapp.service.AdminDetailsServiceImpl;
import com.example.chatapp.service.JwtService;
import com.example.chatapp.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final AdminDetailsServiceImpl adminDetailsService;
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    public JwtAuthenticationFilter(JwtService jwtService,
                                   @Qualifier("userDetailsServiceImpl") UserDetailsServiceImpl userDetailsService,
                                   @Qualifier("adminDetailsServiceImpl") AdminDetailsServiceImpl adminDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.adminDetailsService = adminDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Bazı URL'ler için filtreyi atlayalım
        final String requestPath = request.getServletPath();
        if (requestPath.equals("/user/login") || 
            requestPath.equals("/user/register") || 
            requestPath.startsWith("/admin/") ||
            requestPath.startsWith("/ws-chat/")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        username = jwtService.extractUsername(jwt);

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails;

                try {
                    userDetails = userDetailsService.loadUserByUsername(username);
                } catch (Exception ex) {
                    userDetails = adminDetailsService.loadUserByUsername(username);
                }

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    logger.warn("Geçersiz veya süresi dolmuş token: {}", username);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("Invalid or expired token");
                    return;
                }
            } catch (Exception e) {
                logger.error("JWT doğrulama hatası: {}", e.getMessage());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Authentication failed");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
