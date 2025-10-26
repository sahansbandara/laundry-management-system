package com.laundry.lms.dto;

import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentResponse {

    private Long id;
    private Long orderId;
    private String orderServiceType;
    private BigDecimal amount;
    private String method;
    private PaymentStatus status;
    private LocalDateTime paidAt;

    public static PaymentResponse from(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        if (payment.getOrder() != null) {
            response.setOrderId(payment.getOrder().getId());
            response.setOrderServiceType(payment.getOrder().getServiceType());
        }
        response.setAmount(payment.getAmount());
        response.setMethod(payment.getMethod());
        response.setStatus(payment.getStatus());
        response.setPaidAt(payment.getPaidAt());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderServiceType() {
        return orderServiceType;
    }

    public void setOrderServiceType(String orderServiceType) {
        this.orderServiceType = orderServiceType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }
}
