import { NextRequest, NextResponse } from "next/server";

// GET handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  return NextResponse.json(
    {
      message: "This is an example API endpoint",
      query: query || null,
      method: "GET",
    },
    { status: 200 }
  );
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json(
      {
        message: "Data received successfully",
        data: body,
        method: "POST",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON in request body",
      },
      { status: 400 }
    );
  }
}

