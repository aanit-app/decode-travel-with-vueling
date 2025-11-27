// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./TurnaroundTypes.sol";
import "./TurnaroundTemplates.sol";

interface ITurnaroundBadge {
    function mintBadge(
        address to,
        uint256 turnaroundId,
        uint8 actorId
    ) external;
}

contract TurnaroundChecklist is AccessControl {
    using TurnaroundTemplates for Task[];

    bytes32 public constant OPS_ROLE = keccak256("OPS_ROLE");

    uint256 public nextTurnaroundId;
    mapping(uint256 => Turnaround) public turnarounds;
    mapping(uint256 => Task[]) private _tasksByTurnaround;

    // Actor -> wallet que firma en nombre de ese actor
    mapping(Actor => address) public actorWallets;

    event TurnaroundCreated(
        uint256 indexed id,
        string flightNumber,
        string airport,
        uint256 scheduledArrival,
        uint256 scheduledDeparture,
        uint256 totalTasks
    );

    event TaskCompleted(
        uint256 indexed turnaroundId,
        uint256 indexed taskIndex,
        uint8 templateId,
        Actor actor,
        TaskStatus status,
        uint256 completedAt,
        address actorWallet
    );

    event TurnaroundCertified(
        uint256 indexed turnaroundId,
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
        address gate
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPS_ROLE, opsAdmin);

        actorWallets[Actor.GroundHandling] = groundHandling;
        actorWallets[Actor.Cleaning] = cleaning;
        actorWallets[Actor.Fuel] = fuel;
        actorWallets[Actor.Catering] = catering;
        actorWallets[Actor.FlightCrew] = flightCrew;
        actorWallets[Actor.Gate] = gate;
    }

    // ---------- CONFIGURACIÓN DE ACTORES ----------

    function updateActorWallet(
        Actor actor,
        address wallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(wallet != address(0), "Zero address");
        actorWallets[actor] = wallet;
        emit ActorWalletUpdated(actor, wallet);
    }

    // ---------- CREACIÓN DE TURNAROUND ----------

    /// @notice Crea un turnaround usando la plantilla estándar de 27 checkpoints
    function createStandardTurnaround(
        string calldata flightNumber,
        string calldata airport,
        uint256 scheduledArrival,
        uint256 scheduledDeparture
    ) external onlyRole(OPS_ROLE) returns (uint256) {
        require(
            scheduledDeparture > scheduledArrival,
            "Departure must be after arrival"
        );

        uint256 id = nextTurnaroundId++;

        Turnaround storage t = turnarounds[id];
        t.id = id;
        t.flightNumber = flightNumber;
        t.airport = airport;
        t.scheduledArrival = scheduledArrival;
        t.scheduledDeparture = scheduledDeparture;
        t.createdAt = block.timestamp;

        Task[] storage tasks = _tasksByTurnaround[id];
        tasks.initStandardTasks(scheduledArrival);
        t.totalTasks = tasks.length;

        emit TurnaroundCreated(
            id,
            flightNumber,
            airport,
            scheduledArrival,
            scheduledDeparture,
            t.totalTasks
        );

        return id;
    }

    /// @notice Devuelve todas las tareas de un turnaround
    function getTasks(
        uint256 turnaroundId
    ) external view returns (Task[] memory) {
        return _tasksByTurnaround[turnaroundId];
    }

    /// @notice Devuelve KPIs básicos del turnaround
    function getTurnaroundKPIs(
        uint256 turnaroundId
    )
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
        Turnaround storage t = turnarounds[turnaroundId];

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

    // ---------- LÓGICA DE TAREAS ----------

    modifier onlyActorOrOps(uint256 turnaroundId, uint256 taskIndex) {
        Task storage task = _tasksByTurnaround[turnaroundId][taskIndex];
        address actorWallet = actorWallets[task.actor];

        require(
            msg.sender == actorWallet || hasRole(OPS_ROLE, msg.sender),
            "Not authorized for this task"
        );
        _;
    }

    function markTaskCompleted(
        uint256 turnaroundId,
        uint256 taskIndex
    ) external onlyActorOrOps(turnaroundId, taskIndex) {
        Turnaround storage t = turnarounds[turnaroundId];
        require(!t.certified, "Turnaround already certified");

        Task storage task = _tasksByTurnaround[turnaroundId][taskIndex];
        require(task.status == TaskStatus.Pending, "Task already completed");

        uint256 nowTs = block.timestamp;
        task.completedAt = nowTs;

        if (nowTs <= task.deadline) {
            // Completada en tiempo
            task.status = TaskStatus.CompletedOnTime;
            t.onTimeTasks += 1;

            // No hubo retraso real: limpiamos una posible justificación previa
            task.justifiedDelay = false;
            task.delayReason = "";
        } else {
            // Completada tarde
            task.status = TaskStatus.CompletedLate;

            if (task.justifiedDelay) {
                // Retraso ya marcado como justificado (pre-justificación):
                // no cuenta para lateTasks ni SLA
            } else {
                // Retraso no justificado
                t.lateTasks += 1;
                t.slaBreached = true;
            }
        }

        // Actualizamos primer/último timestamp para duración
        if (t.firstTaskCompletedAt == 0 || nowTs < t.firstTaskCompletedAt) {
            t.firstTaskCompletedAt = nowTs;
        }
        if (nowTs > t.lastTaskCompletedAt) {
            t.lastTaskCompletedAt = nowTs;
        }

        emit TaskCompleted(
            turnaroundId,
            taskIndex,
            task.templateId,
            task.actor,
            task.status,
            nowTs,
            actorWallets[task.actor]
        );
    }

    /// @notice Cierra el turnaround, verifica que todas las tareas estén completadas y genera certificado
    function finalizeTurnaround(
        uint256 turnaroundId
    ) external onlyRole(OPS_ROLE) {
        Turnaround storage t = turnarounds[turnaroundId];
        require(!t.certified, "Already certified");

        Task[] storage tasks = _tasksByTurnaround[turnaroundId];
        uint256 len = tasks.length;
        require(len > 0, "No tasks");

        // Contadores por actor (0..5)
        uint8[6] memory actorTaskCount;
        uint8[6] memory actorLateCount;

        for (uint256 i = 0; i < len; i++) {
            Task storage task = tasks[i];
            TaskStatus status = task.status;

            // Si la tarea es obligatoria, debe estar completada
            if (status == TaskStatus.Pending) {
                require(
                    !task.mandatory,
                    "All mandatory tasks must be completed"
                );
                // si no es obligatoria y sigue pendiente, simplemente la ignoramos
                continue;
            }

            // En este punto la tarea está completada (en tiempo o tarde)
            require(
                status == TaskStatus.CompletedOnTime ||
                    status == TaskStatus.CompletedLate,
                "Invalid task status"
            );

            uint8 actorId = uint8(task.actor);
            actorTaskCount[actorId] += 1;

            // Solo retrasos no justificados cuentan contra el actor
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

        t.certificateHash = keccak256(
            abi.encode(
                turnaroundId,
                t.flightNumber,
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
            turnaroundId,
            !t.slaBreached,
            t.onTimeTasks,
            t.lateTasks,
            durationSeconds,
            t.certificateHash
        );

        // --------- MINT DE BADGES POR ACTOR ---------
        if (address(badgeContract) != address(0)) {
            for (uint8 a = 0; a < 6; a++) {
                if (actorTaskCount[a] > 0 && actorLateCount[a] == 0) {
                    address wallet = actorWallets[Actor(a)];
                    if (wallet != address(0)) {
                        badgeContract.mintBadge(wallet, turnaroundId, a);
                    }
                }
            }
        }
    }

    /// @notice Marca una tarea como obligatoria o no para cerrar el turnaround
    function setTaskMandatory(
        uint256 turnaroundId,
        uint256 taskIndex,
        bool mandatory
    ) external onlyRole(OPS_ROLE) {
        Task storage task = _tasksByTurnaround[turnaroundId][taskIndex];
        task.mandatory = mandatory;
        emit TaskMandatoryUpdated(turnaroundId, taskIndex, mandatory);
    }

    /// @notice Marca una tarea como justificada por retraso, tanto antes (Pending) como después (CompletedLate).
    ///         - Si está Pending: no toca KPIs, solo marca que, si llega tarde, estará justificado.
    ///         - Si está CompletedLate: ajusta KPIs para que no cuente como retraso injustificado.
    function justifyDelayedTask(
        uint256 turnaroundId,
        uint256 taskIndex,
        string calldata reason
    ) external onlyActorOrOps(turnaroundId, taskIndex) {
        Turnaround storage t = turnarounds[turnaroundId];
        require(!t.certified, "Turnaround already certified");

        Task storage task = _tasksByTurnaround[turnaroundId][taskIndex];

        // Solo tiene sentido justificar si está pendiente o ya se completó tarde
        require(
            task.status == TaskStatus.Pending ||
                task.status == TaskStatus.CompletedLate,
            "Can only justify pending or late tasks"
        );

        // Si ya estaba justificada y quieres permitir cambiar el motivo,
        // se podría quitar este require. Ahora mismo lo bloqueamos:
        require(!task.justifiedDelay, "Already justified");

        // Si ya se había contado como retraso injustificado, ajustamos KPIs
        if (task.status == TaskStatus.CompletedLate) {
            if (t.lateTasks > 0) {
                t.lateTasks -= 1;
            }
            if (t.lateTasks == 0) {
                t.slaBreached = false;
            }
        }

        task.justifiedDelay = true;
        task.delayReason = reason; // NEW: persisted on-chain

        emit TaskDelayJustified(turnaroundId, taskIndex, reason);
    }

    ITurnaroundBadge public badgeContract;

    function setBadgeContract(
        address _badge
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        badgeContract = ITurnaroundBadge(_badge);
    }
}
