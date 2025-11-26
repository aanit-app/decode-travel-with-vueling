"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type ApiResponse = {
  data?: JsonValue;
  error?: string;
  loading: boolean;
};

export default function Home() {
  const [healthResponse, setHealthResponse] = useState<ApiResponse>({
    loading: false,
  });
  const [exampleGetResponse, setExampleGetResponse] = useState<ApiResponse>({
    loading: false,
  });
  const [examplePostResponse, setExamplePostResponse] = useState<ApiResponse>({
    loading: false,
  });

  const testHealth = async () => {
    setHealthResponse({ loading: true });
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealthResponse({ data, loading: false });
    } catch (error) {
      setHealthResponse({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  };

  const testExampleGet = async () => {
    setExampleGetResponse({ loading: true });
    try {
      const response = await fetch("/api/example?query=test");
      const data = await response.json();
      setExampleGetResponse({ data, loading: false });
    } catch (error) {
      setExampleGetResponse({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  };

  const testExamplePost = async () => {
    setExamplePostResponse({ loading: true });
    try {
      const response = await fetch("/api/example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test User",
          message: "Hello from the frontend!",
        }),
      });
      const data = await response.json();
      setExamplePostResponse({ data, loading: false });
    } catch (error) {
      setExamplePostResponse({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              API Testing Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Test your API endpoints with interactive buttons
            </p>
          </div>

          {/* API Test Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Health Check */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="mb-2 text-xl font-semibold">Health Check</h2>
                <p className="text-sm text-muted-foreground">
                  GET /api/health
                </p>
              </div>
              <Button
                onClick={testHealth}
                disabled={healthResponse.loading}
                className="w-full"
              >
                {healthResponse.loading ? "Testing..." : "Test Health"}
              </Button>
              {healthResponse.data !== undefined && (
                <div className="mt-4 rounded-md bg-muted p-3">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(healthResponse.data, null, 2)}
                  </pre>
                </div>
              )}
              {healthResponse.error && (
                <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Error: {healthResponse.error}
                </div>
              )}
            </div>

            {/* Example GET */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="mb-2 text-xl font-semibold">Example GET</h2>
                <p className="text-sm text-muted-foreground">
                  GET /api/example?query=test
                </p>
              </div>
              <Button
                onClick={testExampleGet}
                disabled={exampleGetResponse.loading}
                variant="outline"
                className="w-full"
              >
                {exampleGetResponse.loading ? "Testing..." : "Test GET"}
              </Button>
              {exampleGetResponse.data !== undefined && (
                <div className="mt-4 rounded-md bg-muted p-3">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(exampleGetResponse.data, null, 2)}
                  </pre>
                </div>
              )}
              {exampleGetResponse.error && (
                <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Error: {exampleGetResponse.error}
                </div>
              )}
            </div>

            {/* Example POST */}
            <div className="rounded-lg border bg-card p-6 shadow-sm md:col-span-2">
              <div className="mb-4">
                <h2 className="mb-2 text-xl font-semibold">Example POST</h2>
                <p className="text-sm text-muted-foreground">
                  POST /api/example
                </p>
              </div>
              <Button
                onClick={testExamplePost}
                disabled={examplePostResponse.loading}
                variant="secondary"
                className="w-full"
              >
                {examplePostResponse.loading ? "Testing..." : "Test POST"}
              </Button>
              {examplePostResponse.data !== undefined && (
                <div className="mt-4 rounded-md bg-muted p-3">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(examplePostResponse.data, null, 2)}
                  </pre>
                </div>
              )}
              {examplePostResponse.error && (
                <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Error: {examplePostResponse.error}
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 rounded-lg border bg-muted/50 p-6">
            <h3 className="mb-2 font-semibold">About</h3>
            <p className="text-sm text-muted-foreground">
              This dashboard allows you to test your API endpoints. Each button
              sends a request to the corresponding endpoint and displays the
              response below. All endpoints are located in the{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-xs">
                app/api
              </code>{" "}
              directory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
