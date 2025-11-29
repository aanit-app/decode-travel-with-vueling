"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
} from "@heroui/react";
import { useAuth } from "../../contexts/AuthContext";
import { H2, Body } from "../../components/typography";

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      const isSignedIn = user;
      if (!isSignedIn) {
        router.push("/signin");
      }
    }
  }, [user, authLoading, router]);

  // Mock data for the leaderboard
  const mockLeaderboardData = [
    {
      rank: 1,
      provider: "Ground Services Inc.",
      totalTasks: 245,
      onTimeRate: 98.5,
      lateTasks: 4,
      avgDelay: 2.3,
      turnarounds: 12,
    },
    {
      rank: 2,
      provider: "AeroClean Solutions",
      totalTasks: 189,
      onTimeRate: 96.2,
      lateTasks: 7,
      avgDelay: 3.1,
      turnarounds: 9,
    },
    {
      rank: 3,
      provider: "FuelPro Logistics",
      totalTasks: 167,
      onTimeRate: 94.8,
      lateTasks: 9,
      avgDelay: 4.2,
      turnarounds: 8,
    },
    {
      rank: 4,
      provider: "Catering Express",
      totalTasks: 142,
      onTimeRate: 92.1,
      lateTasks: 11,
      avgDelay: 5.5,
      turnarounds: 7,
    },
    {
      rank: 5,
      provider: "Gate Management Co.",
      totalTasks: 128,
      onTimeRate: 89.3,
      lateTasks: 14,
      avgDelay: 6.8,
      turnarounds: 6,
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <H2 className="mb-6 mt-8">Leaderboard</H2>

        <Table aria-label="Provider leaderboard">
          <TableHeader>
            <TableColumn width={50}>RANK</TableColumn>
            <TableColumn>PROVIDER</TableColumn>
            <TableColumn>TOTAL TASKS</TableColumn>
            <TableColumn>ON-TIME RATE</TableColumn>
            <TableColumn>LATE TASKS</TableColumn>
            <TableColumn>AVG DELAY</TableColumn>
            <TableColumn>TURNAROUNDS</TableColumn>
          </TableHeader>
          <TableBody>
            {mockLeaderboardData.map((entry) => (
              <TableRow key={entry.rank}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                    {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                    {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                    <span className="font-bold text-lg">{entry.rank}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{entry.provider}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{entry.totalTasks}</span>
                </TableCell>
                <TableCell>
                  <Chip
                    color={
                      entry.onTimeRate >= 95
                        ? "success"
                        : entry.onTimeRate >= 80
                        ? "warning"
                        : "danger"
                    }
                    variant="flat"
                  >
                    {entry.onTimeRate.toFixed(1)}%
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="text-danger">{entry.lateTasks}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-600 dark:text-gray-400">
                    {entry.avgDelay.toFixed(1)} min
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{entry.turnarounds}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
