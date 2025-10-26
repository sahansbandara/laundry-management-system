package com.laundry.lms.controller;

import com.laundry.lms.dto.MessageRequest;
import com.laundry.lms.dto.MessageResponse;
import com.laundry.lms.model.Message;
import com.laundry.lms.model.User;
import com.laundry.lms.repository.MessageRepository;
import com.laundry.lms.repository.UserRepository;
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
@RequestMapping("/api/messages")
@CrossOrigin("*")
public class MessageController {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageController(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getMessages(@RequestParam("withUserId") Long withUserId,
                                         @RequestParam(value = "currentUserId", required = false) Long currentUserId) {
        Optional<User> withUser = userRepository.findById(withUserId);
        if (withUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("User not found"));
        }

        List<Message> messages;
        if (currentUserId != null) {
            Optional<User> current = userRepository.findById(currentUserId);
            if (current.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("User not found"));
            }
            messages = messageRepository.findConversation(currentUserId, withUserId);
        } else {
            messages = messageRepository.findByFromUserIdOrToUserIdOrderByTimestampAsc(withUserId, withUserId);
        }

        List<MessageResponse> response = messages.stream()
                .map(MessageResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(@Valid @RequestBody MessageRequest request) {
        Optional<User> fromUser = userRepository.findById(request.getFromUserId());
        Optional<User> toUser = userRepository.findById(request.getToUserId());

        if (fromUser.isEmpty() || toUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("User not found"));
        }

        Message message = new Message(fromUser.get(), toUser.get(), request.getBody());
        Message saved = messageRepository.save(message);
        return ResponseEntity.status(HttpStatus.CREATED).body(MessageResponse.from(saved));
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}
