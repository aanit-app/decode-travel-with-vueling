import { NextResponse } from "next/server";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type ApiError = {
  message: string;
  code?: string;
  details?: JsonValue;
};

/**
 * Creates a success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Creates an error response
 */
export function errorResponse(
  error: ApiError | string,
  status: number = 500
) {
  const errorData: ApiError =
    typeof error === "string" ? { message: error } : error;

  return NextResponse.json(
    {
      error: errorData.message,
      code: errorData.code,
      details: errorData.details,
    },
    { status }
  );
}

/**
 * Common HTTP status codes
 */
export const StatusCode = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Validates request body and returns parsed JSON
 */
export async function parseRequestBody<T extends JsonValue = JsonValue>(
  request: Request
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new Error("Invalid JSON in request body");
  }
}

