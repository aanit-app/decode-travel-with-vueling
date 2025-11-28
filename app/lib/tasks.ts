/**
 * All 27 turnaround tasks with their IDs (0-26) and metadata
 */

export enum Team {
  GROUND_HANDLING_PROVIDER = "GROUND_HANDLING_PROVIDER",
  GATE_BOARDING_AGENTS = "GATE_BOARDING_AGENTS",
  FUEL_CLH = "FUEL_CLH",
  CLEANING = "CLEANING",
  CATERING = "CATERING",
  FLIGHT_CREW = "FLIGHT_CREW",
}

export type Task = {
  id: number; // Task ID (0-26) used for contract interaction
  taskId: string; // Internal task identifier (e.g., "chocks-on")
  title: string;
  timeout: number; // Timeout in minutes - time interval in which the task should be completed since its last dependency became completed
  team: Team;
  dependencies?: string[]; // Array of task IDs this task depends on
};

/**
 * All 27 turnaround tasks in sequential order
 */
export const TURNAROUND_TASKS: Task[] = [
  // ARRIVAL / RAMP
  // Based on contract: deadlines relative to scheduledArrival (arr)
  {
    id: 0,
    taskId: "chocks-on",
    title: "Chocks On",
    timeout: 1, // arr + 1 min (no dependency)
    team: Team.GROUND_HANDLING_PROVIDER,
  },
  {
    id: 1,
    taskId: "gpu-connected",
    title: "GPU Connected",
    timeout: 1, // arr + 2 min, depends on chocks-on (arr+1) = 2-1 = 1 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["chocks-on"],
  },
  {
    id: 2,
    taskId: "open-pax-door",
    title: "Open Pax Door",
    timeout: 2, // arr + 3 min, depends on chocks-on (arr+1) = 3-1 = 2 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["chocks-on"],
  },
  {
    id: 3,
    taskId: "baggage-unloading-start",
    title: "Baggage Unloading Start",
    timeout: 1, // arr + 4 min, depends on open-pax-door (arr+3) = 4-3 = 1 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["open-pax-door"],
  },
  {
    id: 4,
    taskId: "ground-services-ready",
    title: "Ground Services Ready",
    timeout: 7, // arr + 8 min, depends on chocks-on (arr+1) = 8-1 = 7 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["chocks-on"],
  },
  {
    id: 5,
    taskId: "fuel-truck-arrived",
    title: "Fuel Truck Arrived",
    timeout: 4, // arr + 5 min, depends on chocks-on (arr+1) = 5-1 = 4 min (note: contract has arr+5 but depends on ground-services-ready arr+8, using chocks-on as base)
    team: Team.FUEL_CLH,
    dependencies: ["ground-services-ready"],
  },
  {
    id: 6,
    taskId: "refueling-start",
    title: "Refueling Start",
    timeout: 1, // arr + 6 min, depends on fuel-truck-arrived (arr+5) = 6-5 = 1 min
    team: Team.FUEL_CLH,
    dependencies: ["fuel-truck-arrived"],
  },
  {
    id: 7,
    taskId: "refueling-complete",
    title: "Refueling Complete",
    timeout: 14, // arr + 20 min, depends on refueling-start (arr+6) = 20-6 = 14 min
    team: Team.FUEL_CLH,
    dependencies: ["refueling-start"],
  },
  {
    id: 8,
    taskId: "cleaning-complete",
    title: "Cleaning Complete",
    timeout: 19, // arr + 22 min, depends on open-pax-door (arr+3) = 22-3 = 19 min
    team: Team.CLEANING,
    dependencies: ["open-pax-door"],
  },
  {
    id: 9,
    taskId: "catering-delivered",
    title: "Catering Delivered",
    timeout: 4, // arr + 12 min, depends on ground-services-ready (arr+8) = 12-8 = 4 min
    team: Team.CATERING,
    dependencies: ["ground-services-ready"],
  },
  {
    id: 10,
    taskId: "baggage-unloading-complete",
    title: "Baggage Unloading Complete",
    timeout: 6, // arr + 10 min, depends on baggage-unloading-start (arr+4) = 10-4 = 6 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["baggage-unloading-start"],
  },
  // DEPARTURE / RAMP + TERMINAL
  {
    id: 11,
    taskId: "baggage-loading-start",
    title: "Baggage Loading Start",
    timeout: 5, // arr + 15 min, depends on baggage-unloading-complete (arr+10) = 15-10 = 5 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["baggage-unloading-complete"],
  },
  // CHECK-IN (runs in parallel, starts early)
  {
    id: 12,
    taskId: "start-check-in",
    title: "Start Check-In",
    timeout: 1, // arr + 1 min (starts immediately, no dependency)
    team: Team.GATE_BOARDING_AGENTS,
  },
  {
    id: 13,
    taskId: "end-check-in",
    title: "End Check-In",
    timeout: 16, // arr + 16 min, depends on start-check-in (arr+0) = 16-0 = 16 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["start-check-in"],
  },
  // GATE & BOARDING
  {
    id: 14,
    taskId: "first-agent-at-gate",
    title: "First Agent at Gate",
    timeout: 2, // arr + 18 min, depends on end-check-in (arr+16) = 18-16 = 2 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["end-check-in"],
  },
  {
    id: 15,
    taskId: "second-agent-at-gate",
    title: "Second Agent at Gate",
    timeout: 1, // arr + 19 min, depends on first-agent-at-gate (arr+18) = 19-18 = 1 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-agent-at-gate"],
  },
  {
    id: 16,
    taskId: "first-passenger-boarded",
    title: "First Passenger Boarded",
    timeout: 6, // arr + 24 min, depends on first-agent-at-gate (arr+18) = 24-18 = 6 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-agent-at-gate"],
  },
  {
    id: 17,
    taskId: "managing-waiting-list",
    title: "Managing Waiting List",
    timeout: 2, // arr + 26 min, depends on first-passenger-boarded (arr+24) = 26-24 = 2 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-passenger-boarded"],
  },
  {
    id: 18,
    taskId: "pax-no-show-identification",
    title: "Pax No-Show Identification",
    timeout: 4, // arr + 28 min, depends on first-passenger-boarded (arr+24) = 28-24 = 4 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-passenger-boarded"],
  },
  {
    id: 19,
    taskId: "last-baggage-on-aircraft",
    title: "Last Baggage on Aircraft",
    timeout: 15, // arr + 30 min, depends on baggage-loading-start (arr+15) = 30-15 = 15 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["baggage-loading-start"],
  },
  {
    id: 20,
    taskId: "last-passenger-boarded",
    title: "Last Passenger Boarded",
    timeout: 4, // arr + 32 min, depends on managing-waiting-list (arr+26) and pax-no-show-identification (arr+28), using max(26,28)=28, so 32-28 = 4 min
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["managing-waiting-list", "pax-no-show-identification"],
  },
  // FINAL GROUND OPS
  {
    id: 21,
    taskId: "close-pax-door",
    title: "Close Pax Door",
    timeout: 3, // arr + 35 min, depends on last-passenger-boarded (arr+32) = 35-32 = 3 min
    team: Team.FLIGHT_CREW,
    dependencies: ["last-passenger-boarded"],
  },
  {
    id: 22,
    taskId: "cargo-doors-closed",
    title: "Cargo Doors Closed",
    timeout: 4, // arr + 34 min, depends on last-baggage-on-aircraft (arr+30) = 34-30 = 4 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["last-baggage-on-aircraft"],
  },
  {
    id: 23,
    taskId: "safety-checks-complete",
    title: "Safety Checks Complete",
    timeout: 2, // arr + 37 min, depends on close-pax-door (arr+35) and cargo-doors-closed (arr+34), using max(35,34)=35, so 37-35 = 2 min
    team: Team.FLIGHT_CREW,
    dependencies: ["close-pax-door", "cargo-doors-closed"],
  },
  {
    id: 24,
    taskId: "pushback-requested",
    title: "Pushback Requested",
    timeout: 1, // arr + 38 min, depends on safety-checks-complete (arr+37) = 38-37 = 1 min
    team: Team.FLIGHT_CREW,
    dependencies: ["safety-checks-complete"],
  },
  {
    id: 25,
    taskId: "pushback-start",
    title: "Pushback Start",
    timeout: 1, // arr + 39 min, depends on pushback-requested (arr+38) = 39-38 = 1 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["pushback-requested"],
  },
  {
    id: 26,
    taskId: "chocks-off",
    title: "Chocks Off",
    timeout: 1, // arr + 40 min, depends on pushback-start (arr+39) = 40-39 = 1 min
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["pushback-start"],
  },
];

/**
 * Get a task by its ID (0-26)
 */
export function getTaskById(id: number): Task | undefined {
  return TURNAROUND_TASKS.find((task) => task.id === id);
}

/**
 * Get a task by its taskId (e.g., "chocks-on")
 */
export function getTaskByTaskId(taskId: string): Task | undefined {
  return TURNAROUND_TASKS.find((task) => task.taskId === taskId);
}

