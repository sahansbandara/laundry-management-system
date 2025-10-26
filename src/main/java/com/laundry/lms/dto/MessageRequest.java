package com.laundry.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class MessageRequest {

    @NotNull(message = "Sender is required")
    private Long fromUserId;

    @NotNull(message = "Recipient is required")
    private Long toUserId;

    @NotBlank(message = "Message body is required")
    private String body;

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
}
