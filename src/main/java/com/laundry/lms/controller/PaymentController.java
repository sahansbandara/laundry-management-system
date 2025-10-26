package com.laundry.lms.controller;

import com.laundry.lms.dto.PaymentRequest;
import com.laundry.lms.dto.PaymentResponse;
import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.PaymentRepository;
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
@RequestMapping("/api/payments")
@CrossOrigin("*")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final LaundryOrderRepository orderRepository;

    public PaymentController(PaymentRepository paymentRepository, LaundryOrderRepository orderRepository) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public List<PaymentResponse> getPayments() {
        return paymentRepository.findAll().stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> createPayment(@Valid @RequestBody PaymentRequest request) {
        Optional<LaundryOrder> orderOpt = orderRepository.findById(request.getOrderId());
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Order not found"));
        }

        Payment payment = new Payment();
        payment.setOrder(orderOpt.get());
        payment.setAmount(request.getAmount());
        payment.setMethod(request.getMethod());
        payment.setPaidAt(request.getPaidAt());

        if (request.getStatus() != null) {
            try {
                payment.setStatus(PaymentStatus.valueOf(request.getStatus()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(error("Invalid payment status"));
            }
        }

        Payment saved = paymentRepository.save(payment);
        return ResponseEntity.status(HttpStatus.CREATED).body(PaymentResponse.from(saved));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam("value") String value) {
        Optional<Payment> paymentOpt = paymentRepository.findById(id);
        if (paymentOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Payment not found"));
        }
        try {
            PaymentStatus status = PaymentStatus.valueOf(value);
            Payment payment = paymentOpt.get();
            payment.setStatus(status);
            Payment saved = paymentRepository.save(payment);
            return ResponseEntity.ok(PaymentResponse.from(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error("Invalid payment status"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePayment(@PathVariable Long id) {
        if (!paymentRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Payment not found"));
        }
        paymentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}
