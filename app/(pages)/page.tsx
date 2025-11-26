"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";

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

// Format Date to time string for display
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/flights");
        
        if (!response.ok) {
          setError("Failed to fetch flights");
          return;
        }

        const data: FlightApiResponse[] = await response.json();
        
        // Convert ISO strings to Date objects
        const flightsData: Flight[] = data.map((flight) => ({
          ...flight,
          sta: new Date(flight.sta),
          std: new Date(flight.std),
        }));
        
        setFlights(flightsData);
        setError(null);
      } catch {
        setError("An error occurred while fetching flights");
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, []);

  const filteredFlights = flights.filter(
    (flight) =>
      flight.flight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <Navbar
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="rounded-2xl bg-card shadow-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-linear-to-r from-muted/80 to-muted/40 px-8 py-6">
            <h2 className="text-xl font-semibold">Flights</h2>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/10 dark:bg-primary/20">
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Flight
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Route
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    STA
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    STD
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Progress
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    TAT Status
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    RISK
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Certificate
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-8 py-12 text-center text-sm text-muted-foreground"
                    >
                      Loading flights...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-8 py-12 text-center text-sm text-red-600 dark:text-red-400"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredFlights.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-8 py-12 text-center text-sm text-muted-foreground"
                    >
                      No flights found
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((flight, index) => (
                    <tr
                      key={index}
                      className="transition-all hover:bg-muted/60 even:bg-muted/40 odd:bg-card border-b border-border/10 last:border-b-0 cursor-pointer"
                      onClick={() => router.push(`/flights/${flight.flight}`)}
                    >
                      <td className="px-8 py-5 text-sm font-semibold">
                        {flight.flight}
                      </td>
                      <td className="px-8 py-5 text-sm">{flight.route}</td>
                      <td className="px-8 py-5 text-sm font-medium">{formatTime(flight.sta)}</td>
                      <td className="px-8 py-5 text-sm font-medium">{formatTime(flight.std)}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-linear-to-r from-primary to-primary/80 transition-all rounded-full"
                              style={{ width: `${flight.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground min-w-12">
                            {flight.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`text-sm font-semibold capitalize ${getTatStatusColor(
                            flight.tatStatus
                          )}`}
                        >
                          {flight.tatStatus}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getRiskColor(
                            flight.risk
                          )}`}
                        >
                          {flight.risk}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`text-sm font-semibold ${getCertColor(
                            flight.cert
                          )}`}
                        >
                          {flight.cert}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
