package com.example.chatapp.dto;

public class LoginRequest {
    private String username;
    private String password;

    // Parametresiz Constructor
    public LoginRequest() {}

    // Parametreli Constructor
    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
