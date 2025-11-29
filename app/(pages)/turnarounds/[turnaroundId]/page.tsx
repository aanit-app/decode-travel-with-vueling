"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Spinner, Button, Card, CardBody } from "@heroui/react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  useWeb3,
  type Task as ContractTask,
  type TurnaroundState,
} from "../../../contexts/Web3Context";
import { H1, H2, Body } from "../../../components/typography";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { CheckSquare } from "lucide-react";
import {
  TurnaroundFlow,
  type Process,
  type TaskBar,
  StepStatus,
} from "../../../components/TurnaroundFlow";
import { TURNAROUND_TASKS, getTaskById, Team } from "../../../lib/tasks";
import { fetchTaskCompletions, type TaskCompletion } from "../../../lib/turnaround-utils";

type Turnaround = {
  id: string;
  flightNumber?: string;
  flight?: string;
  route?: string;
  contractAddress?: string;
  chainId?: number;
  [key: string]: any;
};

// Map contract Actor to Team enum
function mapActorToTeam(actor: string): Team {
  switch (actor) {
    case "GroundHandling":
      return Team.GROUND_HANDLING_PROVIDER;
    case "Cleaning":
      return Team.CLEANING;
    case "Fuel":
      return Team.FUEL_CLH;
    case "Catering":
      return Team.CATERING;
    case "FlightCrew":
      return Team.FLIGHT_CREW;
    case "Gate":
      return Team.GATE_BOARDING_AGENTS;
    default:
      return Team.GROUND_HANDLING_PROVIDER;
  }
}

