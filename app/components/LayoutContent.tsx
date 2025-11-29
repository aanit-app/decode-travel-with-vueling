"use client";

import { useSettings } from "../contexts/SettingsContext";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const isDrawerOpen = settings.notificationsDrawerOpen ?? false;
  const drawerWidth = 448; // max-w-md = 28rem = 448px

  return (
    <div
      className="transition-all duration-300 ease-in-out"
      style={{
        marginRight: isDrawerOpen ? `${drawerWidth}px` : "0",
      }}
    >
      {children}
    </div>
  );
}

