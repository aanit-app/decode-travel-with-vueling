"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Progress,
  Chip,
  Spinner,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  useDisclosure,
} from "@heroui/react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { useAuth } from "./contexts/AuthContext";
import { useWeb3 } from "./contexts/Web3Context";
import { H2, Body } from "./components/typography";
import { Search, ExternalLink } from "lucide-react";
import { getExplorerUrl } from "./lib/blockchain";
import { CreateTurnaroundModal } from "./components/CreateTurnaroundModal";
import { CreateFlightModal } from "./components/CreateFlightModal";
import {
  fetchTaskCompletions,
  calculateProgress,
  calculateTATStatus,
  TATStatus,
} from "./lib/turnaround-utils";

export enum CertificateStatus {
  Pending = "pending",
  Issued = "issued",
}

// TATStatus is now imported from ./lib/turnaround-utils
// Re-export for backward compatibility
export { TATStatus } from "./lib/turnaround-utils";

type TurnaroundFirestore = {
  turnaroundId?: string;
  flight: string;
  route: string;
  sta: Timestamp;
  std: Timestamp;
  progress: number;
  tatStatus: TATStatus;
  cert: CertificateStatus;
  risk: string;
  contractAddress?: string;
  chainId?: number;
  aircraftId?: string;
};

type Turnaround = {
  id: string;
  turnaroundId?: string;
  flight: string;
  route: string;
  sta: Date;
  std: Date;
  progress: number;
  tatStatus: TATStatus;
  cert: CertificateStatus;
  risk: string;
  contractAddress?: string;
  chainId?: number;
  aircraftId?: string;
};

