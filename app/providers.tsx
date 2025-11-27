"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
} from "next-themes";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider 
        attribute="class" 
        defaultTheme="dark" 
        enableSystem
        {...themeProps}
      >
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
