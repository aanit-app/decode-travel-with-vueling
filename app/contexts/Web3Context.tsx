"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSettings } from "./SettingsContext";
import { useAuth } from "./AuthContext";
import { getDisplayName, getRpcUrl, getExplorerUrl } from "@/app/lib/blockchain";
import { ethers } from "ethers";
import { contractABI } from "@/app/lib/contractABI";
import { BrowserProvider } from "ethers";

export type TaskStatus = "pending" | "completed" | "late" | "cancelled";
export type Actor = 
  | "GroundHandling"
  | "Cleaning"
  | "Fuel"
  | "Catering"
  | "FlightCrew"
  | "Gate";

export type Task = {
  templateId: number; // 0-26
  actor: Actor;
  deadline: number; // Unix timestamp (seconds)
  completedAt: number; // Unix timestamp (seconds), 0 if not completed
  status: TaskStatus;
  mandatory: boolean;
  justifiedDelay: boolean;
  delayReason: string;
};

export type TurnaroundState = {
  id: number;
  turnaroundId: string;
  airport: string;
  scheduledArrival: number; // Unix timestamp (seconds)
  scheduledDeparture: number; // Unix timestamp (seconds)
  createdAt: number; // Unix timestamp (seconds)
  certified: boolean; // Whether the turnaround is finalized/certified
  slaBreached: boolean;
  totalTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  firstTaskCompletedAt: number; // Unix timestamp (seconds), 0 if none
  lastTaskCompletedAt: number; // Unix timestamp (seconds), 0 if none
  certificateHash: string; // Hex string
};

interface Web3ContextType {
  isConnected: boolean;
  userAddress: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: string) => Promise<string>;
  signEIP712TaskCompletion: (
    contractAddress: string,
    chainId: number,
    walletAddress: string,
    taskId: number,
    turnaroundId: string,
    timestamp: number
  ) => Promise<string>;
  getTasks: (contractAddress: string, chainId: number) => Promise<Task[]>;
  getTurnaroundState: (
    contractAddress: string,
    chainId: number
  ) => Promise<TurnaroundState>;
  markTaskCompleted: (
    contractAddress: string,
    chainId: number,
    walletAddress: string,
    taskId: number
  ) => Promise<{ transactionHash: string; blockNumber: number }>;
  finalizeTurnaround: (
    contractAddress: string,
    chainId: number,
    walletAddress: string
  ) => Promise<{ transactionHash: string; blockNumber: number }>;
  ensureWalletIsActive: (walletAddress: string) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const DISCONNECTED_FLAG_KEY = "wallet_disconnected";

