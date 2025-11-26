"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { TurnaroundFlow } from "@/components/turnaround-flow";
import { getTurnaroundProcesses } from "@/lib/turnaround-processes";

enum CertificateStatus {
  Pending = "pending",
  Issued = "issued",
}

enum TATStatus {
  OnTime = "on time",
  Cancelled = "cancelled",
  Delayed = "delayed",
}

type FlightApiResponse = {
  flight: string;
  route: string;
  sta: string; // ISO 8601 string from API
  std: string; // ISO 8601 string from API
  progress: number;
  tatStatus: TATStatus;
  cert: CertificateStatus;
  risk: string;
};

type Flight = {
  flight: string;
  route: string;
  sta: Date;
  std: Date;
  progress: number;
  tatStatus: TATStatus;
  cert: CertificateStatus;
  risk: string;
};

export default function FlightDetailPage({
  params,
}: {
  params: Promise<{ flightNumber: string }>;
}) {
  const { flightNumber } = use(params);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlight = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/flights/${flightNumber}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Flight not found");
          } else {
            setError("Failed to fetch flight data");
          }
          setFlight(null);
          return;
        }

        const data: FlightApiResponse = await response.json();
        
        // Convert ISO strings to Date objects
        const flightData: Flight = {
          ...data,
          sta: new Date(data.sta),
          std: new Date(data.std),
        };
        
        setFlight(flightData);
        setError(null);
      } catch {
        setError("An error occurred while fetching flight data");
        setFlight(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFlight();
  }, [flightNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <p className="text-muted-foreground">Loading flight data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Flight Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The flight {flightNumber} could not be found.
            </p>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "text-white dark:text-green-100 bg-green-500 dark:bg-green-600";
      case "medium":
        return "text-white dark:text-yellow-100 bg-yellow-500 dark:bg-yellow-600";
      case "high":
        return "text-white dark:text-red-100 bg-red-500 dark:bg-red-600";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getTatStatusColor = (status: TATStatus) => {
    switch (status) {
      case TATStatus.OnTime:
        return "text-green-600 dark:text-green-400";
      case TATStatus.Delayed:
        return "text-red-600 dark:text-red-400";
      case TATStatus.Cancelled:
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getCertColor = (cert: CertificateStatus) => {
    switch (cert) {
      case CertificateStatus.Issued:
        return "text-green-600 dark:text-green-400";
      case CertificateStatus.Pending:
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const [origin, destination] = flight.route.split(" → ");

  // Convert Date objects to minutes from midnight for turnaround processes
  const dateToMinutes = (date: Date): number => {
    return date.getHours() * 60 + date.getMinutes();
  };

  const arrTime = dateToMinutes(flight.sta);
  const depTime = dateToMinutes(flight.std);

  // Get turnaround processes from the separate data file
  const turnaroundProcesses = getTurnaroundProcesses(
    arrTime,
    depTime,
    flight.progress
  );
  
  // Format Date to time string for display
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  const startTime = flight.sta;
  const endTime = flight.std;
  const startTimeStr = formatTime(flight.sta);
  const endTimeStr = formatTime(flight.std);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            ← Back to Flights
          </Button>
        </Link>

        <div className="rounded-2xl bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-6 border-b border-border/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">{flight.flight}</h2>
                <p className="text-lg text-muted-foreground">{flight.route}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${getRiskColor(
                    flight.risk
                  )}`}
                >
                  {flight.risk} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Schedule */}
              <div className="rounded-lg bg-muted/30 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Schedule
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Origin</p>
                      <p className="text-lg font-semibold">{origin}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">STD</p>
                      <p className="text-lg font-semibold">{formatTime(flight.std)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Destination</p>
                      <p className="text-lg font-semibold">{destination}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">STA</p>
                      <p className="text-lg font-semibold">{formatTime(flight.sta)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="rounded-lg bg-muted/30 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Status
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">TAT Status</p>
                    <span
                      className={`text-sm font-semibold capitalize ${getTatStatusColor(
                        flight.tatStatus
                      )}`}
                    >
                      {flight.tatStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Certificate</p>
                    <span
                      className={`text-sm font-semibold capitalize ${getCertColor(
                        flight.cert
                      )}`}
                    >
                      {flight.cert}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <span className="text-sm font-semibold">{flight.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="md:col-span-2 rounded-lg bg-muted/30 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Progress
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all rounded-full"
                      style={{ width: `${flight.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold min-w-12">
                    {flight.progress}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Turnaround Process Flow */}
          <div className="mt-8">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Turnaround Process</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Timeline: {startTimeStr} → {endTimeStr}
              </p>
            </div>
            <TurnaroundFlow
              processes={turnaroundProcesses}
              startTime={startTime}
              endTime={endTime}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

