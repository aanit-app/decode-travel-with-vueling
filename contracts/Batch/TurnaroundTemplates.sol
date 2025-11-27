// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./TurnaroundTypes.sol";

library TurnaroundTemplates {
    // Interno: añade una tarea estándar a la lista
    function _addTask(
        Task[] storage tasks,
        uint8 templateId,
        Actor actor,
        uint256 deadline,
        bool mandatory
    ) private {
        tasks.push(
            Task({
                templateId: templateId,
                actor: actor,
                deadline: deadline,
                completedAt: 0,
                status: TaskStatus.Pending,
                mandatory: mandatory,
                justifiedDelay: false,
                delayReason: ""
            })
        );
    }

    /// @dev Inicializa las 27 tareas estándar del turnaround
    /// templateId: 0..26, mapeado en el front a nombres legibles
    function initStandardTasks(
        Task[] storage tasks,
        uint256 arr // scheduledArrival
    ) internal {
        // ARRIVAL / RAMP
        _addTask(tasks, 0, Actor.GroundHandling, arr + 1 minutes, true); // Chocks On
        _addTask(tasks, 1, Actor.GroundHandling, arr + 2 minutes, true); // GPU Connected
        _addTask(tasks, 2, Actor.Gate, arr + 3 minutes, true); // Open Pax Door
        _addTask(tasks, 3, Actor.GroundHandling, arr + 4 minutes, true); // Baggage Unloading Start
        _addTask(tasks, 4, Actor.GroundHandling, arr + 8 minutes, false); // Ground Services Ready (status, no crítica)
        _addTask(tasks, 5, Actor.Fuel, arr + 5 minutes, false); // Fuel Truck Arrived (mientras haya start/complete)
        _addTask(tasks, 6, Actor.Fuel, arr + 6 minutes, true); // Refueling Start
        _addTask(tasks, 7, Actor.Fuel, arr + 20 minutes, true); // Refueling Complete
        _addTask(tasks, 8, Actor.Cleaning, arr + 22 minutes, true); // Cleaning Complete
        _addTask(tasks, 9, Actor.Catering, arr + 12 minutes, false); // Catering Delivered (puede ser opcional)
        _addTask(tasks, 10, Actor.GroundHandling, arr + 10 minutes, true); // Baggage Unloading Complete

        // DEPARTURE / RAMP + TERMINAL
        _addTask(tasks, 11, Actor.GroundHandling, arr + 15 minutes, true); // Baggage Loading Start

        // CHECK-IN (más de “nice to have” en esta ventana de 40 min)
        _addTask(tasks, 12, Actor.Gate, arr + 0 minutes, false); // Start Check-In
        _addTask(tasks, 13, Actor.Gate, arr + 16 minutes, false); // End Check-In

        // GATE & BOARDING
        _addTask(tasks, 14, Actor.Gate, arr + 18 minutes, false); // First Agent at Gate
        _addTask(tasks, 15, Actor.Gate, arr + 19 minutes, false); // Second Agent at Gate
        _addTask(tasks, 16, Actor.Gate, arr + 24 minutes, true); // First Passenger Boarded
        _addTask(tasks, 17, Actor.Gate, arr + 26 minutes, false); // Managing Waiting List
        _addTask(tasks, 18, Actor.Gate, arr + 28 minutes, true); // Pax No-Show Identification
        _addTask(tasks, 19, Actor.GroundHandling, arr + 30 minutes, true); // Last Baggage on Aircraft
        _addTask(tasks, 20, Actor.Gate, arr + 32 minutes, true); // Last Passenger Boarded

        // FINAL GROUND OPS
        _addTask(tasks, 21, Actor.FlightCrew, arr + 35 minutes, true); // Close Pax Door
        _addTask(tasks, 22, Actor.GroundHandling, arr + 34 minutes, true); // Cargo Doors Closed
        _addTask(tasks, 23, Actor.FlightCrew, arr + 37 minutes, true); // Safety Checks Complete
        _addTask(tasks, 24, Actor.FlightCrew, arr + 38 minutes, true); // Pushback Requested
        _addTask(tasks, 25, Actor.GroundHandling, arr + 39 minutes, true); // Pushback Start
        _addTask(tasks, 26, Actor.GroundHandling, arr + 40 minutes, true); // Chocks Off
    }
}