// Helper function to validate Ethereum address format
function validateAddress(address: string, addressType: string = "address"): void {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid ${addressType} format`);
  }
}

// Helper function to validate chain ID
function validateChainId(chainId: number): void {
  if (chainId !== 500 && chainId !== 501) {
    throw new Error("Chain ID must be 500 (Camino) or 501 (Columbus)");
  }
}

// Helper function to switch network in MetaMask
async function switchNetwork(chainId: number): Promise<void> {
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask is not installed");
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        // Get network details
        const rpcUrl = getRpcUrl(chainId);
        const displayName = getDisplayName(chainId);
        // Get explorer base URL (without address)
        const explorerBaseUrl = chainId === 500 
          ? "https://caminoscan.com"
          : "https://columbus.caminoscan.com";

        try {
          // Add the network to MetaMask
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: displayName,
                nativeCurrency: {
                  name: "AVAX",
                  symbol: "AVAX",
                  decimals: 18,
                },
                rpcUrls: [rpcUrl],
                blockExplorerUrls: [explorerBaseUrl],
              },
            ],
          });
        } catch (addError: any) {
          throw new Error(
            `Failed to add ${displayName} network to MetaMask: ${addError.message || "User rejected the request"}`
          );
        }
      } else if (switchError.code === 4901) {
      // User rejected the switch
      throw new Error("Please switch networks in MetaMask to continue");
    } else {
      // Other error
      throw new Error(
        `Failed to switch to ${getDisplayName(chainId)}: ${switchError.message || "Unknown error"}`
      );
    }
  }
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const { settings, getContractAddress } = useSettings();
  const { signInAnonymously, user, isAnonymous, signOut } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");

  useEffect(() => {
    checkIfWalletIsConnected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, getContractAddress]);

  // Sign in anonymously when wallet connects
  useEffect(() => {
    if (isConnected && userAddress) {
      signInAnonymously().catch((error) => {
        console.error("Error signing in anonymously:", error);
      });
    }
  }, [isConnected, userAddress, signInAnonymously]);

  async function checkIfWalletIsConnected() {
    // Don't auto-connect if user has explicitly disconnected
    const isDisconnected = localStorage.getItem(DISCONNECTED_FLAG_KEY) === "true";
    if (isDisconnected) {
      return;
    }

    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];
        if (accounts.length > 0) {
          setIsConnected(true);
          setUserAddress(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  }

  async function connectWallet() {
    if (typeof window.ethereum !== "undefined") {
      try {
        // Request account access first
        await window.ethereum.request({ method: "eth_requestAccounts" });

        // Get the current chainId
        const chainIdHex = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;
        const chainId = parseInt(chainIdHex, 16);

        // Check if we're on a supported network (500 or 501)
        if (chainId !== 500 && chainId !== 501) {
          throw new Error(
            `Please switch to ${getDisplayName(500)} (500) or ${getDisplayName(
              501
            )} (501) network`
          );
        }

        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];

        // Clear the disconnected flag when user explicitly connects
        localStorage.removeItem(DISCONNECTED_FLAG_KEY);
        setIsConnected(true);
        setUserAddress(accounts[0]);
        
        // Anonymous sign-in will be handled by the useEffect hook
      } catch (error) {
        console.error("Error connecting wallet:", error);
        throw error;
      }
    } else {
      alert("Please install MetaMask to use this feature");
    }
  }

  function disconnectWallet() {
    // Set flag to prevent auto-reconnection
    localStorage.setItem(DISCONNECTED_FLAG_KEY, "true");
    setIsConnected(false);
    setUserAddress("");
    
    // Sign out from Firebase if user is anonymous (wallet-only user)
    if (user && isAnonymous) {
      signOut().catch((error) => {
        console.error("Error signing out:", error);
      });
    }
  }

  async function signMessage(message: string): Promise<string> {
    if (!isConnected || !userAddress) {
      throw new Error("Wallet is not connected");
    }

    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Use personal_sign method to sign the message
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, userAddress],
      }) as string;

      return signature;
    } catch (error: any) {
      console.error("Error signing message:", error);
      throw new Error(error.message || "Failed to sign message");
    }
  }

  async function signEIP712TaskCompletion(
    contractAddress: string,
    chainId: number,
    walletAddress: string,
    taskId: number,
    turnaroundId: string,
    timestamp: number
  ): Promise<string> {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    validateAddress(contractAddress, "contract address");
    validateChainId(chainId);
    validateAddress(walletAddress, "wallet address");

    try {
      // Ensure the wallet is active
      await ensureWalletIsActive(walletAddress);

      // EIP712 Domain
      const domain = {
        name: "TurnaroundTaskCompletion",
        version: "1",
        chainId: chainId,
        verifyingContract: contractAddress,
      };

      // EIP712 Types
      const types = {
        TaskCompletion: [
          { name: "turnaroundId", type: "string" },
          { name: "taskId", type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      };

      // Message to sign
      const message = {
        turnaroundId: turnaroundId,
        taskId: taskId,
        timestamp: timestamp,
      };

      // Request EIP712 signature
      // eth_signTypedData_v4 expects the data object
      const signature = await window.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [
          walletAddress,
          {
            domain,
            types,
            primaryType: "TaskCompletion",
            message,
          },
        ],
      }) as string;

      return signature;
    } catch (error: any) {
      console.error("Error signing EIP712 message:", error);
      throw new Error(error.message || "Failed to sign EIP712 message");
    }
  }

  async function getTasks(
    contractAddress: string,
    chainId: number
  ): Promise<Task[]> {
    validateAddress(contractAddress, "contract address");
    validateChainId(chainId);

    try {
      // Get RPC URL for the chain
      const rpcUrl = getRpcUrl(chainId);

      // Create provider (read-only, no wallet needed for view functions)
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );

      // Call getTasks (view function, no transaction needed)
      const tasks = await contract.getTasks();

      // Parse the returned tasks into our Task format
      const parsedTasks: Task[] = tasks.map((task: any) => {
        // Parse actor enum (uint8) to Actor type
        // Solidity enum: GroundHandling(0), Cleaning(1), Fuel(2), Catering(3), FlightCrew(4), Gate(5)
        const actorMap: Record<number, Actor> = {
          0: "GroundHandling",
          1: "Cleaning",
          2: "Fuel",
          3: "Catering",
          4: "FlightCrew",
          5: "Gate",
        };
        const actor = actorMap[Number(task.actor)] || "GroundHandling";

        // Parse status enum (uint8) to TaskStatus type
        const statusMap: Record<number, TaskStatus> = {
          0: "pending",
          1: "completed",
          2: "late",
          3: "cancelled",
        };
        const status = statusMap[Number(task.status)] || "pending";

        return {
          templateId: Number(task.templateId),
          actor: actor,
          deadline: Number(task.deadline),
          completedAt: Number(task.completedAt),
          status: status,
          mandatory: task.mandatory,
          justifiedDelay: task.justifiedDelay,
          delayReason: task.delayReason || "",
        };
      });

      return parsedTasks;
    } catch (error: any) {
      console.error("Error fetching tasks from contract:", error);
      throw new Error(
        error.message || "Failed to fetch tasks from contract"
      );
    }
  }

  async function getTurnaroundState(
    contractAddress: string,
    chainId: number
  ): Promise<TurnaroundState> {
    validateAddress(contractAddress, "contract address");
    validateChainId(chainId);

    try {
      // Get RPC URL for the chain
      const rpcUrl = getRpcUrl(chainId);

      // Create provider (read-only, no wallet needed for view functions)
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );

      // Call turnaround (view function, no transaction needed)
      const turnaroundData = await contract.turnaround();

      // Parse the returned turnaround state
      return {
        id: Number(turnaroundData.id),
        turnaroundId: turnaroundData.turnaroundId,
        airport: turnaroundData.airport,
        scheduledArrival: Number(turnaroundData.scheduledArrival),
        scheduledDeparture: Number(turnaroundData.scheduledDeparture),
        createdAt: Number(turnaroundData.createdAt),
        certified: turnaroundData.certified,
        slaBreached: turnaroundData.slaBreached,
        totalTasks: Number(turnaroundData.totalTasks),
        onTimeTasks: Number(turnaroundData.onTimeTasks),
        lateTasks: Number(turnaroundData.lateTasks),
        firstTaskCompletedAt: Number(turnaroundData.firstTaskCompletedAt),
        lastTaskCompletedAt: Number(turnaroundData.lastTaskCompletedAt),
        certificateHash: turnaroundData.certificateHash,
      };
    } catch (error: any) {
      console.error("Error fetching turnaround state from contract:", error);
      throw new Error(
        error.message || "Failed to fetch turnaround state from contract"
      );
    }
  }

  async function markTaskCompleted(
    contractAddress: string,
    chainId: number,
    walletAddress: string,
    taskId: number
  ): Promise<{ transactionHash: string; blockNumber: number }> {
    validateAddress(contractAddress, "contract address");
    validateChainId(chainId);
    validateAddress(walletAddress, "wallet address");

    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Check if we're on the correct network first, and switch if needed
      if (typeof window.ethereum !== "undefined") {
        const currentChainIdHex = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;
        const currentChainId = parseInt(currentChainIdHex, 16);
        
        if (currentChainId !== chainId) {
          // Automatically switch to the correct network
          await switchNetwork(chainId);
        }
      }

      // Create provider from window.ethereum
      const provider = new BrowserProvider(window.ethereum);

      // Request account access if needed
      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Get signer - this will use the currently connected account
      const signer = await provider.getSigner();
      
      // Verify the signer address matches the requested wallet address
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(
          `Please switch to wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} in MetaMask`
        );
      }

      // Create contract instance with signer
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      // Convert taskId to BigInt for the contract call
      const taskIndex = BigInt(taskId);

      console.log(`Calling markTaskCompleted with taskIndex: ${taskIndex} on contract: ${contractAddress}`);

      // Call markTaskCompleted
      const tx = await contract.markTaskCompleted(taskIndex, {
        gasLimit: 500000, // 500K gas should be enough for this operation
      });

      console.log(`Transaction hash: ${tx.hash}`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber || 0,
      };
    } catch (error: any) {
      console.error("Error marking task as completed:", error);
      throw new Error(
        error.message || "An error occurred while marking task as completed"
      );
    }
  }

  async function finalizeTurnaround(
    contractAddress: string,
    chainId: number,
    walletAddress: string
  ): Promise<{ transactionHash: string; blockNumber: number }> {
    validateAddress(contractAddress, "contract address");
    validateChainId(chainId);
    validateAddress(walletAddress, "wallet address");

    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Check if we're on the correct network first, and switch if needed
      if (typeof window.ethereum !== "undefined") {
        const currentChainIdHex = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;
        const currentChainId = parseInt(currentChainIdHex, 16);
        
        if (currentChainId !== chainId) {
          // Automatically switch to the correct network
          await switchNetwork(chainId);
        }
      }

      // Create provider from window.ethereum
      const provider = new BrowserProvider(window.ethereum);

      // Request account access if needed
      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Get signer - this will use the currently connected account
      // Note: The walletAddress parameter is used to verify the correct account is connected
      const signer = await provider.getSigner();
      
      // Verify the signer address matches the requested wallet address
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(
          `Please switch to wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} in MetaMask`
        );
      }

      // Create contract instance with signer
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      console.log(`Calling finalizeTurnaround on contract: ${contractAddress}`);

      // Call finalizeTurnaround
      const tx = await contract.finalizeTurnaround({
        gasLimit: 500000, // 500K gas should be enough for this operation
      });

      console.log(`Transaction hash: ${tx.hash}`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber || 0,
      };
    } catch (error: any) {
      console.error("Error finalizing turnaround:", error);
      throw new Error(
        error.message || "An error occurred while finalizing the turnaround"
      );
    }
  }

  async function ensureWalletIsActive(walletAddress: string): Promise<void> {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    // Get currently connected accounts
    const accounts = (await window.ethereum.request({
      method: "eth_accounts",
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts connected. Please connect your wallet in MetaMask.");
    }

    // Check if the selected wallet is in the connected accounts
    const isWalletConnected = accounts.some(
      (acc) => acc.toLowerCase() === walletAddress.toLowerCase()
    );

    if (!isWalletConnected) {
      throw new Error(
        `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} is not connected. Please connect it in MetaMask.`
      );
    }

    // Check if the selected wallet is the active account
    const activeAccount = accounts[0];
    if (activeAccount.toLowerCase() !== walletAddress.toLowerCase()) {
      // Request to switch accounts
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        // After requesting permissions, check again
        const newAccounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];
        const newActiveAccount = newAccounts[0];
        if (newActiveAccount.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error(
            `Please switch to wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} in MetaMask. Currently active: ${newActiveAccount.slice(0, 6)}...${newActiveAccount.slice(-4)}`
          );
        }
      } catch (err: any) {
        throw new Error(
          `Please switch to wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} in MetaMask. ${err.message || ""}`
        );
      }
    }
  }

  return (
    <Web3Context.Provider
      value={{
        isConnected,
        userAddress,
        connectWallet,
        disconnectWallet,
        signMessage,
        signEIP712TaskCompletion,
        getTasks,
        getTurnaroundState,
        markTaskCompleted,
        finalizeTurnaround,
        ensureWalletIsActive,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
