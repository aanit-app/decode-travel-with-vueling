"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  flightsCompleted: number;
  avgTurnaroundTime: number;
  efficiency: number;
};

// Mock leaderboard data
const leaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Maria García",
    score: 9850,
    flightsCompleted: 142,
    avgTurnaroundTime: 28,
    efficiency: 98,
  },
  {
    rank: 2,
    name: "John Smith",
    score: 9720,
    flightsCompleted: 138,
    avgTurnaroundTime: 29,
    efficiency: 97,
  },
  {
    rank: 3,
    name: "Anna Müller",
    score: 9650,
    flightsCompleted: 135,
    avgTurnaroundTime: 30,
    efficiency: 96,
  },
  {
    rank: 4,
    name: "Carlos Rodriguez",
    score: 9420,
    flightsCompleted: 128,
    avgTurnaroundTime: 31,
    efficiency: 94,
  },
  {
    rank: 5,
    name: "Sophie Dubois",
    score: 9280,
    flightsCompleted: 125,
    avgTurnaroundTime: 32,
    efficiency: 93,
  },
  {
    rank: 6,
    name: "Luca Bianchi",
    score: 9150,
    flightsCompleted: 122,
    avgTurnaroundTime: 33,
    efficiency: 92,
  },
  {
    rank: 7,
    name: "Emma Johnson",
    score: 9020,
    flightsCompleted: 120,
    avgTurnaroundTime: 34,
    efficiency: 91,
  },
  {
    rank: 8,
    name: "David Lee",
    score: 8890,
    flightsCompleted: 118,
    avgTurnaroundTime: 35,
    efficiency: 90,
  },
  {
    rank: 9,
    name: "Isabella Rossi",
    score: 8760,
    flightsCompleted: 115,
    avgTurnaroundTime: 36,
    efficiency: 89,
  },
  {
    rank: 10,
    name: "Thomas Anderson",
    score: 8630,
    flightsCompleted: 112,
    avgTurnaroundTime: 37,
    efficiency: 88,
  },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600" />;
    default:
      return <Award className="h-5 w-5 text-muted-foreground" />;
  }
};

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case 2:
      return "bg-gray-400/20 text-gray-700 dark:text-gray-400 border-gray-400/30";
    case 3:
      return "bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              ← Back to Flights
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">Leaderboard</h2>
          </div>
          <p className="text-muted-foreground">
            Top performers based on flight turnaround efficiency and completion rate
          </p>
        </div>

        <div className="rounded-2xl bg-card shadow-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-muted/80 to-muted/40 px-8 py-6">
            <h3 className="text-xl font-semibold">Top Performers</h3>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/10 dark:bg-primary/20">
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Rank
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Name
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Score
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Flights Completed
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Avg Turnaround Time
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry) => (
                  <tr
                    key={entry.rank}
                    className="transition-all hover:bg-muted/60 even:bg-muted/40 odd:bg-card border-b border-border/10 last:border-b-0"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        {getRankIcon(entry.rank)}
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getRankBadgeColor(
                            entry.rank
                          )}`}
                        >
                          #{entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-semibold">
                      {entry.name}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-primary">
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm">{entry.flightsCompleted}</td>
                    <td className="px-8 py-5 text-sm">
                      <span className="font-medium">{entry.avgTurnaroundTime} min</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all rounded-full"
                            style={{ width: `${entry.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold min-w-12">
                          {entry.efficiency}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

