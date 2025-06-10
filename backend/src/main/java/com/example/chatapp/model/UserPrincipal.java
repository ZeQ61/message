package com.example.chatapp.model;

import org.springframework.security.core.userdetails.UserDetails;

import java.security.Principal;

public class UserPrincipal implements Principal {
    private final String name;
    private final UserDetails userDetails;
    
    public UserPrincipal(String name, UserDetails userDetails) {
        this.name = name;
        this.userDetails = userDetails;
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    public UserDetails getUserDetails() {
        return userDetails;
    }
} 