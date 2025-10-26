package com.laundry.lms.controller;

import com.laundry.lms.dto.UserResponse;
import com.laundry.lms.model.User;
import com.laundry.lms.model.UserRole;
import com.laundry.lms.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin("*")
public class AdminUserController {

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestParam("value") String value) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("User not found"));
        }
        try {
            UserRole role = UserRole.valueOf(value);
            User user = userOpt.get();
            user.setRole(role);
            User saved = userRepository.save(user);
            return ResponseEntity.ok(UserResponse.from(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error("Invalid role"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("User not found"));
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}