// Transform contract data into Process and TaskBar format
// Creates one process (row) for each of the 27 tasks
function transformToProcesses(
  contractTasks: ContractTask[],
  turnaroundState: TurnaroundState | null,
  taskCompletions: Map<number, TaskCompletion>
): Process[] {
  if (!turnaroundState) {
    return [];
  }

  const scheduledArrival = new Date(turnaroundState.scheduledArrival * 1000);

  // Create a map of contract tasks by templateId for quick lookup
  const contractTasksMap = new Map<number, ContractTask>();
  contractTasks.forEach((task) => {
    contractTasksMap.set(task.templateId, task);
  });

  // Helper function to get task by taskId string
  const getTaskByTaskId = (taskId: string) => {
    return TURNAROUND_TASKS.find((t) => t.taskId === taskId);
  };

  // First pass: Calculate base planned times and completion times
  const taskData = new Map<number, {
    contractTask?: ContractTask;
    taskTemplate?: typeof TURNAROUND_TASKS[0];
    basePlannedStartTime: Date | null;
    completionTime: Date | null;
    submittedAt: Date | null;
  }>();

  for (let templateId = 0; templateId < 27; templateId++) {
    const contractTask = contractTasksMap.get(templateId);
    const taskTemplate = getTaskById(templateId);
    
    // Calculate base planned start time from contract deadline
    const basePlannedStartTime = contractTask
      ? taskTemplate?.timeout === 0
        ? new Date(contractTask.deadline * 1000)
        : new Date(contractTask.deadline * 1000 - (taskTemplate?.timeout || 0) * 60000)
      : null;

    // Get completion timestamp from Firestore
    const taskCompletion = taskCompletions.get(templateId);
    const completionTime = taskCompletion
      ? new Date(taskCompletion.timestamp * 1000)
      : null;
    const submittedAt = taskCompletion?.submittedAt || null;

    taskData.set(templateId, {
      contractTask,
      taskTemplate,
      basePlannedStartTime,
      completionTime,
      submittedAt,
    });
  }

  // Second pass: Calculate adjusted planned start times based on dependency completions
  const adjustedPlannedStartTimes = new Map<number, Date | null>();

  for (let templateId = 0; templateId < 27; templateId++) {
    const data = taskData.get(templateId);
    if (!data || !data.taskTemplate) {
      adjustedPlannedStartTimes.set(templateId, data?.basePlannedStartTime || null);
      continue;
    }

    const { taskTemplate, basePlannedStartTime, completionTime } = data;

    // If no dependencies, use base planned start time
    if (!taskTemplate.dependencies || taskTemplate.dependencies.length === 0) {
      adjustedPlannedStartTimes.set(templateId, basePlannedStartTime);
      continue;
    }

    // Find the latest completion time of all dependencies
    let latestDependencyCompletion: Date | null = null;
    for (const depTaskId of taskTemplate.dependencies) {
      const depTask = getTaskByTaskId(depTaskId);
      if (!depTask) continue;

      const depData = taskData.get(depTask.id);
      if (!depData) continue;

      // Use completion time if available, otherwise use planned end time
      const depCompletion = depData.completionTime;
      const depPlannedStart = adjustedPlannedStartTimes.get(depTask.id) || depData.basePlannedStartTime;
      
      if (depCompletion) {
        // Dependency completed - use its completion time
        if (!latestDependencyCompletion || depCompletion > latestDependencyCompletion) {
          latestDependencyCompletion = depCompletion;
        }
      } else if (depPlannedStart) {
        // Dependency not completed - use its planned end time
        const depPlannedEnd = new Date(depPlannedStart.getTime() + depTask.timeout * 60000);
        if (!latestDependencyCompletion || depPlannedEnd > latestDependencyCompletion) {
          latestDependencyCompletion = depPlannedEnd;
        }
      }
    }

    // Calculate adjusted start time: task starts when latest dependency completes
    // (timeout is the duration, not an offset)
    if (latestDependencyCompletion) {
      adjustedPlannedStartTimes.set(templateId, latestDependencyCompletion);
    } else {
      // Fallback to base planned start time if no dependency data
      adjustedPlannedStartTimes.set(templateId, basePlannedStartTime);
    }
  }

  // Third pass: Create processes with adjusted times
  const processes: Process[] = [];

  for (let templateId = 0; templateId < 27; templateId++) {
    const data = taskData.get(templateId);
    if (!data) continue;

    const { contractTask, taskTemplate, completionTime, submittedAt } = data;
    const adjustedPlannedStartTime = adjustedPlannedStartTimes.get(templateId) || null;

    // Create task bar for this task
    let taskBar: TaskBar;

    if (!taskTemplate) {
      // Fallback if task template not found
      taskBar = {
        id: `task-${templateId}`,
        label: `Task ${templateId}`,
        startTime: completionTime,
        endTime: completionTime,
        plannedStartTime: adjustedPlannedStartTime,
        duration: 0,
        status:
          contractTask?.status === "completed"
            ? StepStatus.Finished
            : contractTask?.status === "late"
            ? StepStatus.Finished
            : StepStatus.Standby,
        dependencies: undefined,
        submittedAt: submittedAt,
      };
    } else {
      // Determine status
      let status = StepStatus.Standby;
      if (completionTime) {
        status = StepStatus.Finished;
      } else if (contractTask && contractTask.deadline * 1000 < Date.now()) {
        status = StepStatus.InProgress;
      }

      taskBar = {
        id: `task-${templateId}`,
        label: taskTemplate.title,
        startTime: completionTime, // Use Firestore completion timestamp
        endTime: completionTime, // Same for display
        plannedStartTime: adjustedPlannedStartTime, // Use adjusted start time based on dependencies
        duration: taskTemplate.timeout, // duration equals timeout for display
        status: status,
        dependencies: taskTemplate.dependencies,
        submittedAt: submittedAt,
      };
    }

    // Calculate process duration - use actual completion time if late, otherwise planned end
    const plannedEnd = taskBar.plannedStartTime
      ? new Date(taskBar.plannedStartTime.getTime() + taskBar.duration * 60000)
      : null;
    const actualEnd = taskBar.endTime || plannedEnd;
    const maxEnd = actualEnd ? actualEnd.getTime() : 0;
    const processDuration =
      maxEnd > 0
        ? Math.round((maxEnd - scheduledArrival.getTime()) / 60000)
        : taskBar.duration;

    // Get team from contract task or fallback to task template
    const team = contractTask
      ? mapActorToTeam(contractTask.actor)
      : taskTemplate?.team || Team.GROUND_HANDLING_PROVIDER;

    processes.push({
      id: `process-${templateId}`,
      title: taskTemplate?.title || `Task ${templateId}`,
      duration: processDuration,
      team: team,
      taskBars: [taskBar],
    });
  }

  return processes;
}

