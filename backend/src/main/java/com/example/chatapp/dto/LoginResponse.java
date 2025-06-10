package com.example.chatapp.dto;

public class LoginResponse {
    private String token;
    private String username;
    private String error;

    public LoginResponse() {
    }

    public LoginResponse(String token, String username) {
        this.token = token;
        this.username = username;
        this.error = null;
    }

    public LoginResponse(String token, String username, String error) {
        this.token = token;
        this.username = username;
        this.error = error;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}