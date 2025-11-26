"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

export type NotificationType = "success" | "warning" | "info" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export function NotificationsModal({
  open,
  onOpenChange,
  notifications,
  setNotifications,
}: NotificationsModalProps) {

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: NotificationType, read: boolean) => {
    // bg-card is white in light mode, dark in dark mode (from CSS variables)
    if (read) return "bg-card border-border";
    
    switch (type) {
      case "success":
        return "bg-green-100 dark:bg-card border-green-300 dark:border-green-500/20";
      case "warning":
        return "bg-card border-yellow-300 dark:border-yellow-500/20";
      case "error":
        return "bg-card border-red-300 dark:border-red-500/20";
      case "info":
        return "bg-blue-100 dark:bg-card border-blue-300 dark:border-blue-500/20";
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Stay updated with flight status and turnaround processes
              </DialogDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const bgColor = getNotificationBgColor(notification.type, notification.read);
              const borderColor = !notification.read 
                ? notification.type === "success" 
                  ? "border-l-green-500 dark:border-l-green-400"
                  : notification.type === "warning"
                  ? "border-l-yellow-500 dark:border-l-yellow-400"
                  : notification.type === "error"
                  ? "border-l-red-500 dark:border-l-red-400"
                  : "border-l-blue-500 dark:border-l-blue-400"
                : "";
              
              return (
              <div
                key={notification.id}
                className={`relative p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${bgColor} ${!notification.read ? `border-l-4 ${borderColor}` : ""}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4
                          className={`text-sm font-semibold ${
                            !notification.read ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

