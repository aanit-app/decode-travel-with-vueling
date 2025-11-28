"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Divider,
  useDisclosure,
} from "@heroui/react";
import { useAuth } from "../contexts/AuthContext";
import { useWeb3 } from "../contexts/Web3Context";
import { useSettings } from "../contexts/SettingsContext";
import { getToken } from "../lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { H2, Body } from "./typography";
import { getDisplayName } from "../lib/blockchain";
import { TATStatus, CertificateStatus } from "../page";

type Flight = {
  id: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime?: Date;
  arrivalTime?: Date;
  duration?: string;
};

type Provider = {
  id: string;
  name: string;
  walletAddress: string;
};

type CreateTurnaroundModalProps = {
  isOpen: boolean;
  onClose: () => void;
  availableFlights: Flight[];
  availableProviders: Provider[];
  loadingFlights: boolean;
  loadingProviders: boolean;
  onSuccess: () => void;
};

// Format Date to time string for display
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export function CreateTurnaroundModal({
  isOpen,
  onClose,
  availableFlights,
  availableProviders,
  loadingFlights,
  loadingProviders,
  onSuccess,
}: CreateTurnaroundModalProps) {
  const { user } = useAuth();
  const { isConnected, userAddress } = useWeb3();
  const { settings, updateSettings } = useSettings();
  const {
    isOpen: isConfirmModalOpen,
    onOpen: onConfirmModalOpen,
    onClose: onConfirmModalClose,
  } = useDisclosure();

  const [formData, setFormData] = useState({
    flightFrom: "",
    flightTo: "",
    aircraftId: "",
    groundHandlingProvider: "",
    cleaningProvider: "",
    fuelProvider: "",
    cateringProvider: "",
    flightCrewProvider: "",
    gateProvider: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const [deploymentParams, setDeploymentParams] = useState<{
    chainId: number;
    opsAdmin: string;
    groundHandling: { name: string; address: string };
    cleaning: { name: string; address: string };
    fuel: { name: string; address: string };
    catering: { name: string; address: string };
    flightCrew: { name: string; address: string };
    gate: { name: string; address: string };
    turnaroundId: string;
    airport: string;
    scheduledArrival: number;
    scheduledDeparture: number;
    flightFrom: string;
    flightTo: string;
    aircraftId: string;
  } | null>(null);

  // Load default providers from settings
  const loadDefaultProviders = () => {
    if (settings.defaultProviders) {
      setFormData((prev) => ({
        ...prev,
        groundHandlingProvider:
          settings.defaultProviders!.groundHandlingProvider || "",
        cleaningProvider: settings.defaultProviders!.cleaningProvider || "",
        fuelProvider: settings.defaultProviders!.fuelProvider || "",
        cateringProvider: settings.defaultProviders!.cateringProvider || "",
        flightCrewProvider: settings.defaultProviders!.flightCrewProvider || "",
        gateProvider: settings.defaultProviders!.gateProvider || "",
      }));
    }
  };

  // Save current provider selections as defaults
  const saveDefaultProviders = () => {
    updateSettings({
      defaultProviders: {
        groundHandlingProvider: formData.groundHandlingProvider,
        cleaningProvider: formData.cleaningProvider,
        fuelProvider: formData.fuelProvider,
        cateringProvider: formData.cateringProvider,
        flightCrewProvider: formData.flightCrewProvider,
        gateProvider: formData.gateProvider,
      },
    });
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 3000);
  };

  // Check if all providers are selected
  const areAllProvidersSelected =
    formData.groundHandlingProvider &&
    formData.cleaningProvider &&
    formData.fuelProvider &&
    formData.cateringProvider &&
    formData.flightCrewProvider &&
    formData.gateProvider;

  const handleCreateTurnaround = () => {
    setSubmitError(null);

    // Validation
    if (!formData.flightFrom) {
      setSubmitError("From flight is required");
      return;
    }

    if (!formData.flightTo) {
      setSubmitError("To flight is required");
      return;
    }

    if (!formData.aircraftId) {
      setSubmitError("Aircraft ID is required");
      return;
    }

    if (
      !formData.groundHandlingProvider ||
      !formData.cleaningProvider ||
      !formData.fuelProvider ||
      !formData.cateringProvider ||
      !formData.flightCrewProvider ||
      !formData.gateProvider
    ) {
      setSubmitError("All providers are required");
      return;
    }

    // Check if wallet is connected for opsAdmin
    if (!isConnected || !userAddress) {
      setSubmitError(
        "Wallet connection is required to deploy contract. Please connect your wallet first."
      );
      return;
    }

    // Find selected flights
    const flightFrom = availableFlights.find(
      (f) => f.id === formData.flightFrom
    );
    if (!flightFrom) {
      setSubmitError("Selected from flight not found");
      return;
    }

    const flightTo = availableFlights.find((f) => f.id === formData.flightTo);
    if (!flightTo) {
      setSubmitError("Selected to flight not found");
      return;
    }

    // Find selected providers and get their wallet addresses
    const groundHandling = availableProviders.find(
      (p) => p.id === formData.groundHandlingProvider
    );
    const cleaning = availableProviders.find(
      (p) => p.id === formData.cleaningProvider
    );
    const fuel = availableProviders.find((p) => p.id === formData.fuelProvider);
    const catering = availableProviders.find(
      (p) => p.id === formData.cateringProvider
    );
    const flightCrew = availableProviders.find(
      (p) => p.id === formData.flightCrewProvider
    );
    const gate = availableProviders.find((p) => p.id === formData.gateProvider);

    if (
      !groundHandling ||
      !cleaning ||
      !fuel ||
      !catering ||
      !flightCrew ||
      !gate
    ) {
      setSubmitError("One or more selected providers not found");
      return;
    }

    // Always use 501 (Columbus testnet) as default
    const chainId = 501;

    // Get airport code (should be the same - arrival airport of from flight = departure airport of to flight)
    const airport = flightFrom.arrivalAirport || flightTo.departureAirport;

    // Generate turnaround ID: FROMFLIGHT_TOFLIGHT_AIRPORTCODE_YEAR_MONTH_DAY_HH_MM
    const staDate = flightFrom.arrivalTime!;
    const stdDate = flightTo.departureTime!;
    const year = staDate.getFullYear();
    const month = String(staDate.getMonth() + 1).padStart(2, "0");
    const day = String(staDate.getDate()).padStart(2, "0");
    const hours = String(staDate.getHours()).padStart(2, "0");
    const minutes = String(staDate.getMinutes()).padStart(2, "0");
    const turnaroundId = `${flightFrom.flightNumber}_${flightTo.flightNumber}_${airport}_${year}_${month}_${day}_${hours}_${minutes}`;

    // Convert dates to Unix timestamps (seconds since epoch)
    const scheduledArrival = Math.floor(staDate.getTime() / 1000);
    const scheduledDeparture = Math.floor(stdDate.getTime() / 1000);

    // Store deployment parameters and show confirmation modal
    setDeploymentParams({
      chainId,
      opsAdmin: userAddress,
      groundHandling: {
        name: groundHandling.name,
        address: groundHandling.walletAddress,
      },
      cleaning: { name: cleaning.name, address: cleaning.walletAddress },
      fuel: { name: fuel.name, address: fuel.walletAddress },
      catering: { name: catering.name, address: catering.walletAddress },
      flightCrew: { name: flightCrew.name, address: flightCrew.walletAddress },
      gate: { name: gate.name, address: gate.walletAddress },
      flightFrom: `${flightFrom.flightNumber} (${flightFrom.departureAirport} → ${flightFrom.arrivalAirport})`,
      flightTo: `${flightTo.flightNumber} (${flightTo.departureAirport} → ${flightTo.arrivalAirport})`,
      aircraftId: formData.aircraftId,
      turnaroundId,
      airport,
      scheduledArrival,
      scheduledDeparture,
    });

    onConfirmModalOpen();
  };

  const handleConfirmDeployment = async () => {
    if (!deploymentParams) {
      setSubmitError("Deployment parameters not found");
      return;
    }

    try {
      setIsSubmitting(true);
      onConfirmModalClose();

      // Deploy contract
      const token = await getToken();
      if (!token) {
        setSubmitError("Authentication required. Please sign in again.");
        return;
      }

      const deployResponse = await fetch("/api/contracts/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chainId: deploymentParams.chainId,
          opsAdmin: deploymentParams.opsAdmin,
          groundHandling: deploymentParams.groundHandling.address,
          cleaning: deploymentParams.cleaning.address,
          fuel: deploymentParams.fuel.address,
          catering: deploymentParams.catering.address,
          flightCrew: deploymentParams.flightCrew.address,
          gate: deploymentParams.gate.address,
          turnaroundId: deploymentParams.turnaroundId,
          airport: deploymentParams.airport,
          scheduledArrival: deploymentParams.scheduledArrival,
          scheduledDeparture: deploymentParams.scheduledDeparture,
        }),
      });

      const deployResult = await deployResponse.json();

      if (!deployResponse.ok || !deployResult.contractAddress) {
        setSubmitError(
          deployResult.error || "Failed to deploy contract. Please try again."
        );
        return;
      }

      // Find selected flights again for turnaround data
      const flightFrom = availableFlights.find(
        (f) => f.id === formData.flightFrom
      );
      const flightTo = availableFlights.find((f) => f.id === formData.flightTo);

      if (!flightFrom || !flightTo) {
        setSubmitError("Selected flights not found");
        return;
      }

      // Calculate route from flight airports
      const route = `${flightFrom.arrivalAirport} → ${flightTo.departureAirport}`;

      // Use the next flight number as the main flight identifier
      const flight = flightTo.flightNumber;

      // Use flight times for sta and std
      // STA is the arrival time of the from flight
      // STD is the departure time of the to flight
      const staDate = flightFrom.arrivalTime!;
      const stdDate = flightTo.departureTime!;

      // Get airport code (should be the same - arrival airport of from flight = departure airport of to flight)
      const airport = deploymentParams.airport;

      // Use the turnaroundId from deploymentParams (already generated in handleCreateTurnaround)
      const turnaroundId = deploymentParams.turnaroundId;

      // Use scheduled times from deploymentParams (already calculated)
      const scheduledArrival = deploymentParams.scheduledArrival;
      const scheduledDeparture = deploymentParams.scheduledDeparture;

      // Default values for derived properties
      const turnaroundData = {
        turnaroundId: turnaroundId,
        flight: flight,
        route: route,
        sta: Timestamp.fromDate(staDate),
        std: Timestamp.fromDate(stdDate),
        progress: 0,
        tatStatus: TATStatus.OnTime,
        cert: CertificateStatus.Pending,
        risk: "Low",
        aircraftId: formData.aircraftId,
        scheduledArrival: scheduledArrival,
        scheduledDeparture: scheduledDeparture,
        airport: airport,
        flightNumber: flight,
        groundHandlingProvider: formData.groundHandlingProvider,
        cleaningProvider: formData.cleaningProvider,
        fuelProvider: formData.fuelProvider,
        cateringProvider: formData.cateringProvider,
        flightCrewProvider: formData.flightCrewProvider,
        gateProvider: formData.gateProvider,
        contractAddress: deployResult.contractAddress,
        chainId: deploymentParams.chainId,
      };

      // Use turnaroundId as the document ID
      await setDoc(doc(db, "turnarounds", turnaroundId), turnaroundData);

      // Reset form and close modal
      setFormData({
        flightFrom: "",
        flightTo: "",
        aircraftId: "",
        groundHandlingProvider: "",
        cleaningProvider: "",
        fuelProvider: "",
        cateringProvider: "",
        flightCrewProvider: "",
        gateProvider: "",
      });
      setDeploymentParams(null);
      onClose();

      // Notify parent of success
      onSuccess();
    } catch (err) {
      console.error("Error creating turnaround:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to create turnaround. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      flightFrom: "",
      flightTo: "",
      aircraftId: "",
      groundHandlingProvider: "",
      cleaningProvider: "",
      fuelProvider: "",
      cateringProvider: "",
      flightCrewProvider: "",
      gateProvider: "",
    });
    setSubmitError(null);
    setDefaultsSaved(false);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        placement="center"
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <H2 className="text-xl">Create New Turnaround</H2>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Select
                    label="Flight (From)"
                    placeholder="Select the arriving flight"
                    selectedKeys={
                      formData.flightFrom ? [formData.flightFrom] : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({ ...formData, flightFrom: selected || "" });
                    }}
                    isRequired
                    description="The flight that is arriving for this turnaround"
                    isLoading={loadingFlights}
                  >
                    {availableFlights.map((flight) => (
                      <SelectItem
                        key={flight.id}
                        textValue={`${flight.flightNumber} - ${flight.departureAirport} → ${flight.arrivalAirport}`}
                      >
                        {flight.flightNumber} - {flight.departureAirport} →{" "}
                        {flight.arrivalAirport}
                        {flight.departureTime && flight.arrivalTime && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatTime(flight.departureTime)} → {formatTime(flight.arrivalTime)})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Next Flight (To)"
                    placeholder="Select the next flight"
                    selectedKeys={formData.flightTo ? [formData.flightTo] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({ ...formData, flightTo: selected || "" });
                    }}
                    isRequired
                    description="The flight for the next departure"
                    isLoading={loadingFlights}
                  >
                    {availableFlights.map((flight) => (
                      <SelectItem
                        key={flight.id}
                        textValue={`${flight.flightNumber} - ${flight.departureAirport} → ${flight.arrivalAirport}`}
                      >
                        {flight.flightNumber} - {flight.departureAirport} →{" "}
                        {flight.arrivalAirport}
                        {flight.departureTime && flight.arrivalTime && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatTime(flight.departureTime)} → {formatTime(flight.arrivalTime)})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </Select>

                  {availableFlights.length === 0 && !loadingFlights && (
                    <Body className="text-sm text-warning">
                      No flights available. Please add flights first using the
                      "Add Flight" button.
                    </Body>
                  )}

                  <Input
                    label="Aircraft ID (License Plate)"
                    placeholder="e.g., EC-ABC"
                    value={formData.aircraftId}
                    onChange={(e) =>
                      setFormData({ ...formData, aircraftId: e.target.value })
                    }
                    isRequired
                    description="The aircraft registration/license plate"
                  />

                  <Divider className="my-2" />

                  <div className="flex items-center justify-between">
                    <H2 className="text-lg">Providers</H2>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        onPress={loadDefaultProviders}
                        className="text-xs"
                      >
                        Load Defaults
                      </Button>
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={saveDefaultProviders}
                        isDisabled={!areAllProvidersSelected}
                        className="text-xs"
                      >
                        Save as Defaults
                      </Button>
                    </div>
                  </div>

                  <Select
                    label="Ground Handling Provider"
                    placeholder="Select ground handling provider"
                    selectedKeys={
                      formData.groundHandlingProvider
                        ? [formData.groundHandlingProvider]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({
                        ...formData,
                        groundHandlingProvider: selected || "",
                      });
                    }}
                    isRequired
                    isLoading={loadingProviders}
                  >
                    {availableProviders.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        textValue={`${provider.name} - ${provider.walletAddress}`}
                      >
                        {provider.name} ({provider.walletAddress.slice(0, 6)}...
                        {provider.walletAddress.slice(-4)})
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="Cleaning Provider"
                    placeholder="Select cleaning provider"
                    selectedKeys={
                      formData.cleaningProvider
                        ? [formData.cleaningProvider]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({
                        ...formData,
                        cleaningProvider: selected || "",
                      });
                    }}
                    isRequired
                    isLoading={loadingProviders}
                  >
                    {availableProviders.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        textValue={`${provider.name} - ${provider.walletAddress}`}
                      >
                        {provider.name} ({provider.walletAddress.slice(0, 6)}...
                        {provider.walletAddress.slice(-4)})
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="Fuel Provider"
                    placeholder="Select fuel provider"
                    selectedKeys={
                      formData.fuelProvider ? [formData.fuelProvider] : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({
                        ...formData,
                        fuelProvider: selected || "",
                      });
                    }}
                    isRequired
                    isLoading={loadingProviders}
                  >
                    {availableProviders.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        textValue={`${provider.name} - ${provider.walletAddress}`}
                      >
                        {provider.name} ({provider.walletAddress.slice(0, 6)}...
                        {provider.walletAddress.slice(-4)})
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="Catering Provider"
                    placeholder="Select catering provider"
                    selectedKeys={
                      formData.cateringProvider
                        ? [formData.cateringProvider]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({
                        ...formData,
                        cateringProvider: selected || "",
                      });
                    }}
                    isRequired
                    isLoading={loadingProviders}
                  >
                    {availableProviders.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        textValue={`${provider.name} - ${provider.walletAddress}`}
                      >
                        {provider.name} ({provider.walletAddress.slice(0, 6)}...
                        {provider.walletAddress.slice(-4)})
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="Flight Crew Provider"
                    placeholder="Select flight crew provider"
                    selectedKeys={
                      formData.flightCrewProvider
                        ? [formData.flightCrewProvider]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({
                        ...formData,
                        flightCrewProvider: selected || "",
                      });
                    }}
                    isRequired
                    isLoading={loadingProviders}
                  >
                    {availableProviders.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        textValue={`${provider.name} - ${provider.walletAddress}`}
                      >
                        {provider.name} ({provider.walletAddress.slice(0, 6)}...
                        {provider.walletAddress.slice(-4)})
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="Gate Provider"
                    placeholder="Select gate provider"
                    selectedKeys={
                      formData.gateProvider ? [formData.gateProvider] : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData({
                        ...formData,
                        gateProvider: selected || "",
                      });
                    }}
                    isRequired
                    isLoading={loadingProviders}
                  >
                    {availableProviders.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        textValue={`${provider.name} - ${provider.walletAddress}`}
                      >
                        {provider.name} ({provider.walletAddress.slice(0, 6)}...
                        {provider.walletAddress.slice(-4)})
                      </SelectItem>
                    ))}
                  </Select>

                  {availableProviders.length === 0 && !loadingProviders && (
                    <Body className="text-sm text-warning">
                      No providers available. Please add providers first using
                      the "Add Provider" button.
                    </Body>
                  )}

                  {defaultsSaved && (
                    <div className="text-sm text-success bg-success-50 dark:bg-success-900/20 p-3 rounded-lg">
                      Default providers saved successfully!
                    </div>
                  )}

                  {submitError && (
                    <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">
                      {submitError}
                    </div>
                  )}

                  <Body className="text-sm text-gray-600 dark:text-gray-400">
                    Note: Progress, TAT Status, Risk, and Certificate will be
                    automatically calculated based on the turnaround status.
                  </Body>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={handleClose}
                  isDisabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateTurnaround}
                  isLoading={isSubmitting}
                >
                  Create Turnaround
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Contract Deployment Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={onConfirmModalClose}
        placement="center"
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <H2 className="text-xl">Confirm Contract Deployment</H2>
              </ModalHeader>
              <ModalBody>
                {deploymentParams && (
                  <div className="flex flex-col gap-4">
                    <Body className="text-sm text-warning font-semibold">
                      Please review the deployment parameters before proceeding.
                      The contract will be deployed to{" "}
                      {getDisplayName(deploymentParams.chainId)}.
                    </Body>

                    <Divider />

                    <div className="space-y-3">
                      <div>
                        <Body className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Network
                        </Body>
                        <Body className="text-sm">
                          {getDisplayName(deploymentParams.chainId)} (Chain ID:{" "}
                          {deploymentParams.chainId})
                        </Body>
                      </div>

                      <div>
                        <Body className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Turnaround
                        </Body>
                        <Body className="text-sm font-medium">
                          Turnaround ID: {deploymentParams.turnaroundId}
                        </Body>
                      </div>

                      <div>
                        <Body className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Flights
                        </Body>
                        <Body className="text-sm">
                          From: {deploymentParams.flightFrom}
                        </Body>
                        <Body className="text-sm">
                          To: {deploymentParams.flightTo}
                        </Body>
                        <Body className="text-sm">
                          Aircraft ID: {deploymentParams.aircraftId}
                        </Body>
                        <Body className="text-sm">
                          Scheduled Arrival:{" "}
                          {new Date(
                            deploymentParams.scheduledArrival * 1000
                          ).toLocaleString()}
                        </Body>
                        <Body className="text-sm">
                          Scheduled Departure:{" "}
                          {new Date(
                            deploymentParams.scheduledDeparture * 1000
                          ).toLocaleString()}
                        </Body>
                      </div>

                      <Divider />

                      <div>
                        <Body className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Contract Roles
                        </Body>
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">
                              Ops Admin:
                            </Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.opsAdmin.slice(0, 6)}...
                              {deploymentParams.opsAdmin.slice(-4)}
                            </Body>
                          </div>
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">
                              Ground Handling:
                            </Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.groundHandling.name} (
                              {deploymentParams.groundHandling.address.slice(
                                0,
                                6
                              )}
                              ...
                              {deploymentParams.groundHandling.address.slice(
                                -4
                              )}
                              )
                            </Body>
                          </div>
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">
                              Cleaning:
                            </Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.cleaning.name} (
                              {deploymentParams.cleaning.address.slice(0, 6)}...
                              {deploymentParams.cleaning.address.slice(-4)})
                            </Body>
                          </div>
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">Fuel:</Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.fuel.name} (
                              {deploymentParams.fuel.address.slice(0, 6)}...
                              {deploymentParams.fuel.address.slice(-4)})
                            </Body>
                          </div>
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">
                              Catering:
                            </Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.catering.name} (
                              {deploymentParams.catering.address.slice(0, 6)}...
                              {deploymentParams.catering.address.slice(-4)})
                            </Body>
                          </div>
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">
                              Flight Crew:
                            </Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.flightCrew.name} (
                              {deploymentParams.flightCrew.address.slice(0, 6)}
                              ...{deploymentParams.flightCrew.address.slice(-4)}
                              )
                            </Body>
                          </div>
                          <div className="flex justify-between items-start">
                            <Body className="text-sm font-medium">Gate:</Body>
                            <Body className="text-xs text-gray-600 dark:text-gray-400 text-right break-all ml-4">
                              {deploymentParams.gate.name} (
                              {deploymentParams.gate.address.slice(0, 6)}...
                              {deploymentParams.gate.address.slice(-4)})
                            </Body>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  isDisabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmDeployment}
                  isLoading={isSubmitting}
                >
                  Confirm & Deploy Contract
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