// Format Date to time string for display
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { isConnected, getTurnaroundState } = useWeb3();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [turnarounds, setTurnarounds] = useState<Turnaround[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isFlightModalOpen,
    onOpen: onFlightModalOpen,
    onClose: onFlightModalClose,
  } = useDisclosure();
  const {
    isOpen: isProviderModalOpen,
    onOpen: onProviderModalOpen,
    onClose: onProviderModalClose,
  } = useDisclosure();
  // Available flights for dropdown (from flights collection)
  const [availableFlights, setAvailableFlights] = useState<any[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(false);

  // Available providers for dropdown (from providers collection)
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Provider form state
  const [providerFormData, setProviderFormData] = useState({
    name: "",
    walletAddress: "",
  });
  const [isProviderSubmitting, setIsProviderSubmitting] = useState(false);
  const [providerSubmitError, setProviderSubmitError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!authLoading) {
      const isSignedIn = user || isConnected;
      if (!isSignedIn) {
        router.push("/signin");
      }
    }
  }, [user, isConnected, authLoading, router]);

  const fetchTurnarounds = async () => {
    try {
      setLoading(true);
      const turnaroundsRef = collection(db, "turnarounds");
      const snapshot = await getDocs(turnaroundsRef);

      // Convert Firestore documents to Turnaround objects and fetch task completions
      const turnaroundsDataPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data() as TurnaroundFirestore;
        const turnaroundId = doc.id;

        // Fetch task completions to calculate progress and status
        let progress = data.progress; // Fallback to stored progress
        let tatStatus = data.tatStatus; // Fallback to stored status
        let cert = data.cert; // Fallback to stored cert status
        
        try {
          const taskCompletions = await fetchTaskCompletions(turnaroundId);
          progress = calculateProgress(taskCompletions);
          
          // Calculate TAT status based on maximum turnaround duration
          const staDate = data.sta.toDate();
          tatStatus = calculateTATStatus(staDate, taskCompletions);
        } catch (err) {
          console.error(`Error fetching task completions for ${turnaroundId}:`, err);
          // Use stored values if fetching fails
        }

        // Check if turnaround is certified/finalized from contract
        if (data.contractAddress && data.chainId && getTurnaroundState) {
          try {
            const turnaroundState = await getTurnaroundState(
              data.contractAddress,
              data.chainId
            );
            // If certified, update cert status to issued
            if (turnaroundState.certified) {
              cert = CertificateStatus.Issued;
            }
          } catch (err) {
            console.error(`Error fetching turnaround state for ${turnaroundId}:`, err);
            // Keep stored cert status if contract fetch fails
          }
        }

        return {
          id: doc.id,
          turnaroundId: data.turnaroundId,
          flight: data.flight,
          route: data.route,
          sta: data.sta.toDate(),
          std: data.std.toDate(),
          progress: progress,
          tatStatus: tatStatus,
          cert: cert,
          risk: data.risk,
          contractAddress: data.contractAddress,
          chainId: data.chainId,
          aircraftId: data.aircraftId,
        };
      });

      const turnaroundsData = await Promise.all(turnaroundsDataPromises);

      setTurnarounds(turnaroundsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching turnarounds:", err);
      setError("An error occurred while fetching turnarounds");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableFlights = async () => {
    try {
      setLoadingFlights(true);
      const flightsRef = collection(db, "flights");
      const snapshot = await getDocs(flightsRef);

      // Convert Firestore documents to flight objects
      const flightsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          flightNumber: data.flightNumber,
          departureAirport: data.departureAirport,
          arrivalAirport: data.arrivalAirport,
          departureTime: data.departureTime?.toDate(),
          arrivalTime: data.arrivalTime?.toDate(),
          duration: data.duration,
        };
      });

      setAvailableFlights(flightsData);
    } catch (err) {
      console.error("Error fetching available flights:", err);
    } finally {
      setLoadingFlights(false);
    }
  };

  const fetchAvailableProviders = async () => {
    try {
      setLoadingProviders(true);
      const providersRef = collection(db, "providers");
      const snapshot = await getDocs(providersRef);

      // Convert Firestore documents to provider objects
      const providersData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          walletAddress: data.walletAddress,
        };
      });

      setAvailableProviders(providersData);
    } catch (err) {
      console.error("Error fetching available providers:", err);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (user || isConnected) {
      fetchTurnarounds();
      fetchAvailableFlights();
      fetchAvailableProviders();
    }
  }, [user, isConnected]);

  // Fetch available flights and providers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableFlights();
      fetchAvailableProviders();
    }
  }, [isOpen]);


  const handleCreateProvider = async () => {
    setProviderSubmitError(null);

    // Validation
    if (!providerFormData.name || !providerFormData.walletAddress) {
      setProviderSubmitError("Name and wallet address are required");
      return;
    }

    // Basic wallet address validation (Ethereum address format)
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(providerFormData.walletAddress)) {
      setProviderSubmitError("Invalid wallet address format");
      return;
    }

    try {
      setIsProviderSubmitting(true);

      const providerData = {
        name: providerFormData.name,
        walletAddress: providerFormData.walletAddress.toLowerCase(),
      };

      await addDoc(collection(db, "providers"), providerData);

      // Reset form and close modal
      setProviderFormData({
        name: "",
        walletAddress: "",
      });
      onProviderModalClose();

      // Refresh available providers list
      await fetchAvailableProviders();
    } catch (err) {
      console.error("Error creating provider:", err);
      setProviderSubmitError("Failed to create provider. Please try again.");
    } finally {
      setIsProviderSubmitting(false);
    }
  };

  const filteredTurnarounds = turnarounds.filter(
    (turnaround) =>
      turnaround.flight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turnaround.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskColor = (
    risk: string
  ): "success" | "warning" | "danger" | "default" => {
    switch (risk.toLowerCase()) {
      case "low":
        return "success";
      case "medium":
        return "warning";
      case "high":
        return "danger";
      default:
        return "default";
    }
  };

  const getTatStatusColor = (
    status: TATStatus
  ): "success" | "danger" | "default" => {
    switch (status) {
      case TATStatus.OnTime:
        return "success";
      case TATStatus.Delayed:
        return "danger";
      case TATStatus.Cancelled:
        return "default";
      default:
        return "default";
    }
  };

  const getCertColor = (cert: CertificateStatus): "success" | "warning" => {
    switch (cert) {
      case CertificateStatus.Issued:
        return "success";
      case CertificateStatus.Pending:
        return "warning";
      default:
        return "warning";
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Don't render content if not signed in (redirect will happen)
  if (!user && !isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between w-full mb-6 mt-8">
          <H2>Turnaround Checklists</H2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search turnarounds or routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="w-4 h-4" />}
              className="max-w-sm"
            />
            <Button
              variant="bordered"
              onPress={onProviderModalOpen}
              className="text-sm w-auto px-8"
            >
              Add Provider
            </Button>
            <Button
              variant="bordered"
              onPress={onFlightModalOpen}
              className="text-sm w-auto px-8"
            >
              Add Flight
            </Button>
            <Button
              color="primary"
              onPress={onOpen}
              className="text-sm w-auto px-8"
            >
              Create New
            </Button>
          </div>
        </div>
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <Body className="text-danger">{error}</Body>
            </div>
          ) : filteredTurnarounds.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Body className="text-gray-500 dark:text-gray-400">
                No turnarounds found
              </Body>
            </div>
          ) : (
            <Table
              aria-label="Turnarounds table"
              selectionMode="single"
              onRowAction={(key) => {
                const turnaround = filteredTurnarounds.find((t) => t.id === key);
                if (turnaround?.turnaroundId) {
                  router.push(`/turnarounds/${turnaround.turnaroundId}`);
                }
              }}
            >
              <TableHeader>
                <TableColumn>FLIGHT</TableColumn>
                <TableColumn width={100}>TURNAROUND</TableColumn>
                <TableColumn>AIRCRAFT ID</TableColumn>
                <TableColumn>ROUTE</TableColumn>
                <TableColumn>STA</TableColumn>
                <TableColumn>STD</TableColumn>
                <TableColumn>PROGRESS</TableColumn>
                <TableColumn>TAT STATUS</TableColumn>
                <TableColumn>RISK</TableColumn>
                <TableColumn>CERTIFICATE</TableColumn>
                <TableColumn width={50}> </TableColumn>
              </TableHeader>
               <TableBody items={filteredTurnarounds}>
                 {(turnaround) => (
                   <TableRow key={turnaround.id} className="cursor-pointer">
                    <TableCell>
                      <span className="font-semibold">{turnaround.flight}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold block max-w-[100px] truncate" title={turnaround.turnaroundId || turnaround.id}>
                        {turnaround.turnaroundId || turnaround.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      {turnaround.aircraftId ? (
                        <span className="text-gray-600 dark:text-gray-400">
                          {turnaround.aircraftId}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{turnaround.route}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatTime(turnaround.sta)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatTime(turnaround.std)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <Progress
                          value={turnaround.progress}
                          className="flex-1"
                          color={
                            turnaround.progress >= 75
                              ? "success"
                              : turnaround.progress >= 50
                              ? "warning"
                              : "danger"
                          }
                        />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[35px]">
                          {turnaround.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={getTatStatusColor(turnaround.tatStatus)}
                        variant="flat"
                        className="capitalize"
                      >
                        {turnaround.tatStatus}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={getRiskColor(turnaround.risk)}
                        variant="flat"
                        className="uppercase"
                      >
                        {turnaround.risk}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={getCertColor(turnaround.cert)}
                        variant="flat"
                        className="capitalize"
                      >
                        {turnaround.cert}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {turnaround.contractAddress && turnaround.chainId ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              getExplorerUrl(
                                turnaround.chainId!,
                                turnaround.contractAddress!
                              ),
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                          className="cursor-pointer hover:opacity-70 transition-opacity inline-flex"
                        >
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <CreateTurnaroundModal
        isOpen={isOpen}
        onClose={onClose}
        availableFlights={availableFlights}
        availableProviders={availableProviders}
        loadingFlights={loadingFlights}
        loadingProviders={loadingProviders}
        onSuccess={fetchTurnarounds}
      />

      <CreateFlightModal
        isOpen={isFlightModalOpen}
        onClose={onFlightModalClose}
        onSuccess={fetchAvailableFlights}
      />

      {/* Provider Creation Modal */}
      <Modal
        isOpen={isProviderModalOpen}
        onClose={onProviderModalClose}
        placement="center"
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <H2 className="text-xl">Add New Provider</H2>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Provider Name"
                    placeholder="e.g., Ground Services Inc."
                    value={providerFormData.name}
                    onChange={(e) =>
                      setProviderFormData({
                        ...providerFormData,
                        name: e.target.value,
                      })
                    }
                    isRequired
                  />
                  <Input
                    label="Wallet Address"
                    placeholder="0x..."
                    value={providerFormData.walletAddress}
                    onChange={(e) =>
                      setProviderFormData({
                        ...providerFormData,
                        walletAddress: e.target.value,
                      })
                    }
                    isRequired
                    description="Ethereum wallet address (0x followed by 40 hex characters)"
                  />

                  {providerSubmitError && (
                    <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">
                      {providerSubmitError}
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  isDisabled={isProviderSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateProvider}
                  isLoading={isProviderSubmitting}
                >
                  Add Provider
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
