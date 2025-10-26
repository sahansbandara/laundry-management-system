package com.laundry.lms.controller;

import com.laundry.lms.dto.TaskRequest;
import com.laundry.lms.dto.TaskResponse;
import com.laundry.lms.model.Task;
import com.laundry.lms.model.TaskStatus;
import com.laundry.lms.repository.TaskRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin("*")
public class TaskController {

    private final TaskRepository taskRepository;

    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public List<TaskResponse> getTasks() {
        return taskRepository.findAll().stream()
                .map(TaskResponse::from)
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> createTask(@Valid @RequestBody TaskRequest request) {
        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setAssignedTo(request.getAssignedTo());
        task.setDueDate(request.getDueDate());
        task.setPrice(request.getPrice());
        task.setNotes(request.getNotes());

        if (request.getStatus() != null) {
            try {
                task.setStatus(TaskStatus.valueOf(request.getStatus()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(error("Invalid task status"));
            }
        }

        Task saved = taskRepository.save(task);
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskResponse.from(saved));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam("value") String value) {
        Optional<Task> taskOpt = taskRepository.findById(id);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Task not found"));
        }
        try {
            TaskStatus status = TaskStatus.valueOf(value);
            Task task = taskOpt.get();
            task.setStatus(status);
            Task saved = taskRepository.save(task);
            return ResponseEntity.ok(TaskResponse.from(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error("Invalid task status"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Task not found"));
        }
        taskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}
