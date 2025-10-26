package com.laundry.lms.config;

import com.laundry.lms.model.*;
import com.laundry.lms.repository.*;
import com.laundry.lms.service.CatalogService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner seedDatabase(UserRepository userRepository,
                                          LaundryOrderRepository orderRepository,
                                          TaskRepository taskRepository,
                                          PaymentRepository paymentRepository,
                                          MessageRepository messageRepository,
                                          PasswordEncoder passwordEncoder,
                                          CatalogService catalogService) {
        return args -> {
            if (userRepository.count() > 0) {
                return;
            }

            // Seed users
            User admin = new User("Admin", "admin@smartfold.lk",
                    passwordEncoder.encode("1234"), UserRole.ADMIN);
            userRepository.save(admin);

            List<User> customers = List.of(
                    new User("Nimali Jayasinghe", "nimali@smartfold.lk", passwordEncoder.encode("1234"), UserRole.USER),
                    new User("Ruwan Perera", "ruwan@smartfold.lk", passwordEncoder.encode("1234"), UserRole.USER),
                    new User("Kamal Fernando", "kamal@smartfold.lk", passwordEncoder.encode("1234"), UserRole.USER)
            );
            userRepository.saveAll(customers);

            Random random = new Random();
            List<String> services = catalogService.getServices();
            List<String> units = catalogService.getUnits();

            // Seed orders
            List<LaundryOrder> orders = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                User customer = customers.get(random.nextInt(customers.size()));
                LaundryOrder order = new LaundryOrder();
                order.setCustomer(customer);
                order.setServiceType(services.get(random.nextInt(services.size())));
                order.setQuantity(1.0 + random.nextInt(5));
                order.setUnit(units.get(random.nextInt(units.size())));
                order.setPrice(BigDecimal.valueOf(500 + random.nextInt(3000)));
                order.setPickupDate(LocalDate.now().minusDays(random.nextInt(5)));
                order.setDeliveryDate(LocalDate.now().plusDays(random.nextInt(5) + 1));
                order.setNotes("Auto-generated demo order");
                order.setStatus(OrderStatus.values()[random.nextInt(OrderStatus.values().length)]);
                orders.add(order);
            }
            orderRepository.saveAll(orders);

            // Seed tasks
            List<Task> tasks = new ArrayList<>();
            String[] team = {"Saman", "Ishara", "Dilani", "Pasan"};
            for (int i = 0; i < 12; i++) {
                Task task = new Task();
                task.setTitle("Task #" + (i + 1));
                task.setAssignedTo(team[random.nextInt(team.length)]);
                task.setDueDate(LocalDate.now().plusDays(random.nextInt(7)));
                task.setPrice(BigDecimal.valueOf(200 + random.nextInt(1500)));
                task.setNotes("Demo task generated for showcase");
                task.setStatus(TaskStatus.values()[random.nextInt(TaskStatus.values().length)]);
                tasks.add(task);
            }
            taskRepository.saveAll(tasks);

            // Seed payments linked to random orders
            List<Payment> payments = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                LaundryOrder order = orders.get(random.nextInt(orders.size()));
                Payment payment = new Payment();
                payment.setOrder(order);
                payment.setAmount(order.getPrice());
                payment.setMethod(random.nextBoolean() ? "Cash" : "Card");
                PaymentStatus status = PaymentStatus.values()[random.nextInt(PaymentStatus.values().length)];
                payment.setStatus(status);
                if (status == PaymentStatus.COMPLETED) {
                    payment.setPaidAt(LocalDateTime.now().minusDays(random.nextInt(3)));
                }
                payments.add(payment);
            }
            paymentRepository.saveAll(payments);

            // Seed messages between admin and customers
            List<Message> messages = new ArrayList<>();
            for (User customer : customers) {
                for (int i = 0; i < 5; i++) {
                    Message fromCustomer = new Message(customer, admin,
                            "Hello team, checking on order update #" + (i + 1));
                    messages.add(fromCustomer);
                    Message fromAdmin = new Message(admin, customer,
                            "Hi " + customer.getName().split(" ")[0] + ", your order is " +
                                    OrderStatus.values()[random.nextInt(OrderStatus.values().length)].name().replace('_', ' ').toLowerCase() + ".");
                    messages.add(fromAdmin);
                }
            }
            messageRepository.saveAll(messages);
        };
    }
}
