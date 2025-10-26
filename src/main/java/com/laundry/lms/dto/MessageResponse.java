package com.laundry.lms.dto;

import com.laundry.lms.model.Message;

import java.time.LocalDateTime;

public class MessageResponse {

    private Long id;
    private Long fromUserId;
    private Long toUserId;
    private String body;
    private LocalDateTime timestamp;

    public static MessageResponse from(Message message) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setFromUserId(message.getFromUser().getId());
        response.setToUserId(message.getToUser().getId());
        response.setBody(message.getBody());
        response.setTimestamp(message.getTimestamp());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getFromUserId() {
        return fromUserId;
    }

    public void setFromUserId(Long fromUserId) {
        this.fromUserId = fromUserId;
    }

    public Long getToUserId() {
        return toUserId;
    }

    public void setToUserId(Long toUserId) {
        this.toUserId = toUserId;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
