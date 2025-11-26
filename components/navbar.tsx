"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsButton } from "@/components/notifications-button";

interface NavbarProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Navbar({
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search flights...",
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl shadow-sm border-b border-border/20">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Vueling Dashboard
              </h1>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm">
                Leaderboard
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {showSearch && (
              <div className="w-full max-w-md">
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full bg-muted/50 border-0 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
            )}
            <NotificationsButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

