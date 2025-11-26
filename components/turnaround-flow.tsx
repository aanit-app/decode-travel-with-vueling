"use client";

import { useState, useRef, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimelineTooltip } from "@/components/timeline-tooltip";

export enum StepStatus {
  Standby = "standby",
  InProgress = "in-progress",
  Finished = "finished",
}

export enum Team {
  GROUND_HANDLING_PROVIDER = "GROUND_HANDLING_PROVIDER",
  CLEANING = "CLEANING",
  FUEL_CLH = "FUEL_CLH",
  CATERING = "CATERING",
  FLIGHT_CREW = "FLIGHT_CREW",
  GATE_BOARDING_AGENTS = "GATE_BOARDING_AGENTS",
}

export type TaskBar = {
  id: string;
  label: string;
  startTime: Date | null; // actual start time (null until realtime data is provided, cannot be calculated)
  endTime: Date | null; // actual end time (null until realtime data is provided, cannot be calculated)
  plannedStartTime: Date | null; // planned/calculated start time
  duration: number; // planned duration in minutes
  status: StepStatus;
  dependencies?: string[]; // IDs of tasks this depends on
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
  
  // Use the maximum of planned end time or actual process end times
  const totalDuration = maxProcessTime - startMinutes;

  // Fixed column width (pixels per 15-minute interval)
  const COLUMN_WIDTH_PX = 100;
  const TIME_INTERVAL_MINUTES = 15;

  // Generate time grid marks (every 15 minutes) - extend to cover all processes
  const timeMarks: Date[] = [];
  const maxTime = Math.max(endMinutes, maxProcessTime);
  for (let i = startMinutes; i <= maxTime; i += TIME_INTERVAL_MINUTES) {
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
  // Use fixed pixel positioning based on column width
  const getBarStyle = (barStartTime: Date, durationMinutes: number) => {
    // Calculate position in minutes from start
    const barStartMinutes = dateToMinutes(barStartTime);
    const startOffsetMinutes = barStartMinutes - startMinutes;
    
    // Convert to pixels (minutes / 15 minutes per column * column width)
    const left = (startOffsetMinutes / TIME_INTERVAL_MINUTES) * COLUMN_WIDTH_PX;
    const width = (durationMinutes / TIME_INTERVAL_MINUTES) * COLUMN_WIDTH_PX;
    
    return {
      left: `${left}px`,
      width: `${width}px`,
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

  // Calculate current time position
  const currentTimeMinutes = dateToMinutes(currentTime);
  const currentTimePosition = currentTimeMinutes >= startMinutes && currentTimeMinutes <= maxTime
    ? ((currentTimeMinutes - startMinutes) / TIME_INTERVAL_MINUTES) * COLUMN_WIDTH_PX
    : null;

  // Convert mouse X position to time
  const getTimeFromMouseX = (x: number): Date | null => {
    const minutesFromStart = (x / COLUMN_WIDTH_PX) * TIME_INTERVAL_MINUTES;
    const timeInMinutes = startMinutes + minutesFromStart;
    
    if (timeInMinutes < startMinutes || timeInMinutes > maxTime) return null;
    
    const hours = Math.floor(timeInMinutes / 60);
    const mins = Math.floor(timeInMinutes % 60);
    const date = new Date(startTime);
    date.setHours(hours, mins, 0, 0);
    return date;
  };

  return (
    <TooltipProvider>
      <div className="w-full bg-card rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

      {/* Two Column Layout */}
      <div className="flex">
        {/* Left Column: Process List */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-muted/20 shrink-0 flex flex-col" style={{ borderWidth: "0.5px" }}>
          {/* Empty row to align with time ruler */}
          <div className="border-b border-gray-200 dark:border-gray-800" style={{ height: "30px", borderWidth: "0.5px" }}></div>
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
            className="relative" 
            style={{ minWidth: `${Math.max(800, (totalDuration / 60) * 200)}px` }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Time Ruler */}
            <div className="relative border-b border-gray-200 dark:border-gray-800 bg-muted/20" style={{ height: "30px", borderWidth: "0.5px" }}>
              {timeMarks.map((time, index) => {
                const timeMinutes = dateToMinutes(time);
                const position = ((timeMinutes - startMinutes) / totalDuration) * 100;
                return (
                  <div
                    key={index}
                    className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-800"
                    style={{ left: `${position}%`, borderWidth: "0.5px" }}
                  >
                    <div className="absolute top-1 left-1 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatTime(time)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid Lines */}
            <div className="absolute inset-0" >
              {timeMarks.map((time, index) => {
                const timeMinutes = dateToMinutes(time);
                const position = ((timeMinutes - startMinutes) / totalDuration) * 100;
                return (
                  <div
                    key={index}
                    className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-800"
                    style={{ left: `${position}%`, borderWidth: "0.5px" }}
                  />
                );
              })}
            </div>

            {/* Current Time Indicator */}
            {currentTimePosition !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400 z-20 pointer-events-none"
                style={{ left: `${currentTimePosition}px` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 dark:bg-blue-400 text-white text-xs px-2 py-0.5 rounded-b shadow-sm whitespace-nowrap">
                  Now: {formatTime(currentTime)}
                </div>
              </div>
            )}

            {/* Mouse Cursor Indicator - Full height vertical line */}
            {mouseX !== null && (() => {
              const timeAtCursor = getTimeFromMouseX(mouseX);
              if (!timeAtCursor) return null;
              
              return (
                <>
                  {/* Vertical line spanning full height of timeline area (below time ruler) */}
                  <div
                    className="absolute w-0.5 bg-primary dark:bg-primary z-30 pointer-events-none"
                    style={{ 
                      left: `${mouseX}px`,
                      top: '30px', // Start below time ruler
                      bottom: '0px', // Extend to bottom
                    }}
                  />
                  {/* Time label at top */}
                  <div 
                    className="absolute top-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-b shadow-sm whitespace-nowrap z-40 pointer-events-none"
                    style={{ 
                      left: `${mouseX}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {formatTime(timeAtCursor)}
                  </div>
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

                    // Check if this is a single-action step (duration: 0 and no dependencies)
                    const isSingleAction = process.duration === 0 && (!process.dependencies || process.dependencies.length === 0);

                    if (isSingleAction) {
                      // Render as a circle with checkmark - only if actual startTime is available
                      if (bar.startTime === null) {
                        return null;
                      }
                      
                      const barStartMinutes = dateToMinutes(bar.startTime);
                      const startOffsetMinutes = barStartMinutes - startMinutes;
                      const left = (startOffsetMinutes / TIME_INTERVAL_MINUTES) * COLUMN_WIDTH_PX;
                      
                      const singleActionEndTime = bar.endTime ?? bar.startTime;
                      const singleActionDuration = bar.endTime && bar.startTime
                        ? Math.round((bar.endTime.getTime() - bar.startTime.getTime()) / 60000)
                        : 0;

                      const plannedEndTime = bar.plannedStartTime 
                        ? new Date(bar.plannedStartTime.getTime() + bar.duration * 60000)
                        : null;

                      return (
                        <TimelineTooltip
                          key={bar.id}
                          bar={bar}
                          process={process}
                          actualStartTime={bar.startTime}
                          actualEndTime={singleActionEndTime}
                          actualDuration={singleActionDuration}
                          plannedStartTime={bar.plannedStartTime}
                          plannedEndTime={plannedEndTime}
                          plannedDuration={bar.duration}
                          variant="actual"
                        >
                          <div
                            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-green-500 dark:bg-green-600 shadow-sm cursor-help"
                            style={{ left: `${left - 12}px` }}
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
                      );
                    }

                    // Regular duration-based steps
                    const plannedDuration = bar.duration;
                    
                    // For top bar: use actual start/end times from data (no calculated fallback)
                    const actualStartTime = bar.startTime;
                    const actualEndTime = bar.endTime;
                    const actualDuration = actualStartTime && actualEndTime
                      ? dateToMinutes(actualEndTime) - dateToMinutes(actualStartTime)
                      : plannedDuration; // Fallback only for display width, not for tooltip

                    // For bottom bar: use planned start time (calculated)
                    const plannedStartTime = bar.plannedStartTime;
                    const plannedEndTime = plannedStartTime 
                      ? new Date(plannedStartTime.getTime() + plannedDuration * 60000)
                      : null;

                    // Top bar: actual duration (colored based on comparison) - only render if actualStartTime exists
                    const topBarStyle = actualStartTime ? getBarStyle(actualStartTime, actualDuration) : null;
                    const topBarColor = getTopBarColor(actualDuration, plannedDuration);

                    // Bottom bar: planned duration (gray) - always use planned start time
                    const bottomBarStyle = getBarStyle(plannedStartTime, plannedDuration);

                    return (
                      <div key={bar.id} className="relative">
                        {/* Top bar - actual duration - only render if actualStartTime exists */}
                        {actualStartTime && topBarStyle && (
                          <TimelineTooltip
                            bar={bar}
                            process={process}
                            actualStartTime={actualStartTime}
                            actualEndTime={actualEndTime}
                            actualDuration={actualDuration}
                            plannedStartTime={plannedStartTime}
                            plannedEndTime={plannedEndTime}
                            plannedDuration={plannedDuration}
                            variant="actual"
                          >
                            <div
                              className={`absolute top-1 h-2.5 rounded-sm ${topBarColor} shadow-sm cursor-help`}
                              style={topBarStyle}
                            />
                          </TimelineTooltip>
                        )}
                        {/* Bottom bar - planned duration */}
                        <TimelineTooltip
                          bar={bar}
                          process={process}
                          actualStartTime={actualStartTime}
                          actualEndTime={actualEndTime}
                          actualDuration={actualDuration}
                          plannedStartTime={plannedStartTime}
                          plannedEndTime={plannedEndTime}
                          plannedDuration={plannedDuration}
                          variant="planned"
                        >
                          <div
                            className="absolute top-3.5 h-2.5 rounded-sm bg-gray-400 dark:bg-gray-600 shadow-sm cursor-help"
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
    </TooltipProvider>
  );
}
