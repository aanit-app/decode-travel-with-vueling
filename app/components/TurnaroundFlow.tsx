"use client";

import { useState, useRef, useEffect } from "react";
import { Team } from "../lib/tasks";
import { TimelineTooltip } from "./TimelineTooltip";

export enum StepStatus {
  Standby = "standby",
  InProgress = "in-progress",
  Finished = "finished",
}

export type TaskBar = {
  id: string;
  label: string;
  startTime: Date | null; // actual start time (null until realtime data is provided, cannot be calculated)
  endTime: Date | null; // actual end time (null until realtime data is provided, cannot be calculated)
  plannedStartTime: Date | null; // planned/calculated start time
  duration: number; // planned duration in minutes (calculated from timeout)
  status: StepStatus;
  dependencies?: string[]; // IDs of tasks this depends on
  submittedAt?: Date | null; // actual submission time from Firestore
};

export type Process = {
  id: string;
  title: string;
  duration: number; // total duration in minutes
  team: Team; // team responsible for this process
  dependencies?: string[]; // IDs of processes this depends on
  taskBars: TaskBar[];
};

interface TurnaroundFlowProps {
  processes: Process[];
  startTime: Date; // start time of the turnaround
  endTime: Date; // end time of the turnaround
}

export function TurnaroundFlow({
  processes,
  startTime,
  endTime,
}: TurnaroundFlowProps) {
  // Convert Date to minutes from midnight for calculations
  const dateToMinutes = (date: Date): number => {
    return date.getHours() * 60 + date.getMinutes();
  };

  const startMinutes = dateToMinutes(startTime);
  const endMinutes = dateToMinutes(endTime);

  // Calculate the actual maximum time needed based on all processes
  let maxProcessTime = endMinutes;
  for (const process of processes) {
    for (const bar of process.taskBars) {
      // Use plannedStartTime if startTime is not available
      const displayStartTime = bar.startTime ?? bar.plannedStartTime;
      if (displayStartTime !== null) {
        const barStartMinutes = dateToMinutes(displayStartTime);
        const effectiveEndTime = bar.endTime
          ? dateToMinutes(bar.endTime)
          : barStartMinutes + bar.duration;
        maxProcessTime = Math.max(maxProcessTime, effectiveEndTime);
      }
    }
  }

  // Extend visualization: 5 min before start, 15 min after last task
  const VISUALIZATION_PADDING_BEFORE_MINUTES = 5;
  const VISUALIZATION_PADDING_AFTER_MINUTES = 5;
  const visualizationStartMinutes = startMinutes - VISUALIZATION_PADDING_BEFORE_MINUTES;
  const visualizationEndMinutes = maxProcessTime + VISUALIZATION_PADDING_AFTER_MINUTES;

  // Use the extended visualization range for total duration
  const totalDuration = visualizationEndMinutes - visualizationStartMinutes;

  // Fixed column width (pixels per 15-minute interval)
  const COLUMN_WIDTH_PX = 100;
  const TIME_INTERVAL_MINUTES = 15;

  // Generate time grid marks (every 15 minutes) - extend to cover visualization range
  const timeMarks: Date[] = [];
  // Round down to nearest 15-minute interval for start
  const roundedStart = Math.floor(visualizationStartMinutes / TIME_INTERVAL_MINUTES) * TIME_INTERVAL_MINUTES;
  // Round up to nearest 15-minute interval for end
  const roundedEnd = Math.ceil(visualizationEndMinutes / TIME_INTERVAL_MINUTES) * TIME_INTERVAL_MINUTES;
  
  for (let i = roundedStart; i <= roundedEnd; i += TIME_INTERVAL_MINUTES) {
    const hours = Math.floor(i / 60);
    const mins = i % 60;
    const date = new Date(startTime);
    date.setHours(hours, mins, 0, 0);
    timeMarks.push(date);
  }

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  // Calculate position and width of a bar
  // Use percentage-based positioning so it scales with container
  const getBarStyle = (barStartTime: Date, durationMinutes: number) => {
    // Calculate position in minutes from visualization start
    const barStartMinutes = dateToMinutes(barStartTime);
    const startOffsetMinutes = barStartMinutes - visualizationStartMinutes;

    // Convert to percentage of total duration
    const leftPercent = (startOffsetMinutes / totalDuration) * 100;
    const widthPercent = (durationMinutes / totalDuration) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Get color for top bar based on actual vs planned duration
  const getTopBarColor = (actualDuration: number, plannedDuration: number) => {
    if (actualDuration <= plannedDuration) {
      return "bg-green-500 dark:bg-green-600";
    } else if (actualDuration === plannedDuration + 1) {
      return "bg-yellow-500 dark:bg-yellow-600";
    } else {
      return "bg-red-500 dark:bg-red-600";
    }
  };

  const timelineRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Handle mouse move to track cursor position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setMouseX(x);
    }
  };

  const handleMouseLeave = () => {
    setMouseX(null);
  };

  // Calculate current time position (as percentage for scaling)
  const currentTimeMinutes = dateToMinutes(currentTime);
  const currentTimePositionPercent =
    currentTimeMinutes >= visualizationStartMinutes && currentTimeMinutes <= visualizationEndMinutes
      ? ((currentTimeMinutes - visualizationStartMinutes) / totalDuration) * 100
      : null;

  // Convert mouse X position to time
  const getTimeFromMouseX = (x: number): Date | null => {
    if (!timelineRef.current) return null;
    const containerWidth = timelineRef.current.offsetWidth;
    const percentFromStart = (x / containerWidth) * 100;
    const minutesFromStart = (percentFromStart / 100) * totalDuration;
    const timeInMinutes = visualizationStartMinutes + minutesFromStart;

    if (timeInMinutes < visualizationStartMinutes || timeInMinutes > visualizationEndMinutes) return null;

    const hours = Math.floor(timeInMinutes / 60);
    const mins = Math.floor(timeInMinutes % 60);
    const date = new Date(startTime);
    date.setHours(hours, mins, 0, 0);
    return date;
  };

  return (
    <div className="w-full bg-card rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Two Column Layout */}
      <div className="flex">
        {/* Left Column: Process List */}
        <div
          className="w-80 border-r border-gray-200 dark:border-gray-800 bg-muted/20 shrink-0 flex flex-col"
          style={{ borderWidth: "0.5px" }}
        >
          {/* Empty row to align with time ruler */}
          <div
            className="border-b border-gray-200 dark:border-gray-800"
            style={{ height: "30px", borderWidth: "0.5px" }}
          ></div>
          <div className="flex-1">
            {processes.map((process) => {
              return (
                <div
                  key={process.id}
                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-muted/30 transition-colors flex items-center"
                  style={{ height: "50px", borderWidth: "0.5px" }}
                >
                  <div className="px-4 py-2 w-full">
                    <h3 className="font-semibold text-sm">{process.title}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="flex-1 overflow-x-auto">
          <div
            ref={timelineRef}
            className="relative w-full"
            style={{
              minWidth: `${Math.max(800, (totalDuration / 60) * 200)}px`,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Time Ruler */}
            <div
              className="relative border-b border-gray-200 dark:border-gray-800 bg-muted/20"
              style={{ height: "30px", borderWidth: "0.5px" }}
            >
              {timeMarks.map((time, index) => {
                const timeMinutes = dateToMinutes(time);
                const startOffsetMinutes = timeMinutes - visualizationStartMinutes;
                const leftPercent = (startOffsetMinutes / totalDuration) * 100;
                return (
                  <div
                    key={index}
                    className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-800"
                    style={{ left: `${leftPercent}%`, borderWidth: "0.5px" }}
                  >
                    <div className="absolute top-1 left-1 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatTime(time)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid Lines */}
            <div className="absolute inset-0">
              {timeMarks.map((time, index) => {
                const timeMinutes = dateToMinutes(time);
                const startOffsetMinutes = timeMinutes - visualizationStartMinutes;
                const leftPercent = (startOffsetMinutes / totalDuration) * 100;
                return (
                  <div
                    key={index}
                    className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-800"
                    style={{ left: `${leftPercent}%`, borderWidth: "0.5px" }}
                  />
                );
              })}
            </div>

            {/* Current Time Indicator */}
            {currentTimePositionPercent !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400 z-20 pointer-events-none"
                style={{ left: `${currentTimePositionPercent}%` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 dark:bg-blue-400 text-white text-xs px-2 py-0.5 rounded-b shadow-sm whitespace-nowrap">
                  Now: {formatTime(currentTime)}
                </div>
              </div>
            )}

            {/* Mouse Cursor Indicator - Full height vertical line */}
            {mouseX !== null &&
              (() => {
                const timeAtCursor = getTimeFromMouseX(mouseX);
                if (!timeAtCursor) return null;

                return (
                  <>
                    {/* Vertical line spanning full height of timeline area (below time ruler) */}
                    {(() => {
                      if (!timelineRef.current) return null;
                      const containerWidth = timelineRef.current.offsetWidth;
                      const percentFromStart = (mouseX / containerWidth) * 100;
                      return (
                        <div
                          className="absolute w-0.5 bg-primary dark:bg-primary z-30 pointer-events-none"
                          style={{
                            left: `${percentFromStart}%`,
                            top: "30px", // Start below time ruler
                            bottom: "0px", // Extend to bottom
                          }}
                        />
                      );
                    })()}
                    {/* Time label at top */}
                    {(() => {
                      if (!timelineRef.current) return null;
                      const containerWidth = timelineRef.current.offsetWidth;
                      const percentFromStart = (mouseX / containerWidth) * 100;
                      return (
                        <div
                          className="absolute top-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-b shadow-sm whitespace-nowrap z-40 pointer-events-none"
                          style={{
                            left: `${percentFromStart}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          {formatTime(timeAtCursor)}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

            {/* Process Lanes */}
            <div className="relative">
              {processes.map((process) => (
                <div
                  key={process.id}
                  className="relative border-b border-gray-200 dark:border-gray-800"
                  style={{ height: "50px", borderWidth: "0.5px" }}
                >
                  {/* Task Bars - render if plannedStartTime is available (for bottom bar) */}
                  {process.taskBars.map((bar) => {
                    // Bottom bar always uses plannedStartTime, top bar only renders if startTime is available
                    if (bar.plannedStartTime === null) {
                      return null;
                    }


                    // Regular duration-based steps
                    const plannedDuration = bar.duration;

                    // Completion timestamp from Firestore
                    const completionTime = bar.startTime; // This is now the completion timestamp
                    const actualEndTime = bar.endTime;

                    // For bottom bar: use planned start time (calculated)
                    const plannedStartTime = bar.plannedStartTime;
                    const plannedEndTime = plannedStartTime
                      ? new Date(
                          plannedStartTime.getTime() + plannedDuration * 60000
                        )
                      : null;

                    // Calculate actual duration for tooltip and bar extension
                    // If completed late, extend bar to actual completion time
                    let bottomBarDuration = plannedDuration;
                    if (completionTime && plannedStartTime) {
                      const actualDurationMinutes = Math.max(
                        plannedDuration,
                        Math.round((completionTime.getTime() - plannedStartTime.getTime()) / 60000)
                      );
                      bottomBarDuration = actualDurationMinutes;
                    }

                    const actualDuration = completionTime && plannedStartTime
                      ? Math.round((completionTime.getTime() - plannedStartTime.getTime()) / 60000)
                      : plannedDuration;

                    // Bottom bar: extend to actual completion if late, otherwise planned duration
                    const bottomBarStyle = getBarStyle(
                      plannedStartTime,
                      bottomBarDuration
                    );

                    // Determine bottom bar color based on completion status
                    let bottomBarColor = "bg-gray-400 dark:bg-gray-600"; // Default: no completion
                    if (completionTime && plannedEndTime) {
                      const delayMinutes = Math.round((completionTime.getTime() - plannedEndTime.getTime()) / 60000);
                      if (delayMinutes <= 0) {
                        // Completed on time
                        bottomBarColor = "bg-green-500 dark:bg-green-600";
                      } else if (delayMinutes === 1) {
                        // 1 minute late
                        bottomBarColor = "bg-yellow-500 dark:bg-yellow-600";
                      } else {
                        // More than 1 minute late
                        bottomBarColor = "bg-red-500 dark:bg-red-600";
                      }
                    }

                    // Calculate position for checkmark if task is completed
                    let checkmarkPosition: { left: string } | null = null;
                    let checkmarkColor = "bg-green-500 dark:bg-green-600";
                    
                    if (completionTime) {
                      const completionMinutes = dateToMinutes(completionTime);
                      const startOffsetMinutes = completionMinutes - visualizationStartMinutes;
                      const leftPercent = (startOffsetMinutes / totalDuration) * 100;
                      checkmarkPosition = { left: `calc(${leftPercent}% - 12px)` };
                      
                      // Determine color based on whether completed on time or late
                      if (plannedEndTime && completionTime > plannedEndTime) {
                        // Completed late
                        const delayMinutes = Math.round((completionTime.getTime() - plannedEndTime.getTime()) / 60000);
                        if (delayMinutes === 1) {
                          checkmarkColor = "bg-yellow-500 dark:bg-yellow-600";
                        } else {
                          checkmarkColor = "bg-red-500 dark:bg-red-600";
                        }
                      }
                      // Otherwise green (on time)
                    }

                    return (
                      <div key={bar.id} className="relative">
                        {/* Checkmark at completion timestamp */}
                        {completionTime && checkmarkPosition && (
                          <TimelineTooltip
                            bar={bar}
                            process={process}
                            actualStartTime={completionTime}
                            actualEndTime={completionTime}
                            actualDuration={actualDuration}
                            plannedStartTime={plannedStartTime}
                            plannedEndTime={plannedEndTime}
                            plannedDuration={plannedDuration}
                            variant="actual"
                          >
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full ${checkmarkColor} shadow-sm cursor-help z-10`}
                              style={checkmarkPosition}
                            >
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          </TimelineTooltip>
                        )}
                        {/* Bottom bar - planned duration, colored based on completion status */}
                        <TimelineTooltip
                          bar={bar}
                          process={process}
                          actualStartTime={completionTime}
                          actualEndTime={actualEndTime}
                          actualDuration={actualDuration}
                          plannedStartTime={plannedStartTime}
                          plannedEndTime={plannedEndTime}
                          plannedDuration={plannedDuration}
                          variant="planned"
                        >
                          <div
                            className={`absolute top-3.5 h-2.5 rounded-sm ${bottomBarColor} shadow-sm cursor-help`}
                            style={bottomBarStyle}
                          />
                        </TimelineTooltip>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

