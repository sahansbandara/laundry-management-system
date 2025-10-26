package com.laundry.lms.repository;

import com.laundry.lms.model.Task;
import com.laundry.lms.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByStatus(TaskStatus status);
}
