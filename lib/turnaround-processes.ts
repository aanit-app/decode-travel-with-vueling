import { StepStatus, Team, type Process } from "@/components/turnaround-flow";

/**
 * Generate turnaround processes for a flight - all 27 steps sequentially
 * @param arrTime - Arrival time in minutes from midnight
 * @param depTime - Departure time in minutes from midnight
 * @param progress - Flight progress percentage (0-100)
 */
export function getTurnaroundProcesses(
  arrTime: number,
  depTime: number,
  progress: number
): Process[] {
  // Determine status based on step number and overall progress
  const getStepStatus = (stepNumber: number): StepStatus => {
    const totalSteps = 27;
    const completedSteps = Math.floor((progress / 100) * totalSteps);

    if (stepNumber < completedSteps) {
      return StepStatus.Finished;
    } else if (stepNumber === completedSteps) {
      return StepStatus.InProgress;
    } else {
      return StepStatus.Standby;
    }
  };

  // Define all processes with their dependencies and timing rules
  const processDefinitions: Array<{
    id: string;
    title: string;
    stepNumber: number;
    duration: number;
    team: Team;
    dependencies?: string[];
    checkTime: Date | null;
  }> = [
    // ARRIVAL / RAMP
    {
      id: "chocks-on",
      title: "Chocks On",
      stepNumber: 0,
      duration: 0,
      team: Team.GROUND_HANDLING_PROVIDER,
      checkTime: new Date("2025-11-14:35:48Z"),
    },
    {
      id: "gpu-connected",
      title: "GPU Connected",
      stepNumber: 1,
      duration: 7,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["chocks-on"],
      checkTime: new Date("2025-11-26T18:55:48Z"),
    },
    {
      id: "open-pax-door",
      title: "Open Pax Door",
      stepNumber: 2,
      duration: 8,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["chocks-on"],
      checkTime: null,
    },
    {
      id: "baggage-unloading-start",
      title: "Baggage Unloading Start",
      stepNumber: 3,
      duration: 10,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["open-pax-door"],
      checkTime: null,
    },
    {
      id: "ground-services-ready",
      title: "Ground Services Ready",
      stepNumber: 4,
      duration: 12,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["chocks-on"],
      checkTime: null,
    },
    {
      id: "fuel-truck-arrived",
      title: "Fuel Truck Arrived",
      stepNumber: 5,
      duration: 15,
      team: Team.FUEL_CLH,
      dependencies: ["ground-services-ready"],
      checkTime: null,
    },
    {
      id: "refueling-start",
      title: "Refueling Start",
      stepNumber: 6,
      duration: 20,
      team: Team.FUEL_CLH,
      dependencies: ["fuel-truck-arrived"],
      checkTime: null,
    },
    {
      id: "refueling-complete",
      title: "Refueling Complete",
      stepNumber: 7,
      duration: 30,
      team: Team.FUEL_CLH,
      dependencies: ["refueling-start"],
      checkTime: null,
    },
    {
      id: "cleaning-complete",
      title: "Cleaning Complete",
      stepNumber: 8,
      duration: 35,
      team: Team.CLEANING,
      dependencies: ["open-pax-door"],
      checkTime: null,
    },
    {
      id: "catering-delivered",
      title: "Catering Delivered",
      stepNumber: 9,
      duration: 40,
      team: Team.CATERING,
      dependencies: ["ground-services-ready"],
      checkTime: null,
    },
    {
      id: "baggage-unloading-complete",
      title: "Baggage Unloading Complete",
      stepNumber: 10,
      duration: 25,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["baggage-unloading-start"],
      checkTime: null,
    },
    // DEPARTURE / RAMP + TERMINAL
    {
      id: "baggage-loading-start",
      title: "Baggage Loading Start",
      stepNumber: 11,
      duration: 45,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["baggage-unloading-complete"],
      checkTime: null,
    },
    // CHECK-IN
    {
      id: "start-check-in",
      title: "Start Check-In",
      stepNumber: 12,
      duration: 120,
      team: Team.GATE_BOARDING_AGENTS,
      checkTime: null,
    },
    {
      id: "end-check-in",
      title: "End Check-In",
      stepNumber: 13,
      duration: 40,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["start-check-in"],
      checkTime: null,
    },
    // GATE & BOARDING
    {
      id: "first-agent-at-gate",
      title: "First Agent at Gate",
      stepNumber: 14,
      duration: 40,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["end-check-in"],
      checkTime: null,
    },
    {
      id: "second-agent-at-gate",
      title: "Second Agent at Gate",
      stepNumber: 15,
      duration: 35,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["first-agent-at-gate"],
      checkTime: null,
    },
    {
      id: "first-passenger-boarded",
      title: "First Passenger Boarded",
      stepNumber: 16,
      duration: 30,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["first-agent-at-gate"],
      checkTime: null,
    },
    {
      id: "managing-waiting-list",
      title: "Managing Waiting List",
      stepNumber: 17,
      duration: 20,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["first-passenger-boarded"],
      checkTime: null,
    },
    {
      id: "pax-no-show-identification",
      title: "Pax No-Show Identification",
      stepNumber: 18,
      duration: 20,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["first-passenger-boarded"],
      checkTime: null,
    },
    {
      id: "last-baggage-on-aircraft",
      title: "Last Baggage on Aircraft",
      stepNumber: 19,
      duration: 25,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["baggage-loading-start"],
      checkTime: null,
    },
    {
      id: "last-passenger-boarded",
      title: "Last Passenger Boarded",
      stepNumber: 20,
      duration: 15,
      team: Team.GATE_BOARDING_AGENTS,
      dependencies: ["managing-waiting-list", "pax-no-show-identification"],
      checkTime: null,
    },
    // FINAL GROUND OPS
    {
      id: "close-pax-door",
      title: "Close Pax Door",
      stepNumber: 21,
      duration: 10,
      team: Team.FLIGHT_CREW,
      dependencies: ["last-passenger-boarded"],
      checkTime: null,
    },
    {
      id: "cargo-doors-closed",
      title: "Cargo Doors Closed",
      stepNumber: 22,
      duration: 10,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["last-baggage-on-aircraft"],
      checkTime: null,
    },
    {
      id: "safety-checks-complete",
      title: "Safety Checks Complete",
      stepNumber: 23,
      duration: 5,
      team: Team.FLIGHT_CREW,
      dependencies: ["close-pax-door", "cargo-doors-closed"],
      checkTime: null,
    },
    {
      id: "pushback-requested",
      title: "Pushback Requested",
      stepNumber: 24,
      duration: 5,
      team: Team.FLIGHT_CREW,
      dependencies: ["safety-checks-complete"],
      checkTime: null,
    },
    {
      id: "pushback-start",
      title: "Pushback Start",
      stepNumber: 25,
      duration: 3,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["pushback-requested"],
      checkTime: null,
    },
    {
      id: "chocks-off",
      title: "Chocks Off",
      stepNumber: 26,
      duration: 2,
      team: Team.GROUND_HANDLING_PROVIDER,
      dependencies: ["pushback-start"],
      checkTime: null,
    },
  ];

  // Helper to convert minutes from midnight to Date
  const minutesToDate = (minutes: number, baseDate: Date): Date => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const date = new Date(baseDate);
    date.setHours(hours, mins, 0, 0);
    return date;
  };

  // Helper to calculate planned end time of a process recursively based on dependencies
  const getPlannedEndTime = (processId: string, visited: Set<string> = new Set()): number => {
    if (visited.has(processId)) {
      return 0; // Avoid circular dependencies
    }
    visited.add(processId);
    
    const process = processDefinitions.find((d) => d.id === processId);
    if (!process) {
      return 0;
    }
    
    // If this is "chocks-on" (root process), it starts at arrival time
    if (process.id === "chocks-on") {
      return arrTime + process.duration;
    }
    
    // If process has dependencies, calculate when the last dependency ends
    if (process.dependencies && process.dependencies.length > 0) {
      const dependencyEndTimes = process.dependencies.map((depId) => 
        getPlannedEndTime(depId, new Set(visited))
      );
      const maxDependencyEndTime = Math.max(...dependencyEndTimes, arrTime);
      return maxDependencyEndTime + process.duration;
    }
    
    // If no dependencies and not "chocks-on", it's a departure process
    // Calculate backwards from departure time
    // Find all processes that depend on this one
    const dependentProcesses = processDefinitions.filter(
      (d) => d.dependencies && d.dependencies.includes(processId)
    );
    
    if (dependentProcesses.length > 0) {
      // This process must complete before its dependents start
      // Calculate when the earliest dependent needs to start
      const dependentStartTimes = dependentProcesses.map((dep) => {
        const depEndTime = getPlannedEndTime(dep.id, new Set(visited));
        return depEndTime - dep.duration;
      });
      const earliestDependentStart = Math.min(...dependentStartTimes);
      return earliestDependentStart;
    }
    
    // If nothing depends on it and it has no dependencies, it's a terminal departure process
    // Calculate backwards from departure time
    return depTime - process.duration;
  };

  // Build processes array
  const processes: Process[] = processDefinitions.map((def) => {
    // Calculate actualStartTime from the most recent checkTime of dependencies
    let actualStartTime: Date | null = null;
    
    if (def.dependencies && def.dependencies.length > 0) {
      // Find the most recent checkTime from all dependencies
      const dependencyCheckTimes = def.dependencies
        .map((depId) => {
          const depDef = processDefinitions.find((d) => d.id === depId);
          return depDef?.checkTime ?? null;
        })
        .filter((checkTime): checkTime is Date => checkTime !== null);
      
      if (dependencyCheckTimes.length > 0) {
        // Get the most recent (latest) checkTime
        actualStartTime = dependencyCheckTimes.reduce((latest, current) => {
          return current > latest ? current : latest;
        });
      }
    } else {
      // For processes with no dependencies, use arrival time
      // "chocks-on" starts at arrival time, others will be calculated in planned time
      if (def.id === "chocks-on") {
        actualStartTime = minutesToDate(arrTime, new Date());
      }
      // For other processes with no dependencies, actualStartTime remains null
      // until they have actual data
    }
    
    const actualEndTime = def.checkTime;

    // Calculate planned start time based purely on dependencies
    let plannedStartTime: Date | null = null;
    
    if (def.id === "chocks-on") {
      // Root process starts at arrival time
      plannedStartTime = minutesToDate(arrTime, new Date());
    } else if (def.dependencies && def.dependencies.length > 0) {
      // Calculate when the last dependency ends
      const dependencyEndTimes = def.dependencies.map((depId) => 
        getPlannedEndTime(depId)
      );
      const maxDependencyEndTime = Math.max(...dependencyEndTimes, arrTime);
      plannedStartTime = minutesToDate(maxDependencyEndTime, new Date());
    } else {
      // Process with no dependencies - calculate backwards from departure
      // Find all processes that depend on this one
      const dependentProcesses = processDefinitions.filter(
        (d) => d.dependencies && d.dependencies.includes(def.id)
      );
      
      if (dependentProcesses.length > 0) {
        // Calculate when the earliest dependent needs to start
        const dependentStartTimes = dependentProcesses.map((dep) => {
          const depEndTime = getPlannedEndTime(dep.id);
          return depEndTime - dep.duration;
        });
        const earliestDependentStart = Math.min(...dependentStartTimes);
        plannedStartTime = minutesToDate(earliestDependentStart - def.duration, new Date());
      } else {
        // Terminal process with no dependencies - calculate backwards from departure
        plannedStartTime = minutesToDate(depTime - def.duration, new Date());
      }
    }

    return {
      id: def.id,
      title: def.title,
      duration: 0,
      team: def.team,
      dependencies: def.dependencies,
      taskBars: [
        {
          id: `${def.id}-bar`,
          label: def.title,
          startTime: actualStartTime, // Only from definition, never calculated
          endTime: actualEndTime, // Only from definition, never calculated
          plannedStartTime: plannedStartTime, // Calculated planned start time
          duration: def.duration, // Planned duration in minutes
          status: getStepStatus(def.stepNumber),
        },
      ],
    };
  });

  return processes;
}
