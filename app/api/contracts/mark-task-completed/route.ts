import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase/admin";
import { ethers } from "ethers";
import { getRpcUrl } from "@/app/lib/blockchain";
import { contractABI } from "@/app/lib/contractABI";

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth({
    checkAdmin: false,
    authHeader: request.headers.get("Authorization"),
  });

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { contractAddress, chainId, taskId, signature, signerAddress, message } = body;

    // Validate required parameters
    if (!contractAddress || typeof contractAddress !== "string") {
      return NextResponse.json(
        { error: "contractAddress is required" },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: "Invalid contractAddress format" },
        { status: 400 }
      );
    }

    if (!chainId || (chainId !== 500 && chainId !== 501)) {
      return NextResponse.json(
        { error: "Chain ID must be 500 (Camino) or 501 (Columbus)" },
        { status: 400 }
      );
    }

    if (taskId === undefined || taskId === null) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    // Validate signature if provided
    if (signature && signerAddress && message) {
      // Verify the signature
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
          return NextResponse.json(
            { error: "Invalid signature: recovered address does not match signer address" },
            { status: 400 }
          );
        }
        console.log(`Signature verified for address: ${signerAddress}`);
      } catch (sigError: any) {
        return NextResponse.json(
          { error: `Invalid signature: ${sigError.message}` },
          { status: 400 }
        );
      }
    } else {
      // Signature is optional for backward compatibility, but recommended
      console.warn("Task completion request without signature");
    }

    // Validate private key is available
    if (!process.env.NEXT_SECRET_PRIVATE_KEY) {
      return NextResponse.json(
        {
          error:
            "NEXT_SECRET_PRIVATE_KEY environment variable is required for contract interaction",
        },
        { status: 500 }
      );
    }

    // Get RPC URL for the chain
    const rpcUrl = getRpcUrl(chainId);

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(
      process.env.NEXT_SECRET_PRIVATE_KEY,
      provider
    );

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Wallet balance: ${balanceEth} ETH`);

    if (balance === BigInt(0)) {
      return NextResponse.json(
        {
          error: `Wallet ${wallet.address} has no balance. Please fund the wallet to interact with contracts.`,
        },
        { status: 400 }
      );
    }

    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      wallet
    );

    // Convert taskId to uint256 (handle both string and number)
    const taskIndex = typeof taskId === "string" 
      ? BigInt(taskId) 
      : BigInt(Number(taskId));

    console.log(`Calling markTaskCompleted with taskIndex: ${taskIndex}`);

    // Call markTaskCompleted
    const tx = await contract.markTaskCompleted(taskIndex, {
      gasLimit: 500000, // 500K gas should be enough for this operation
    });

    console.log(`Transaction hash: ${tx.hash}`);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

    return NextResponse.json(
      {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        chainId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error marking task as completed:", error);
    return NextResponse.json(
      {
        error:
          error.message || "An error occurred while marking task as completed",
      },
      { status: 500 }
    );
  }
}

