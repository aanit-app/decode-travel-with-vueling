"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StepStatus, Team, type TaskBar, type Process } from "@/components/turnaround-flow";

interface TimelineTooltipProps {
  bar: TaskBar;
  process: Process;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  actualDuration: number;
  plannedStartTime: Date | null;
  plannedEndTime: Date | null;
  plannedDuration: number;
  children: React.ReactNode;
  variant?: "actual" | "planned";
}

const getTeamDisplayName = (team: Team): string => {
  return team
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

export function TimelineTooltip({
  bar,
  process,
  actualStartTime,
  actualEndTime,
  actualDuration,
  plannedStartTime,
  plannedEndTime,
  plannedDuration,
  children,
  variant = "actual",
}: TimelineTooltipProps) {
  if (variant === "actual") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{bar.label}</p>
            <p className="text-xs text-muted-foreground">
              Status:{" "}
              {bar.status === StepStatus.Finished
                ? "Completed"
                : bar.status === StepStatus.InProgress
                ? "In Progress"
                : "Standby"}
            </p>
            <p className="text-xs text-muted-foreground">
              Team: {getTeamDisplayName(process.team)}
            </p>
            <div className="border-t border-border pt-1 mt-1">
              <p className="text-xs font-medium">Actual Duration</p>
              {actualStartTime ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Start: {formatTime(actualStartTime)}
                  </p>
                  {actualEndTime ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        End: {formatTime(actualEndTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {Math.round((actualEndTime.getTime() - actualStartTime.getTime()) / 60000)} minutes
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      End time not yet available
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Start time not yet available
                </p>
              )}
            </div>
            {process.dependencies && process.dependencies.length > 0 && (
              <div className="border-t border-border pt-1 mt-1">
                <p className="text-xs font-medium">Dependencies</p>
                <p className="text-xs text-muted-foreground">
                  {process.dependencies.join(", ")}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Planned variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-semibold">{bar.label}</p>
          <p className="text-xs text-muted-foreground">
            Team: {getTeamDisplayName(process.team)}
          </p>
          <div className="border-t border-border pt-1 mt-1">
            <p className="text-xs font-medium">Planned Duration</p>
            <p className="text-xs text-muted-foreground">
              Expected: {plannedDuration} minutes
            </p>
            {plannedStartTime ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Start: {formatTime(plannedStartTime)}
                </p>
                {plannedEndTime && (
                  <p className="text-xs text-muted-foreground">
                    End: {formatTime(plannedEndTime)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Start time not calculated
              </p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

