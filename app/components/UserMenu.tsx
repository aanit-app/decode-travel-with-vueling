"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@heroui/react";
import { LogOut, User as UserIcon, Settings, Gift, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useWeb3 } from "../contexts/Web3Context";

export function UserMenu() {
  const { user, signOut, isAdmin } = useAuth();
  const { isConnected, userAddress, disconnectWallet } = useWeb3();
  const router = useRouter();

  const handleProfileClick = () => {
    if (!user) return;
    router.push('/profile');
  };

  const handleDisconnect = () => {
    if (user) {
      signOut();
    }
    if (isConnected) {
      disconnectWallet();
    }
  };

  // Show menu if user is signed in via Firebase or wallet
  if (!user && !isConnected) return null;

  // Get display info
  const displayName = user?.displayName || 
                     user?.email?.split('@')[0] || 
                     (userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'User');

  return (
    <Dropdown placement="bottom-end" backdrop="blur">
      <DropdownTrigger>
        <div className="flex items-center gap-2 cursor-pointer">
          <Avatar
            isBordered
            size="sm"
            src={user?.photoURL || undefined}
            name={displayName}
            showFallback
            className="transition-transform text-tiny"
            classNames={{
              base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B]",
              icon: "text-black/80",
            }}
          />
        </div>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="User menu"
        itemClasses={{
          base: "gap-4",
        }}
      >
        {user ? (
          <>
            {isAdmin ? (
              <DropdownItem
                key="profile"
                startContent={<UserIcon className="w-4 h-4" />}
                onClick={handleProfileClick}
              >
                Profile
              </DropdownItem>
            ) : null}
            <DropdownItem
              key="leaderboard"
              startContent={<Gift className="w-4 h-4" />}
              onClick={() => router.push("/leaderboard")}
            >
              Leaderboard
            </DropdownItem>
            <DropdownItem
              key="settings"
              startContent={<Settings className="w-4 h-4" />}
              onClick={() => router.push("/settings")}
            >
              Settings
            </DropdownItem>
          </>
        ) : null}
        {isConnected ? (
          <DropdownItem
            key="wallet"
            startContent={<Wallet className="w-4 h-4" />}
            isReadOnly
          >
            {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Wallet Connected'}
          </DropdownItem>
        ) : null}
        <DropdownItem
          key="logout"
          className="text-danger"
          color="danger"
          startContent={<LogOut className="w-4 h-4" />}
          onClick={handleDisconnect}
        >
          {user ? "Log Out" : "Disconnect Wallet"}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
