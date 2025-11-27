"use client";

import { useState, useEffect } from "react";
import { Select, SelectItem, Card, CardBody, Spinner } from "@heroui/react";
import { Body } from "./typography";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

type Provider = {
  id: string;
  name: string;
  walletAddress: string;
};

type WalletSelectorProps = {
  selectedWallet: string;
  onWalletChange: (wallet: string) => void;
  enabled?: boolean;
};

export function WalletSelector({
  selectedWallet,
  onWalletChange,
  enabled = true,
}: WalletSelectorProps) {
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [providers, setProviders] = useState<Map<string, string>>(new Map()); // Map walletAddress -> name

  // Fetch providers to match wallet addresses to names
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const providersSnapshot = await getDocs(collection(db, "providers"));
        const providersMap = new Map<string, string>();
        
        providersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.walletAddress && data.name) {
            // Store both lowercase and original case for matching
            providersMap.set(data.walletAddress.toLowerCase(), data.name);
            if (data.walletAddress !== data.walletAddress.toLowerCase()) {
              providersMap.set(data.walletAddress, data.name);
            }
          }
        });
        
        setProviders(providersMap);
      } catch (err) {
        console.error("Error fetching providers:", err);
        // Continue without provider names if fetch fails
      }
    };

    if (enabled) {
      fetchProviders();
    }
  }, [enabled]);

  // Fetch available wallets
  useEffect(() => {
    const fetchWallets = async () => {
      if (typeof window.ethereum === "undefined") {
        setAvailableWallets([]);
        return;
      }

      try {
        setLoadingWallets(true);
        // Request access to accounts
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (accounts && accounts.length > 0) {
          setAvailableWallets(accounts);
          // Set first wallet as default if none selected
          if (!selectedWallet && accounts.length > 0) {
            onWalletChange(accounts[0]);
          } else if (selectedWallet && !accounts.includes(selectedWallet)) {
            // If selected wallet is no longer available, select the first one
            onWalletChange(accounts[0]);
          }
        } else {
          setAvailableWallets([]);
        }
      } catch (err) {
        console.error("Error fetching wallets:", err);
        setAvailableWallets([]);
      } finally {
        setLoadingWallets(false);
      }
    };

    if (!enabled) {
      return;
    }

    fetchWallets();

    // Listen for account changes
    if (typeof window.ethereum !== "undefined") {
        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts.length > 0) {
            setAvailableWallets(accounts);
            // If previously selected wallet is still in the list, keep it
            // Otherwise, select the first one
            if (selectedWallet && accounts.includes(selectedWallet)) {
              // Keep the current selection
              return;
            }
            onWalletChange(accounts[0]);
          } else {
            setAvailableWallets([]);
            onWalletChange("");
          }
        };

      const ethereum = window.ethereum as any;
      if (ethereum.on) {
        ethereum.on("accountsChanged", handleAccountsChanged);

        return () => {
          if (ethereum.removeListener) {
            ethereum.removeListener("accountsChanged", handleAccountsChanged);
          }
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {availableWallets.length === 0 && !loadingWallets && (
        <Card className="border-warning bg-warning-50 dark:bg-warning-900/20">
          <CardBody>
            <Body className="text-warning">
              ⚠️ No wallets available. Please connect your wallet in MetaMask to sign and complete tasks.
            </Body>
          </CardBody>
        </Card>
      )}
      {availableWallets.length > 0 && (
        <Card className="border-success bg-success-50 dark:bg-success-900/20">
          <CardBody>
            <Body className="text-success">
              ✓ {availableWallets.length} wallet{availableWallets.length > 1 ? "s" : ""} available
            </Body>
          </CardBody>
        </Card>
      )}
      <Select
        label="Select Wallet"
        placeholder="Choose a wallet to sign transactions"
        selectedKeys={selectedWallet ? [selectedWallet] : []}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          onWalletChange(selected || "");
        }}
        isDisabled={loadingWallets || availableWallets.length === 0}
        isLoading={loadingWallets}
        description="Select the wallet address to use for signing task completions"
      >
        {availableWallets.map((wallet) => {
          const providerName = providers.get(wallet.toLowerCase()) || providers.get(wallet);
          const displayText = providerName
            ? `${providerName} (${wallet.slice(0, 6)}...${wallet.slice(-4)})`
            : `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
          
          return (
            <SelectItem key={wallet} textValue={displayText}>
              {displayText}
            </SelectItem>
          );
        })}
      </Select>
    </>
  );
}