export default function TurnaroundDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const { getTasks, getTurnaroundState } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const turnaroundId = params?.turnaroundId as string;
  const [loading, setLoading] = useState(true);
  const [turnaround, setTurnaround] = useState<Turnaround | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contractTasks, setContractTasks] = useState<ContractTask[]>([]);
  const [turnaroundState, setTurnaroundState] =
    useState<TurnaroundState | null>(null);
  const [loadingContractData, setLoadingContractData] = useState(false);
  const [taskCompletions, setTaskCompletions] = useState<Map<number, TaskCompletion>>(new Map());

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    }
  }, [user, authLoading, router]);

  // Load turnaround data
  useEffect(() => {
    const fetchTurnaround = async () => {
      if (!user || !turnaroundId) return;

      try {
        setLoading(true);
        const docRef = doc(db, "turnarounds", turnaroundId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTurnaround({
            id: docSnap.id,
            ...docSnap.data(),
          });
          setError(null);
        } else {
          setError("Turnaround not found");
        }
      } catch (err) {
        console.error("Error fetching turnaround:", err);
        setError("Failed to load turnaround data");
      } finally {
        setLoading(false);
      }
    };

    fetchTurnaround();
  }, [user, turnaroundId]);

  // Fetch task completions from Firestore
  useEffect(() => {
    const loadTaskCompletions = async () => {
      if (!turnaroundId || !user) return;

      try {
        const completionsMap = await fetchTaskCompletions(turnaroundId);
        setTaskCompletions(completionsMap);
      } catch (err) {
        console.error("Error fetching task completions:", err);
        // Don't set error state, just log
      }
    };

    loadTaskCompletions();
  }, [turnaroundId, user]);

  // Fetch contract tasks and state when contract address is available
  useEffect(() => {
    const fetchContractData = async () => {
      if (!turnaround?.contractAddress || !turnaround?.chainId) {
        return;
      }

      try {
        setLoadingContractData(true);
        const [tasks, state] = await Promise.all([
          getTasks(turnaround.contractAddress, turnaround.chainId),
          getTurnaroundState(turnaround.contractAddress, turnaround.chainId),
        ]);
        setContractTasks(tasks);
        setTurnaroundState(state);
      } catch (err) {
        console.error("Error fetching contract data:", err);
        // Don't set error state, just log - contract might not be deployed yet
      } finally {
        setLoadingContractData(false);
      }
    };

    fetchContractData();
  }, [turnaround?.contractAddress, turnaround?.chainId, getTasks, getTurnaroundState]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleOpenTasks = () => {
    router.push(`/turnarounds/${turnaroundId}/tasks`);
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-8">
          <H1>Turnaround Details</H1>
          <Button
            color="primary"
            onPress={handleOpenTasks}
            startContent={<CheckSquare className="w-4 h-4" />}
          >
            View Tasks
          </Button>
        </div>

        {error ? (
          <div className="space-y-4">
            <Body className="text-danger">{error}</Body>
          </div>
        ) : turnaround ? (
          <div className="space-y-6">
            <Card>
              <CardBody className="space-y-2">
                <Body>Turnaround ID: {turnaroundId}</Body>
                {turnaround.flightNumber && (
                  <Body>Flight Number: {turnaround.flightNumber}</Body>
                )}
                {turnaround.route && (
                  <Body className="whitespace-nowrap overflow-hidden text-ellipsis">
                    Route: {turnaround.route}
                  </Body>
                )}
                {turnaround.contractAddress && (
                  <Body>
                    Contract Address: {turnaround.contractAddress.slice(0, 10)}
                    ...
                    {turnaround.contractAddress.slice(-8)}
                  </Body>
                )}
              </CardBody>
            </Card>

            {/* Turnaround Flow Timeline */}
            {turnaroundState && contractTasks.length > 0 && (
              <Card>
                <CardBody>
                  <H2 className="mb-4">Turnaround Timeline</H2>
                  {loadingContractData ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : (
                    <TurnaroundFlow
                      processes={transformToProcesses(
                        contractTasks,
                        turnaroundState,
                        taskCompletions
                      )}
                      startTime={
                        new Date(turnaroundState.scheduledArrival * 1000)
                      }
                      endTime={
                        new Date(turnaroundState.scheduledDeparture * 1000)
                      }
                    />
                  )}
                </CardBody>
              </Card>
            )}

            {!turnaround.contractAddress && (
              <Card>
                <CardBody>
                  <Body className="text-gray-500">
                    Contract not deployed yet. Deploy a contract to see the
                    turnaround timeline.
                  </Body>
                </CardBody>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

