"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { NotificationsModal, type Notification } from "@/components/notifications-modal";

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "warning",
    title: "Flight Delay Alert",
    message: "Flight VY5678 (MAD → LHR) has been delayed by 30 minutes. New departure time: 17:45",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    read: false,
  },
  {
    id: "2",
    type: "error",
    title: "High Risk Flight",
    message: "Flight VY3456 (MAD → FCO) has been cancelled. Please review turnaround process.",
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    read: false,
  },
  {
    id: "3",
    type: "success",
    title: "Certificate Issued",
    message: "Certificate for flight VY1234 (BCN → MAD) has been successfully issued.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: true,
  },
  {
    id: "4",
    type: "info",
    title: "Turnaround Progress",
    message: "Flight VY9012 (BCN → CDG) is 90% complete. All processes on track.",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    read: true,
  },
  {
    id: "5",
    type: "warning",
    title: "Certificate Pending",
    message: "Certificate for flight VY5678 is still pending. Expected completion: 30 minutes.",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    read: true,
  },
  {
    id: "6",
    type: "success",
    title: "Flight Completed",
    message: "Flight VY7890 (BCN → AMS) has completed all turnaround processes successfully.",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
  },
];

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
      <NotificationsModal 
        open={open} 
        onOpenChange={setOpen}
        notifications={notifications}
        setNotifications={setNotifications}
      />
    </>
  );
}

