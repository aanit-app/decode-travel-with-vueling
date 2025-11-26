// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./TurnaroundTypes.sol";

library TurnaroundTemplates {
    // Interno: añade una tarea estándar a la lista
    function _addTask(
        Task[] storage tasks,
        uint8 templateId,
        Actor actor,
        uint256 deadline
    ) private {
        tasks.push(
            Task({
                templateId: templateId,
                actor: actor,
                deadline: deadline,
                completedAt: 0,
                status: TaskStatus.Pending
            })
        );
    }

    /// @dev Inicializa las 27 tareas estándar del turnaround
    /// templateId: 0..26, mapeado en el front a nombres legibles
    function initStandardTasks(
        Task[] storage tasks,
        uint256 arr, // scheduledArrival
        uint256 dep  // scheduledDeparture
    ) internal {
        // ARRIVAL / RAMP
        _addTask(tasks, 0,  Actor.GroundHandling, arr +  5 minutes);  // Chocks On
        _addTask(tasks, 1,  Actor.GroundHandling, arr +  7 minutes);  // GPU Connected
        _addTask(tasks, 2,  Actor.Gate,           arr +  8 minutes);  // Open Pax Door
        _addTask(tasks, 3,  Actor.GroundHandling, arr + 10 minutes);  // Baggage Unloading Start
        _addTask(tasks, 4,  Actor.GroundHandling, arr + 12 minutes);  // Ground Services Ready
        _addTask(tasks, 5,  Actor.Fuel,           arr + 15 minutes);  // Fuel Truck Arrived
        _addTask(tasks, 6,  Actor.Fuel,           arr + 20 minutes);  // Refueling Start
        _addTask(tasks, 7,  Actor.Fuel,           dep - 30 minutes);  // Refueling Complete
        _addTask(tasks, 8,  Actor.Cleaning,       dep - 35 minutes);  // Cleaning Complete
        _addTask(tasks, 9,  Actor.Catering,       dep - 40 minutes);  // Catering Delivered
        _addTask(tasks, 10, Actor.GroundHandling, arr + 25 minutes);  // Baggage Unloading Complete

        // DEPARTURE / RAMP + TERMINAL
        _addTask(tasks, 11, Actor.GroundHandling, dep - 45 minutes);  // Baggage Loading Start

        // CHECK-IN
        _addTask(tasks, 12, Actor.Gate,           dep - 120 minutes); // Start Check-In
        _addTask(tasks, 13, Actor.Gate,           dep - 40 minutes);  // End Check-In

        // GATE & BOARDING
        _addTask(tasks, 14, Actor.Gate,           dep - 40 minutes);  // First Agent at Gate
        _addTask(tasks, 15, Actor.Gate,           dep - 35 minutes);  // Second Agent at Gate
        _addTask(tasks, 16, Actor.Gate,           dep - 30 minutes);  // First Passenger Boarded
        _addTask(tasks, 17, Actor.Gate,           dep - 20 minutes);  // Managing Waiting List
        _addTask(tasks, 18, Actor.Gate,           dep - 20 minutes);  // Pax No-Show Identification
        _addTask(tasks, 19, Actor.GroundHandling, dep - 25 minutes);  // Last Baggage on Aircraft
        _addTask(tasks, 20, Actor.Gate,           dep - 15 minutes);  // Last Passenger Boarded

        // FINAL GROUND OPS
        _addTask(tasks, 21, Actor.FlightCrew,     dep - 10 minutes);  // Close Pax Door
        _addTask(tasks, 22, Actor.GroundHandling, dep - 10 minutes);  // Cargo Doors Closed
        _addTask(tasks, 23, Actor.FlightCrew,     dep -  5 minutes);  // Safety Checks Complete
        _addTask(tasks, 24, Actor.FlightCrew,     dep -  5 minutes);  // Pushback Requested
        _addTask(tasks, 25, Actor.GroundHandling, dep -  3 minutes);  // Pushback Start
        _addTask(tasks, 26, Actor.GroundHandling, dep -  2 minutes);  // Chocks Off
    }
}
