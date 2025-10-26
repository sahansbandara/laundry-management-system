package com.laundry.lms.repository;

import com.laundry.lms.model.LaundryOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LaundryOrderRepository extends JpaRepository<LaundryOrder, Long> {
    List<LaundryOrder> findByCustomerId(Long customerId);
}
