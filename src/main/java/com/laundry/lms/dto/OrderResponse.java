package com.laundry.lms.dto;

import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public class OrderResponse {

    private Long id;
    private Long customerId;
    private String customerName;
    private String serviceType;
    private Double quantity;
    private String unit;
    private BigDecimal price;
    private OrderStatus status;
    private LocalDate pickupDate;
    private LocalDate deliveryDate;
    private String notes;

    public static OrderResponse from(LaundryOrder order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setCustomerId(order.getCustomer().getId());
        response.setCustomerName(order.getCustomer().getName());
        response.setServiceType(order.getServiceType());
        response.setQuantity(order.getQuantity());
        response.setUnit(order.getUnit());
        response.setPrice(order.getPrice());
        response.setStatus(order.getStatus());
        response.setPickupDate(order.getPickupDate());
        response.setDeliveryDate(order.getDeliveryDate());
        response.setNotes(order.getNotes());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getServiceType() {
        return serviceType;
    }

    public void setServiceType(String serviceType) {
        this.serviceType = serviceType;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public LocalDate getPickupDate() {
        return pickupDate;
    }

    public void setPickupDate(LocalDate pickupDate) {
        this.pickupDate = pickupDate;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
