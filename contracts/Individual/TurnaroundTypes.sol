// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

enum Actor {
    GroundHandling,
    Cleaning,
    Fuel,
    Catering,
    FlightCrew,
    Gate
}

enum TaskStatus {
    Pending,
    CompletedOnTime,
    CompletedLate
}

struct Task {
    uint8 templateId; // 0..26 según el checklist estándar
    Actor actor;
    uint256 deadline;
    uint256 completedAt;
    TaskStatus status;
    bool mandatory;
    bool justifiedDelay;
    string delayReason;
}
event TaskMandatoryUpdated(uint256 indexed taskIndex, bool mandatory);

event TaskDelayJustified(uint256 indexed taskIndex, string reason);

struct Turnaround {
    uint256 id;
    string turnaroundId;
    string airport;
    uint256 scheduledArrival;
    uint256 scheduledDeparture;
    uint256 createdAt;
    bool certified;
    bool slaBreached;
    uint256 totalTasks;
    uint256 onTimeTasks;
    uint256 lateTasks;
    uint256 firstTaskCompletedAt;
    uint256 lastTaskCompletedAt;
    bytes32 certificateHash;
}
