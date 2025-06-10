package com.example.chatapp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StatusUpdateRequest {
    // Jackson deserilizasyon için JsonProperty kullan
    @JsonProperty("isOnline")
    private boolean isOnline;

    // Boş constructor
    public StatusUpdateRequest() {
    }

    // Parametreli constructor
    public StatusUpdateRequest(boolean isOnline) {
        this.isOnline = isOnline;
    }

    // Getter ve setter
    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        this.isOnline = online;
    }

    @Override
    public String toString() {
        return "StatusUpdateRequest{" +
                "isOnline=" + isOnline +
                '}';
    }
} 