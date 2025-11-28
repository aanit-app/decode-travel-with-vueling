import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { TURNAROUND_TASKS } from "./tasks";

// Import TATStatus enum - re-export for convenience
export enum TATStatus {
  OnTime = "on time",
  Cancelled = "cancelled",
  Delayed = "delayed",
}

export type TaskCompletion = {
  taskId: number;
  timestamp: number; // Unix timestamp in seconds
  submittedAt: Date;
};

/**
 * Fetches task completions from Firestore subcollection for a given turnaround
 * @param turnaroundId - The ID of the turnaround
 * @returns Map of taskId to TaskCompletion (only earliest completion per task)
 */
export async function fetchTaskCompletions(
  turnaroundId: string
): Promise<Map<number, TaskCompletion>> {
  try {
    const taskCompletionsRef = collection(
      db,
      "turnarounds",
      turnaroundId,
      "taskCompletions"
    );
    const querySnapshot = await getDocs(taskCompletionsRef);

    const completionsMap = new Map<number, TaskCompletion>();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const taskId = data.taskId as number;
      // Only keep the earliest completion for each task
      if (
        !completionsMap.has(taskId) ||
        (data.timestamp as number) < completionsMap.get(taskId)!.timestamp
      ) {
        completionsMap.set(taskId, {
          taskId: data.taskId as number,
          timestamp: data.timestamp as number,
          submittedAt: data.submittedAt?.toDate() || new Date(),
        });
      }
    });

    return completionsMap;
  } catch (err) {
    console.error("Error fetching task completions:", err);
    return new Map();
  }
}

/**
 * Calculates progress percentage based on completed tasks
 * @param taskCompletions - Map of taskId to TaskCompletion
 * @param totalTasks - Total number of tasks (default: 27)
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(
  taskCompletions: Map<number, TaskCompletion>,
  totalTasks: number = 27
): number {
  const completedCount = taskCompletions.size;
  return Math.round((completedCount / totalTasks) * 100);
}

/**
 * Calculates the maximum turnaround duration considering dependencies and delays
 * This simulates the dependency chain to find when the last task would complete
 * @param scheduledArrival - Scheduled arrival time (Date)
 * @param taskCompletions - Map of taskId to TaskCompletion
 * @returns Maximum duration in minutes from scheduled arrival to last task completion
 */
export function calculateMaxTurnaroundDuration(
  scheduledArrival: Date,
  taskCompletions: Map<number, TaskCompletion>
): number {
  const scheduledArrivalTime = scheduledArrival.getTime();
  
  // Helper to get task by taskId string
  const getTaskByTaskId = (taskId: string) => {
    return TURNAROUND_TASKS.find((t) => t.taskId === taskId);
  };

  // Calculate completion time for each task considering dependencies
  const taskCompletionTimes = new Map<number, number>();

  // Process tasks in dependency order (topological sort)
  // For simplicity, we'll process all tasks and resolve dependencies
  const processedTasks = new Set<number>();
  
  // Function to get completion time for a task
  const getTaskCompletionTime = (taskId: number): number => {
    if (taskCompletionTimes.has(taskId)) {
      return taskCompletionTimes.get(taskId)!;
    }

    const task = TURNAROUND_TASKS.find((t) => t.id === taskId);
    if (!task) {
      return scheduledArrivalTime;
    }

    // Check if task is already completed
    const completion = taskCompletions.get(taskId);
    if (completion) {
      const completionTime = completion.timestamp * 1000; // Convert to milliseconds
      taskCompletionTimes.set(taskId, completionTime);
      return completionTime;
    }

    // Task not completed - calculate based on dependencies
    let latestDependencyCompletion = scheduledArrivalTime;

    if (task.dependencies && task.dependencies.length > 0) {
      for (const depTaskId of task.dependencies) {
        const depTask = getTaskByTaskId(depTaskId);
        if (depTask) {
          const depCompletionTime = getTaskCompletionTime(depTask.id);
          latestDependencyCompletion = Math.max(
            latestDependencyCompletion,
            depCompletionTime
          );
        }
      }
    }

    // Task completion time = latest dependency completion + task timeout
    const taskCompletionTime = latestDependencyCompletion + task.timeout * 60000;
    taskCompletionTimes.set(taskId, taskCompletionTime);
    return taskCompletionTime;
  };

  // Calculate completion time for all tasks
  for (let taskId = 0; taskId < 27; taskId++) {
    getTaskCompletionTime(taskId);
  }

  // Find the latest completion time
  let maxCompletionTime = scheduledArrivalTime;
  for (const completionTime of taskCompletionTimes.values()) {
    maxCompletionTime = Math.max(maxCompletionTime, completionTime);
  }

  // Calculate duration in minutes
  const durationMs = maxCompletionTime - scheduledArrivalTime;
  return Math.round(durationMs / 60000);
}

/**
 * Calculates TAT status based on maximum turnaround duration
 * This considers the most optimistic case: if all remaining tasks complete on time
 * from their current dependency completion times
 * @param scheduledArrival - Scheduled arrival time (Date)
 * @param taskCompletions - Map of taskId to TaskCompletion
 * @param maxDurationMinutes - Maximum allowed duration in minutes (default: 40)
 * @returns TAT status: OnTime if within limit, Delayed if exceeds
 */
export function calculateTATStatus(
  scheduledArrival: Date,
  taskCompletions: Map<number, TaskCompletion>,
  maxDurationMinutes: number = 40
): TATStatus {
  // Calculate maximum duration considering dependencies and delays
  const maxDuration = calculateMaxTurnaroundDuration(scheduledArrival, taskCompletions);
  
  // If the most optimistic completion time exceeds 40 minutes, mark as delayed
  if (maxDuration > maxDurationMinutes) {
    return TATStatus.Delayed;
  }
  
  return TATStatus.OnTime;
}

