import { NextResponse } from "next/server";
import { flights } from "../route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ flightNumber: string }> }
) {
  const { flightNumber } = await params;
  const flight = flights.find((f) => f.flight === flightNumber);

  if (!flight) {
    return NextResponse.json(
      { error: "Flight not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(flight, { status: 200 });
}

