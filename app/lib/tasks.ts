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
  duration: number; // Duration in minutes
  team: Team;
  dependencies?: string[]; // Array of task IDs this task depends on
};

/**
 * All 27 turnaround tasks in sequential order
 */
export const TURNAROUND_TASKS: Task[] = [
  // ARRIVAL / RAMP
  {
    id: 0,
    taskId: "chocks-on",
    title: "Chocks On",
    duration: 0,
    team: Team.GROUND_HANDLING_PROVIDER,
  },
  {
    id: 1,
    taskId: "gpu-connected",
    title: "GPU Connected",
    duration: 7,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["chocks-on"],
  },
  {
    id: 2,
    taskId: "open-pax-door",
    title: "Open Pax Door",
    duration: 8,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["chocks-on"],
  },
  {
    id: 3,
    taskId: "baggage-unloading-start",
    title: "Baggage Unloading Start",
    duration: 10,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["open-pax-door"],
  },
  {
    id: 4,
    taskId: "ground-services-ready",
    title: "Ground Services Ready",
    duration: 12,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["chocks-on"],
  },
  {
    id: 5,
    taskId: "fuel-truck-arrived",
    title: "Fuel Truck Arrived",
    duration: 15,
    team: Team.FUEL_CLH,
    dependencies: ["ground-services-ready"],
  },
  {
    id: 6,
    taskId: "refueling-start",
    title: "Refueling Start",
    duration: 20,
    team: Team.FUEL_CLH,
    dependencies: ["fuel-truck-arrived"],
  },
  {
    id: 7,
    taskId: "refueling-complete",
    title: "Refueling Complete",
    duration: 30,
    team: Team.FUEL_CLH,
    dependencies: ["refueling-start"],
  },
  {
    id: 8,
    taskId: "cleaning-complete",
    title: "Cleaning Complete",
    duration: 35,
    team: Team.CLEANING,
    dependencies: ["open-pax-door"],
  },
  {
    id: 9,
    taskId: "catering-delivered",
    title: "Catering Delivered",
    duration: 40,
    team: Team.CATERING,
    dependencies: ["ground-services-ready"],
  },
  {
    id: 10,
    taskId: "baggage-unloading-complete",
    title: "Baggage Unloading Complete",
    duration: 25,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["baggage-unloading-start"],
  },
  // DEPARTURE / RAMP + TERMINAL
  {
    id: 11,
    taskId: "baggage-loading-start",
    title: "Baggage Loading Start",
    duration: 45,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["baggage-unloading-complete"],
  },
  // CHECK-IN
  {
    id: 12,
    taskId: "start-check-in",
    title: "Start Check-In",
    duration: 120,
    team: Team.GATE_BOARDING_AGENTS,
  },
  {
    id: 13,
    taskId: "end-check-in",
    title: "End Check-In",
    duration: 40,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["start-check-in"],
  },
  // GATE & BOARDING
  {
    id: 14,
    taskId: "first-agent-at-gate",
    title: "First Agent at Gate",
    duration: 40,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["end-check-in"],
  },
  {
    id: 15,
    taskId: "second-agent-at-gate",
    title: "Second Agent at Gate",
    duration: 35,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-agent-at-gate"],
  },
  {
    id: 16,
    taskId: "first-passenger-boarded",
    title: "First Passenger Boarded",
    duration: 30,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-agent-at-gate"],
  },
  {
    id: 17,
    taskId: "managing-waiting-list",
    title: "Managing Waiting List",
    duration: 20,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-passenger-boarded"],
  },
  {
    id: 18,
    taskId: "pax-no-show-identification",
    title: "Pax No-Show Identification",
    duration: 20,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["first-passenger-boarded"],
  },
  {
    id: 19,
    taskId: "last-baggage-on-aircraft",
    title: "Last Baggage on Aircraft",
    duration: 25,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["baggage-loading-start"],
  },
  {
    id: 20,
    taskId: "last-passenger-boarded",
    title: "Last Passenger Boarded",
    duration: 15,
    team: Team.GATE_BOARDING_AGENTS,
    dependencies: ["managing-waiting-list", "pax-no-show-identification"],
  },
  // FINAL GROUND OPS
  {
    id: 21,
    taskId: "close-pax-door",
    title: "Close Pax Door",
    duration: 10,
    team: Team.FLIGHT_CREW,
    dependencies: ["last-passenger-boarded"],
  },
  {
    id: 22,
    taskId: "cargo-doors-closed",
    title: "Cargo Doors Closed",
    duration: 10,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["last-baggage-on-aircraft"],
  },
  {
    id: 23,
    taskId: "safety-checks-complete",
    title: "Safety Checks Complete",
    duration: 5,
    team: Team.FLIGHT_CREW,
    dependencies: ["close-pax-door", "cargo-doors-closed"],
  },
  {
    id: 24,
    taskId: "pushback-requested",
    title: "Pushback Requested",
    duration: 5,
    team: Team.FLIGHT_CREW,
    dependencies: ["safety-checks-complete"],
  },
  {
    id: 25,
    taskId: "pushback-start",
    title: "Pushback Start",
    duration: 3,
    team: Team.GROUND_HANDLING_PROVIDER,
    dependencies: ["pushback-requested"],
  },
  {
    id: 26,
    taskId: "chocks-off",
    title: "Chocks Off",
    duration: 2,
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

