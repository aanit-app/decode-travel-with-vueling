"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Define the Settings interface
interface Settings {
  contractAddress: string;
  notifications: boolean;
  notificationsDrawerOpen?: boolean;
  defaultProviders?: {
    groundHandlingProvider: string;
    cleaningProvider: string;
    fuelProvider: string;
    cateringProvider: string;
    flightCrewProvider: string;
    gateProvider: string;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  getContractAddress: () => Promise<string>;
  contractAddress: string;
}

const defaultSettings: Settings = {
  contractAddress: process.env.NEXT_PUBLIC_DEFAULT_CONTRACT_ADDRESS || "",
  notifications: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [contractAddress, setContractAddress] = useState<string>(
    defaultSettings.contractAddress
  );

  useEffect(() => {
    // Simplified loading of settings from localStorage only
    const loadSettings = async () => {
      if (typeof window === "undefined") return; // Guard for SSR

      try {
        const savedSettings = localStorage.getItem("settings");
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setContractAddress(parsedSettings.contractAddress);
          setSettings({
            ...defaultSettings,
            ...parsedSettings,
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setSettings(defaultSettings);
      }
    };

    loadSettings();
  }, []);

  const getContractAddress = async () => {
    const settings = localStorage.getItem("settings");
    return settings ? JSON.parse(settings).contractAddress : "";
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prevSettings) => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      if (typeof window !== "undefined") {
        localStorage.setItem("settings", JSON.stringify(updatedSettings));
      }
      return updatedSettings;
    });
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, getContractAddress, contractAddress }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
