package com.laundry.lms.repository;

import com.laundry.lms.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("select m from Message m where (m.fromUser.id = :userA and m.toUser.id = :userB) " +
            "or (m.fromUser.id = :userB and m.toUser.id = :userA) order by m.timestamp asc")
    List<Message> findConversation(@Param("userA") Long userA, @Param("userB") Long userB);

    List<Message> findByFromUserIdOrToUserIdOrderByTimestampAsc(Long fromUserId, Long toUserId);
}
