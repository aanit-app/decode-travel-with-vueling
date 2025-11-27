// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./TurnaroundTypes.sol";
import "./TurnaroundTemplates.sol";

interface ITurnaroundBadge {
    function mintBadge(
        address to,
        address turnaroundContract,
        uint8 actorId
    ) external;
}

contract TurnaroundChecklist is AccessControl {
    using TurnaroundTemplates for Task[];

    bytes32 public constant OPS_ROLE = keccak256("OPS_ROLE");

    // Single turnaround data
    Turnaround public turnaround;
    Task[] private _tasks;

    // Actor -> wallet que firma en nombre de ese actor
    mapping(Actor => address) public actorWallets;

    ITurnaroundBadge public badgeContract;

    event TurnaroundCreated(
        string turnaroundId,
        string airport,
        uint256 scheduledArrival,
        uint256 scheduledDeparture,
        uint256 totalTasks
    );

    event TaskCompleted(
        uint256 indexed taskIndex,
        uint8 templateId,
        Actor actor,
        TaskStatus status,
        uint256 completedAt,
        address actorWallet
    );

    event TurnaroundCertified(
        bool onTime,
        uint256 onTimeTasks,
        uint256 lateTasks,
        uint256 durationSeconds,
        bytes32 certificateHash
    );

    event ActorWalletUpdated(Actor actor, address wallet);

    constructor(
        address opsAdmin,
        address groundHandling,
        address cleaning,
        address fuel,
        address catering,
        address flightCrew,
        address gate,
        string memory turnaroundId,
        string memory airport,
        uint256 scheduledArrival,
        uint256 scheduledDeparture
    ) {
        require(
            scheduledDeparture > scheduledArrival,
            "Departure must be after arrival"
        );

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPS_ROLE, opsAdmin);

        actorWallets[Actor.GroundHandling] = groundHandling;
        actorWallets[Actor.Cleaning] = cleaning;
        actorWallets[Actor.Fuel] = fuel;
        actorWallets[Actor.Catering] = catering;
        actorWallets[Actor.FlightCrew] = flightCrew;
        actorWallets[Actor.Gate] = gate;

        // Init single turnaround
        Turnaround storage t = turnaround;
        // t.id can be set if you still want an off-chain ID
        t.turnaroundId = turnaroundId;
        t.airport = airport;
        t.scheduledArrival = scheduledArrival;
        t.scheduledDeparture = scheduledDeparture;
        t.createdAt = block.timestamp;

        // Initialize standard 27 tasks for this turnaround
        _tasks.initStandardTasks(scheduledArrival);
        t.totalTasks = _tasks.length;

        emit TurnaroundCreated(
            turnaroundId,
            airport,
            scheduledArrival,
            scheduledDeparture,
            t.totalTasks
        );
    }

    // ---------- CONFIG ACTORES ----------

    function updateActorWallet(
        Actor actor,
        address wallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(wallet != address(0), "Zero address");
        actorWallets[actor] = wallet;
        emit ActorWalletUpdated(actor, wallet);
    }

    // ---------- VISTAS ----------

    function getTasks() external view returns (Task[] memory) {
        return _tasks;
    }

    function getTurnaroundKPIs()
        external
        view
        returns (
            uint256 totalTasks,
            uint256 onTimeTasks,
            uint256 lateTasks,
            bool slaBreached,
            uint256 durationSeconds
        )
    {
        Turnaround storage t = turnaround;

        totalTasks = t.totalTasks;
        onTimeTasks = t.onTimeTasks;
        lateTasks = t.lateTasks;
        slaBreached = t.slaBreached;

        if (
            t.firstTaskCompletedAt == 0 ||
            t.lastTaskCompletedAt == 0 ||
            t.lastTaskCompletedAt <= t.firstTaskCompletedAt
        ) {
            durationSeconds = 0;
        } else {
            durationSeconds = t.lastTaskCompletedAt - t.firstTaskCompletedAt;
        }
    }

    // ---------- LÓGICA TAREAS ----------

    modifier onlyActorOrOps(uint256 taskIndex) {
        Task storage task = _tasks[taskIndex];
        address actorWallet = actorWallets[task.actor];

        require(
            msg.sender == actorWallet || hasRole(OPS_ROLE, msg.sender),
            "Not authorized for this task"
        );
        _;
    }

    function markTaskCompleted(
        uint256 taskIndex
    ) external onlyActorOrOps(taskIndex) {
        Turnaround storage t = turnaround;
        require(!t.certified, "Turnaround already certified");

        Task storage task = _tasks[taskIndex];
        require(task.status == TaskStatus.Pending, "Task already completed");

        uint256 nowTs = block.timestamp;
        task.completedAt = nowTs;

        if (nowTs <= task.deadline) {
            // On time
            task.status = TaskStatus.CompletedOnTime;
            t.onTimeTasks += 1;

            task.justifiedDelay = false;
            task.delayReason = "";
        } else {
            // Late
            task.status = TaskStatus.CompletedLate;

            if (task.justifiedDelay) {
                // No cuenta contra KPIs
            } else {
                t.lateTasks += 1;
                t.slaBreached = true;
            }
        }

        // Update duration range
        if (t.firstTaskCompletedAt == 0 || nowTs < t.firstTaskCompletedAt) {
            t.firstTaskCompletedAt = nowTs;
        }
        if (nowTs > t.lastTaskCompletedAt) {
            t.lastTaskCompletedAt = nowTs;
        }

        emit TaskCompleted(
            taskIndex,
            task.templateId,
            task.actor,
            task.status,
            nowTs,
            actorWallets[task.actor]
        );
    }

    function finalizeTurnaround() external onlyRole(OPS_ROLE) {
        Turnaround storage t = turnaround;
        require(!t.certified, "Already certified");

        Task[] storage tasks = _tasks;
        uint256 len = tasks.length;
        require(len > 0, "No tasks");

        uint8[6] memory actorTaskCount;
        uint8[6] memory actorLateCount;

        for (uint256 i = 0; i < len; i++) {
            Task storage task = tasks[i];
            TaskStatus status = task.status;

            if (status == TaskStatus.Pending) {
                require(
                    !task.mandatory,
                    "All mandatory tasks must be completed"
                );
                continue;
            }

            require(
                status == TaskStatus.CompletedOnTime ||
                    status == TaskStatus.CompletedLate,
                "Invalid task status"
            );

            uint8 actorId = uint8(task.actor);
            actorTaskCount[actorId] += 1;

            if (status == TaskStatus.CompletedLate && !task.justifiedDelay) {
                actorLateCount[actorId] += 1;
            }
        }

        t.certified = true;

        uint256 durationSeconds;
        if (
            t.firstTaskCompletedAt == 0 ||
            t.lastTaskCompletedAt == 0 ||
            t.lastTaskCompletedAt <= t.firstTaskCompletedAt
        ) {
            durationSeconds = 0;
        } else {
            durationSeconds = t.lastTaskCompletedAt - t.firstTaskCompletedAt;
        }

        // Include address(this) as part of the cert hash so it is unique per contract
        t.certificateHash = keccak256(
            abi.encode(
                address(this),
                t.turnaroundId,
                t.airport,
                t.scheduledArrival,
                t.scheduledDeparture,
                t.onTimeTasks,
                t.lateTasks,
                t.slaBreached,
                durationSeconds,
                block.timestamp
            )
        );

        emit TurnaroundCertified(
            !t.slaBreached,
            t.onTimeTasks,
            t.lateTasks,
            durationSeconds,
            t.certificateHash
        );

        // Mint badges, using this contract address as identifier
        if (address(badgeContract) != address(0)) {
            for (uint8 a = 0; a < 6; a++) {
                if (actorTaskCount[a] > 0 && actorLateCount[a] == 0) {
                    address wallet = actorWallets[Actor(a)];
                    if (wallet != address(0)) {
                        badgeContract.mintBadge(wallet, address(this), a);
                    }
                }
            }
        }
    }

    function setTaskMandatory(
        uint256 taskIndex,
        bool mandatory
    ) external onlyRole(OPS_ROLE) {
        Task storage task = _tasks[taskIndex];
        task.mandatory = mandatory;
        emit TaskMandatoryUpdated(taskIndex, mandatory);
    }

    function justifyDelayedTask(
        uint256 taskIndex,
        string calldata reason
    ) external onlyActorOrOps(taskIndex) {
        Turnaround storage t = turnaround;
        require(!t.certified, "Turnaround already certified");

        Task storage task = _tasks[taskIndex];

        require(
            task.status == TaskStatus.Pending ||
                task.status == TaskStatus.CompletedLate,
            "Can only justify pending or late tasks"
        );

        require(!task.justifiedDelay, "Already justified");

        if (task.status == TaskStatus.CompletedLate) {
            if (t.lateTasks > 0) {
                t.lateTasks -= 1;
            }
            if (t.lateTasks == 0) {
                t.slaBreached = false;
            }
        }

        task.justifiedDelay = true;
        task.delayReason = reason;

        emit TaskDelayJustified(taskIndex, reason);
    }

    function setBadgeContract(
        address _badge
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        badgeContract = ITurnaroundBadge(_badge);
    }
}
