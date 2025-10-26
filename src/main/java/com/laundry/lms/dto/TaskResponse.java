package com.laundry.lms.dto;

import com.laundry.lms.model.Task;
import com.laundry.lms.model.TaskStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TaskResponse {

    private Long id;
    private String title;
    private String assignedTo;
    private LocalDate dueDate;
    private BigDecimal price;
    private TaskStatus status;
    private String notes;

    public static TaskResponse from(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setAssignedTo(task.getAssignedTo());
        response.setDueDate(task.getDueDate());
        response.setPrice(task.getPrice());
        response.setStatus(task.getStatus());
        response.setNotes(task.getNotes());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
