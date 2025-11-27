"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useWeb3, type Task as ContractTask, type TurnaroundState } from "../../../../contexts/Web3Context";
import { TURNAROUND_TASKS, Team } from "../../../../lib/tasks";
import { H1, H2, Body } from "../../../../components/typography";
import { CheckCircle2, Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, getToken } from "../../../../lib/firebase";
import { WalletSelector } from "../../../../components/WalletSelector";

type Turnaround = {
  id: string;
  flightNumber: string;
  contractAddress?: string;
  chainId?: number;
};

export default function TurnaroundTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { getTasks, getTurnaroundState, signEIP712TaskCompletion, markTaskCompleted, finalizeTurnaround, ensureWalletIsActive } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const turnaroundId = params?.turnaroundId as string;
  const [turnaround, setTurnaround] = useState<Turnaround | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [chainId, setChainId] = useState<number>(501);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState<Set<number>>(new Set());
  const [loadingContractTasks, setLoadingContractTasks] = useState(false);
  const [contractTasks, setContractTasks] = useState<Map<number, ContractTask>>(new Map());
  const [turnaroundState, setTurnaroundState] = useState<TurnaroundState | null>(null);
  const [loadingTurnaroundState, setLoadingTurnaroundState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [finalizing, setFinalizing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    }
  }, [user, authLoading, router]);

  // Fetch turnaround data
  useEffect(() => {
    const fetchTurnaround = async () => {
      if (!user || !turnaroundId) return;

      try {
        setLoading(true);
        const docRef = doc(db, "turnarounds", turnaroundId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const turnaroundData: Turnaround = {
            id: docSnap.id,
            flightNumber: data.flightNumber || "N/A",
            contractAddress: data.contractAddress,
            chainId: data.chainId,
          };
          setTurnaround(turnaroundData);

          // Auto-populate contract address and chain ID if available
          if (data.contractAddress && data.chainId) {
            setContractAddress(data.contractAddress);
            setChainId(data.chainId);
          }
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

  // Fetch tasks from contract when contract address and chain ID are available
  useEffect(() => {
    const fetchContractTasks = async () => {
      if (!contractAddress || !chainId) {
        return;
      }

      try {
        setLoadingContractTasks(true);
        const tasks = await getTasks(contractAddress, chainId);
        
        // Create a map keyed by templateId for easy lookup
        const tasksMap = new Map<number, ContractTask>();
        tasks.forEach((task) => {
          tasksMap.set(task.templateId, task);
        });
        
        setContractTasks(tasksMap);
      } catch (err: any) {
        console.error("Error fetching contract tasks:", err);
        // Don't set error state here, just log it - contract might not be deployed yet
      } finally {
        setLoadingContractTasks(false);
      }
    };

    fetchContractTasks();
  }, [contractAddress, chainId, getTasks]);

  // Fetch turnaround state from contract when contract address and chain ID are available
  useEffect(() => {
    const fetchTurnaroundState = async () => {
      if (!contractAddress || !chainId) {
        return;
      }

      try {
        setLoadingTurnaroundState(true);
        const state = await getTurnaroundState(contractAddress, chainId);
        setTurnaroundState(state);
      } catch (err: any) {
        console.error("Error fetching turnaround state:", err);
        // Don't set error state here, just log it - contract might not be deployed yet
      } finally {
        setLoadingTurnaroundState(false);
      }
    };

    fetchTurnaroundState();
  }, [contractAddress, chainId, getTurnaroundState]);

  const handleMarkTaskCompleted = async (taskId: number) => {
    if (!contractAddress) {
      setError("Contract address is required. Please ensure the turnaround has a deployed contract.");
      return;
    }

    if (!selectedWallet) {
      setError("Please select a wallet to sign the transaction.");
      return;
    }

    if (typeof window.ethereum === "undefined") {
      setError("MetaMask is not installed. Please install MetaMask to use this feature.");
      return;
    }

    setLoadingTasks((prev) => new Set(prev).add(taskId));
    setError(null);
    setSuccess(null);

    try {
      // Ensure the selected wallet is active in MetaMask
      await ensureWalletIsActive(selectedWallet);

      // Get current timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // Sign EIP712 message for task completion
      const eip712Signature = await signEIP712TaskCompletion(
        contractAddress,
        chainId,
        selectedWallet,
        taskId,
        turnaroundId,
        timestamp
      );

      // Prepare EIP712 message object for submission
      const eip712Message = {
        turnaroundId: turnaroundId,
        taskId: taskId,
        timestamp: timestamp,
      };

      // Submit task completion signature to backend
      const token = await getToken();
      const submitResponse = await fetch("/api/contracts/submit-task-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          turnaroundId,
          contractAddress,
          chainId,
          taskId,
          signerAddress: selectedWallet,
          signature: eip712Signature,
          message: eip712Message,
          timestamp,
        }),
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(submitData.error || "Failed to submit task completion");
      }

      // Now call markTaskCompleted on the contract
      const result = await markTaskCompleted(
        contractAddress,
        chainId,
        selectedWallet,
        taskId
      );

      setSuccess(
        `Task ${taskId} (${TURNAROUND_TASKS[taskId]?.title}) marked as completed! Transaction: ${result.transactionHash}`
      );

      // Refresh tasks and turnaround state from contract after successful completion
      if (contractAddress && chainId) {
        try {
          const [tasks, state] = await Promise.all([
            getTasks(contractAddress, chainId),
            getTurnaroundState(contractAddress, chainId),
          ]);
          const tasksMap = new Map<number, ContractTask>();
          tasks.forEach((task) => {
            tasksMap.set(task.templateId, task);
          });
          setContractTasks(tasksMap);
          setTurnaroundState(state);
        } catch (refreshErr) {
          console.error("Error refreshing tasks and state:", refreshErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoadingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const getTeamColor = (team: Team): "default" | "primary" | "success" | "warning" | "danger" => {
    switch (team) {
      case Team.GROUND_HANDLING_PROVIDER:
        return "primary";
      case Team.GATE_BOARDING_AGENTS:
        return "default";
      case Team.FUEL_CLH:
        return "warning";
      case Team.CLEANING:
        return "success";
      case Team.CATERING:
        return "default";
      case Team.FLIGHT_CREW:
        return "danger";
      default:
        return "default";
    }
  };

  const formatTeamName = (team: Team): string => {
    return team
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getTaskStatus = (taskId: number): ContractTask | null => {
    return contractTasks.get(taskId) || null;
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "warning" | "danger" => {
    switch (status) {
      case "completed":
        return "success";
      case "late":
        return "danger";
      case "cancelled":
        return "warning";
      case "pending":
      default:
        return "default";
    }
  };

  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleFinalizeTurnaround = async () => {
    if (!contractAddress) {
      setError("Contract address is required. Please ensure the turnaround has a deployed contract.");
      return;
    }

    if (!selectedWallet) {
      setError("Please select a wallet to sign the transaction.");
      return;
    }

    if (typeof window.ethereum === "undefined") {
      setError("MetaMask is not installed. Please install MetaMask to use this feature.");
      return;
    }

    setFinalizing(true);
    setError(null);
    setSuccess(null);

    try {
      // Ensure the selected wallet is active in MetaMask
      await ensureWalletIsActive(selectedWallet);

      const result = await finalizeTurnaround(contractAddress, chainId, selectedWallet);
      
      setSuccess(
        `Turnaround finalized successfully! Transaction: ${result.transactionHash}`
      );

      // Refresh tasks and turnaround state from contract after finalization
      if (contractAddress && chainId) {
        try {
          const [tasks, state] = await Promise.all([
            getTasks(contractAddress, chainId),
            getTurnaroundState(contractAddress, chainId),
          ]);
          const tasksMap = new Map<number, ContractTask>();
          tasks.forEach((task) => {
            tasksMap.set(task.templateId, task);
          });
          setContractTasks(tasksMap);
          setTurnaroundState(state);
        } catch (refreshErr) {
          console.error("Error refreshing tasks and state:", refreshErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while finalizing the turnaround");
    } finally {
      setFinalizing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!turnaround) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8 mt-8">
          <H1 className="mb-6">Turnaround Tasks</H1>
          <Card>
            <CardBody>
              <Body className="text-danger">
                {error || "Turnaround not found"}
              </Body>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 mt-8">
        <H1 className="mb-6">
          Turnaround Tasks - {turnaround.flightNumber}
        </H1>

        {/* Configuration Card */}
        <Card className="mb-6">
          <CardBody className="space-y-4">
            <WalletSelector
              selectedWallet={selectedWallet}
              onWalletChange={setSelectedWallet}
              enabled={!!user}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contract Address"
                placeholder="0x..."
                value={contractAddress}
                onValueChange={setContractAddress}
                isDisabled={!!turnaround.contractAddress}
                description={
                  turnaround.contractAddress
                    ? "Auto-filled from turnaround"
                    : "Enter contract address manually"
                }
              />

              <Select
                label="Chain ID"
                selectedKeys={chainId ? [chainId.toString()] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setChainId(selected ? parseInt(selected) : 501);
                }}
                isDisabled={!!turnaround.chainId}
                description={
                  turnaround.chainId
                    ? "Auto-filled from turnaround"
                    : "Select chain ID"
                }
              >
                <SelectItem key="500">500 - Camino</SelectItem>
                <SelectItem key="501">501 - Columbus (Testnet)</SelectItem>
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* Messages */}
        {error && (
          <Card className="mb-6 border-danger">
            <CardBody>
              <Body className="text-danger">{error}</Body>
            </CardBody>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-success">
            <CardBody>
              <Body className="text-success">{success}</Body>
            </CardBody>
          </Card>
        )}

        {/* Turnaround Status */}
        {turnaroundState && (
          <Card className="mb-6">
            <CardBody>
              <div className="flex justify-between items-center">
                <div>
                  <H2 className="mb-2">Turnaround Status</H2>
                  <div className="space-y-1">
                    <Body>
                      Status:{" "}
                      <Chip
                        size="sm"
                        color={turnaroundState.certified ? "success" : "warning"}
                        variant="flat"
                      >
                        {turnaroundState.certified ? "Certified" : "In Progress"}
                      </Chip>
                    </Body>
                    <Body className="text-sm text-gray-600 dark:text-gray-400">
                      Tasks: {turnaroundState.onTimeTasks} on time, {turnaroundState.lateTasks} late
                      {turnaroundState.slaBreached && (
                        <span className="text-danger ml-2">(SLA Breached)</span>
                      )}
                    </Body>
                  </div>
                </div>
                {turnaroundState.certified ? (
                  <Chip color="success" variant="flat" size="lg">
                    ✓ Finalized
                  </Chip>
                ) : (
                  <Button
                    color="success"
                    size="lg"
                    onPress={handleFinalizeTurnaround}
                    isDisabled={!contractAddress || !selectedWallet || finalizing}
                    isLoading={finalizing}
                  >
                    {finalizing ? "Finalizing..." : "Finalize Turnaround"}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <H2>All Tasks ({TURNAROUND_TASKS.length})</H2>
          </CardHeader>
          <CardBody>
            <Table aria-label="Turnaround tasks table">
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>TASK</TableColumn>
                <TableColumn>TEAM</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>DURATION</TableColumn>
                <TableColumn>DEPENDENCIES</TableColumn>
                <TableColumn>ACTION</TableColumn>
              </TableHeader>
              <TableBody>
                {loadingContractTasks && contractTasks.size === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <Spinner size="sm" />
                      <Body className="ml-2">Loading task status from contract...</Body>
                    </TableCell>
                  </TableRow>
                ) : (
                  TURNAROUND_TASKS.map((task) => {
                    const contractTask = getTaskStatus(task.id);
                    const isCompleted = contractTask?.status === "completed";
                    const taskStatus = contractTask?.status || "pending";

                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Chip size="sm" variant="flat">
                            {task.id}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <Body className="font-semibold">{task.title}</Body>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="sm"
                            color={getTeamColor(task.team)}
                            variant="flat"
                          >
                            {formatTeamName(task.team)}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="sm"
                            color={getStatusColor(taskStatus)}
                            variant="flat"
                          >
                            {formatStatus(taskStatus)}
                          </Chip>
                          {contractTask?.completedAt && contractTask.completedAt > 0 && (
                            <Body className="text-xs text-gray-500 mt-1">
                              Completed: {new Date(contractTask.completedAt * 1000).toLocaleString()}
                            </Body>
                          )}
                        </TableCell>
                        <TableCell>
                          <Body>{task.duration} min</Body>
                        </TableCell>
                        <TableCell>
                          {task.dependencies && task.dependencies.length > 0 ? (
                            <Body className="text-sm text-gray-500">
                              {task.dependencies.join(", ")}
                            </Body>
                          ) : (
                            <Body className="text-sm text-gray-400">None</Body>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onPress={() => handleMarkTaskCompleted(task.id)}
                            isDisabled={
                              !contractAddress ||
                              !selectedWallet ||
                              loadingTasks.has(task.id) ||
                              isCompleted
                            }
                            isLoading={loadingTasks.has(task.id)}
                            startContent={
                              loadingTasks.has(task.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )
                            }
                          >
                            {isCompleted ? "Completed" : "Mark Complete"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

