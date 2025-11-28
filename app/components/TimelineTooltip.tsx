"use client";

import { Tooltip } from "@heroui/react";
import type { TaskBar, Process } from "./TurnaroundFlow";

interface TimelineTooltipProps {
  bar: TaskBar;
  process: Process;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  actualDuration: number;
  plannedStartTime: Date | null;
  plannedEndTime: Date | null;
  plannedDuration: number;
  variant: "actual" | "planned";
  children: React.ReactNode;
}

export function TimelineTooltip({
  bar,
  process,
  actualStartTime,
  actualEndTime,
  actualDuration,
  plannedStartTime,
  plannedEndTime,
  plannedDuration,
  variant,
  children,
}: TimelineTooltipProps) {
  const formatTime = (date: Date | null): string => {
    if (!date) return "N/A";
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    const secs = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${mins}:${secs}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate status and delay
  let statusText = "";
  let statusColor = "text-gray-400";
  let delayMinutes = 0;
  
  if (variant === "actual" && actualStartTime && plannedEndTime) {
    delayMinutes = Math.round((actualStartTime.getTime() - plannedEndTime.getTime()) / 60000);
    if (delayMinutes <= 0) {
      statusText = "✓ On Time";
      statusColor = "text-green-400";
    } else if (delayMinutes === 1) {
      statusText = "⚠ 1 min delay";
      statusColor = "text-yellow-400";
    } else {
      statusText = `⚠ ${delayMinutes} min delay`;
      statusColor = "text-red-400";
    }
  }

  const content = (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">{bar.label}</div>
      <div className="text-gray-300">
        <div>Process: {process.title}</div>
        <div>Team: {process.team.replace(/_/g, " ")}</div>
      </div>
      {variant === "actual" && actualStartTime && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="font-semibold text-green-400">Actual</div>
          <div>Completion: {formatTime(actualStartTime)}</div>
          {actualEndTime && actualEndTime.getTime() !== actualStartTime.getTime() && (
            <div>End: {formatTime(actualEndTime)}</div>
          )}
          <div>Duration: {formatDuration(actualDuration)}</div>
          {bar.submittedAt && (
            <div className="mt-1 pt-1 border-t border-gray-700">
              <div className="text-gray-400">Submitted: {formatTime(bar.submittedAt)}</div>
              {actualStartTime && bar.submittedAt && (
                <div className="text-gray-500 text-[10px]">
                  {Math.round((bar.submittedAt.getTime() - actualStartTime.getTime()) / 1000)}s difference
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {plannedStartTime && (
        <div className={variant === "actual" ? "mt-2 pt-2 border-t border-gray-600" : ""}>
          <div className="font-semibold text-gray-400">Planned</div>
          <div>Start: {formatTime(plannedStartTime)}</div>
          {plannedEndTime && <div>End: {formatTime(plannedEndTime)}</div>}
          <div>Duration: {formatDuration(plannedDuration)}</div>
        </div>
      )}
      {variant === "actual" && statusText && (
        <div className={`mt-2 pt-2 border-t border-gray-600 ${statusColor}`}>
          <div className="font-semibold">{statusText}</div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={content} placement="top" showArrow>
      {children}
    </Tooltip>
  );
}

