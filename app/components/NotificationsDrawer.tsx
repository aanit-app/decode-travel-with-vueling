"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";
import { X, Bell } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import { H2, Body } from "./typography";

export function NotificationsDrawer() {
  const { settings, updateSettings } = useSettings();
  const isOpen = settings.notificationsDrawerOpen ?? false;

  const toggleDrawer = () => {
    updateSettings({ notificationsDrawerOpen: !isOpen });
  };

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        updateSettings({ notificationsDrawerOpen: false });
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, updateSettings]);

  return (
    <div
      className={`fixed top-16 md:top-20 right-0 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full max-w-md bg-background border-l border-gray-200 dark:border-gray-800 z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <H2 className="text-lg">Notifications</H2>
          </div>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={toggleDrawer}
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <Body className="text-gray-500 dark:text-gray-400">
            No notifications yet.
          </Body>
        </div>
      </div>
    </div>
  );
}

