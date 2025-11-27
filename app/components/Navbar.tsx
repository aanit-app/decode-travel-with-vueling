"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@heroui/react";
import { ThemeSwitch } from "./theme-switch";
import { UserMenu } from "./UserMenu";
import { useAuth } from "../contexts/AuthContext";
import { useWeb3 } from "../contexts/Web3Context";

export function Navbar() {
  const { user, loading: authLoading } = useAuth();
  const { isConnected } = useWeb3();
  const isSignedIn = user || isConnected;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 h-16 md:h-20 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
          aria-label="Go to homepage"
        >
          <Image
            src="/vueling.png"
            alt="Vueling Logo"
            width={48}
            height={28}
            className="w-16 h-5 dark:invert"
          />
        </Link>

        <div className="flex items-center gap-0">
          <ThemeSwitch className="pr-4" />
          {!authLoading && (
            <>
              {isSignedIn ? (
                <UserMenu />
              ) : (
                <Button as={Link} href="/signin" variant="bordered">
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
