package com.laundry.lms.controller;

import com.laundry.lms.dto.LoginRequest;
import com.laundry.lms.dto.RegisterRequest;
import com.laundry.lms.dto.UserResponse;
import com.laundry.lms.model.User;
import com.laundry.lms.model.UserRole;
import com.laundry.lms.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Email already registered");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);
        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(saved));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        return userRepository.findByEmail(request.getEmail())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPassword()))
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(UserResponse.from(user)))
                .orElseGet(() -> {
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Invalid email or password");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
                });
    }
}
