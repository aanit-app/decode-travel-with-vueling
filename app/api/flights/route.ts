import { NextResponse } from "next/server";

export enum CertificateStatus {
  Pending = "pending",
  Issued = "issued",
}

export enum TATStatus {
  OnTime = "on time",
  Cancelled = "cancelled",
  Delayed = "delayed",
}

export type Flight = {
  flight: string;
  route: string;
  sta: string; // ISO 8601 string
  std: string; // ISO 8601 string
  progress: number;
  tatStatus: TATStatus;
  cert: CertificateStatus;
  risk: string;
};

// Mock flights data - in a real app, this would come from a database
export const flights: Flight[] = [
  {
    flight: "VY1234",
    route: "BCN → MAD",
    sta: "2025-11-26T14:30:00Z",
    std: "2025-11-26T15:00:00Z",
    progress: 75,
    tatStatus: TATStatus.OnTime,
    cert: CertificateStatus.Issued,
    risk: "Low",
  },
  {
    flight: "VY5678",
    route: "MAD → LHR",
    sta: "2025-11-26T16:45:00Z",
    std: "2025-11-26T17:15:00Z",
    progress: 45,
    tatStatus: TATStatus.Delayed,
    cert: CertificateStatus.Pending,
    risk: "Medium",
  },
  {
    flight: "VY9012",
    route: "BCN → CDG",
    sta: "2025-11-26T18:20:00Z",
    std: "2025-11-26T18:50:00Z",
    progress: 90,
    tatStatus: TATStatus.OnTime,
    cert: CertificateStatus.Issued,
    risk: "Low",
  },
  {
    flight: "VY3456",
    route: "MAD → FCO",
    sta: "2025-11-26T20:10:00Z",
    std: "2025-11-26T20:40:00Z",
    progress: 30,
    tatStatus: TATStatus.Cancelled,
    cert: CertificateStatus.Pending,
    risk: "High",
  },
  {
    flight: "VY7890",
    route: "BCN → AMS",
    sta: "2025-11-26T22:00:00Z",
    std: "2025-11-26T22:30:00Z",
    progress: 100,
    tatStatus: TATStatus.OnTime,
    cert: CertificateStatus.Issued,
    risk: "Low",
  },
];

export async function GET() {
  return NextResponse.json(flights, { status: 200 });
}

