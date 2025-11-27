"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Spinner, Button } from "@heroui/react";
import { useAuth } from "../../../contexts/AuthContext";
import { H1, Body } from "../../../components/typography";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { CheckSquare } from "lucide-react";

type Turnaround = {
  id: string;
  flightNumber?: string;
  flight?: string;
  route?: string;
  contractAddress?: string;
  chainId?: number;
  [key: string]: any;
};

export default function TurnaroundDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const turnaroundId = params?.turnaroundId as string;
  const [loading, setLoading] = useState(true);
  const [turnaround, setTurnaround] = useState<Turnaround | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    }
  }, [user, authLoading, router]);

  // Load turnaround data
  useEffect(() => {
    const fetchTurnaround = async () => {
      if (!user || !turnaroundId) return;

      try {
        setLoading(true);
        const docRef = doc(db, "turnarounds", turnaroundId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTurnaround({
            id: docSnap.id,
            ...docSnap.data(),
          });
          setError(null);
        } else {
          setError("Turnaround not found");
        }
      } catch (err) {
        console.error("Error fetching turnaround:", err);
        setError("Failed to load turnaround data");
      } finally {
        setLoading(false);
      }
    };

    fetchTurnaround();
  }, [user, turnaroundId]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleOpenTasks = () => {
    router.push(`/turnarounds/${turnaroundId}/tasks`);
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-8">
          <H1>Turnaround Details</H1>
          <Button
            color="primary"
            onPress={handleOpenTasks}
            startContent={<CheckSquare className="w-4 h-4" />}
          >
            View Tasks
          </Button>
        </div>

        {error ? (
          <div className="space-y-4">
            <Body className="text-danger">{error}</Body>
          </div>
        ) : turnaround ? (
          <div className="space-y-4">
            <Body>Turnaround ID: {turnaroundId}</Body>
            {turnaround.flightNumber && (
              <Body>Flight Number: {turnaround.flightNumber}</Body>
            )}
            {turnaround.route && <Body>Route: {turnaround.route}</Body>}
            {turnaround.contractAddress && (
              <Body>
                Contract Address: {turnaround.contractAddress.slice(0, 10)}...
                {turnaround.contractAddress.slice(-8)}
              </Body>
            )}
            <Body className="text-gray-500">
              More details will be added later.
            </Body>
          </div>
        ) : null}
      </div>
    </div>
  );
}

