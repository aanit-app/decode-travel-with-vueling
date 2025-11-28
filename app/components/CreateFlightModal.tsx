"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { H2, Body } from "./typography";

interface CreateFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Calculate duration in hours and minutes
const calculateDuration = (departure: Date, arrival: Date): string => {
  const diffMs = arrival.getTime() - departure.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
};

export function CreateFlightModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFlightModalProps) {
  const [flightFormData, setFlightFormData] = useState({
    flightNumber: "",
    departureTime: "",
    arrivalTime: "",
    departureAirport: "",
    arrivalAirport: "",
  });
  const [isFlightSubmitting, setIsFlightSubmitting] = useState(false);
  const [flightSubmitError, setFlightSubmitError] = useState<string | null>(
    null
  );

  const handleCreateFlight = async () => {
    setFlightSubmitError(null);

    // Validation
    if (
      !flightFormData.flightNumber ||
      !flightFormData.departureTime ||
      !flightFormData.arrivalTime ||
      !flightFormData.departureAirport ||
      !flightFormData.arrivalAirport
    ) {
      setFlightSubmitError("Please fill in all required fields");
      return;
    }

    try {
      setIsFlightSubmitting(true);

      // Convert date strings to Date objects
      const departureDate = new Date(flightFormData.departureTime);
      const arrivalDate = new Date(flightFormData.arrivalTime);

      if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
        setFlightSubmitError("Invalid date format");
        return;
      }

      // Validate that arrival is after departure
      if (arrivalDate <= departureDate) {
        setFlightSubmitError("Arrival time must be after departure time");
        return;
      }

      // Calculate duration
      const duration = calculateDuration(departureDate, arrivalDate);

      const flightData = {
        flightNumber: flightFormData.flightNumber,
        departureTime: Timestamp.fromDate(departureDate),
        arrivalTime: Timestamp.fromDate(arrivalDate),
        departureAirport: flightFormData.departureAirport,
        arrivalAirport: flightFormData.arrivalAirport,
        duration: duration,
      };

      await addDoc(collection(db, "flights"), flightData);

      // Reset form and close modal
      setFlightFormData({
        flightNumber: "",
        departureTime: "",
        arrivalTime: "",
        departureAirport: "",
        arrivalAirport: "",
      });
      onClose();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error creating flight:", err);
      setFlightSubmitError("Failed to create flight. Please try again.");
    } finally {
      setIsFlightSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>
              <H2 className="text-xl">Add New Flight</H2>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <Input
                  label="Flight Number"
                  placeholder="e.g., VY1234"
                  value={flightFormData.flightNumber}
                  onChange={(e) =>
                    setFlightFormData({
                      ...flightFormData,
                      flightNumber: e.target.value,
                    })
                  }
                  isRequired
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Departure Airport"
                    placeholder="e.g., BCN"
                    value={flightFormData.departureAirport}
                    onChange={(e) =>
                      setFlightFormData({
                        ...flightFormData,
                        departureAirport: e.target.value,
                      })
                    }
                    isRequired
                  />
                  <Input
                    label="Arrival Airport"
                    placeholder="e.g., MAD"
                    value={flightFormData.arrivalAirport}
                    onChange={(e) =>
                      setFlightFormData({
                        ...flightFormData,
                        arrivalAirport: e.target.value,
                      })
                    }
                    isRequired
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Departure Time"
                    type="datetime-local"
                    value={flightFormData.departureTime}
                    onChange={(e) =>
                      setFlightFormData({
                        ...flightFormData,
                        departureTime: e.target.value,
                      })
                    }
                    isRequired
                  />
                  <Input
                    label="Arrival Time"
                    type="datetime-local"
                    value={flightFormData.arrivalTime}
                    onChange={(e) =>
                      setFlightFormData({
                        ...flightFormData,
                        arrivalTime: e.target.value,
                      })
                    }
                    isRequired
                  />
                </div>

                {flightFormData.departureTime &&
                  flightFormData.arrivalTime && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Body className="text-sm">
                        <span className="font-semibold">Duration: </span>
                        {(() => {
                          try {
                            const dep = new Date(
                              flightFormData.departureTime
                            );
                            const arr = new Date(flightFormData.arrivalTime);
                            if (
                              !isNaN(dep.getTime()) &&
                              !isNaN(arr.getTime()) &&
                              arr > dep
                            ) {
                              return calculateDuration(dep, arr);
                            }
                            return "Invalid times";
                          } catch {
                            return "Invalid times";
                          }
                        })()}
                      </Body>
                    </div>
                  )}

                {flightSubmitError && (
                  <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">
                    {flightSubmitError}
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isFlightSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleCreateFlight}
                isLoading={isFlightSubmitting}
              >
                Add Flight
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

