import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase/admin";
import { ethers } from "ethers";
import { getRpcUrl } from "@/app/lib/blockchain";
import { contractABI } from "@/app/lib/contractABI";
import { bytecode } from "@/app/lib/bytecode";

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
    const {
      chainId,
      opsAdmin,
      groundHandling,
      cleaning,
      fuel,
      catering,
      flightCrew,
      gate,
      turnaroundId,
      airport,
      scheduledArrival,
      scheduledDeparture,
    } = body;

    // Validate required parameters
    if (!chainId || (chainId !== 500 && chainId !== 501)) {
      return NextResponse.json(
        { error: "Chain ID must be 500 (Camino) or 501 (Columbus)" },
        { status: 400 }
      );
    }

    // Validate turnaroundId and airport
    if (!turnaroundId || typeof turnaroundId !== "string") {
      return NextResponse.json(
        { error: "turnaroundId is required" },
        { status: 400 }
      );
    }

    if (!airport || typeof airport !== "string") {
      return NextResponse.json(
        { error: "airport is required" },
        { status: 400 }
      );
    }

    // Validate scheduledArrival and scheduledDeparture
    if (scheduledArrival === undefined || scheduledArrival === null) {
      return NextResponse.json(
        { error: "scheduledArrival is required" },
        { status: 400 }
      );
    }

    if (scheduledDeparture === undefined || scheduledDeparture === null) {
      return NextResponse.json(
        { error: "scheduledDeparture is required" },
        { status: 400 }
      );
    }

    // Convert to BigInt for uint256
    const scheduledArrivalBigInt = typeof scheduledArrival === "string"
      ? BigInt(scheduledArrival)
      : BigInt(Number(scheduledArrival));
    
    const scheduledDepartureBigInt = typeof scheduledDeparture === "string"
      ? BigInt(scheduledDeparture)
      : BigInt(Number(scheduledDeparture));

    // Validate all addresses are provided
    const addresses = {
      opsAdmin,
      groundHandling,
      cleaning,
      fuel,
      catering,
      flightCrew,
      gate,
    };

    for (const [key, value] of Object.entries(addresses)) {
      if (!value || typeof value !== "string") {
        return NextResponse.json(
          { error: `${key} address is required` },
          { status: 400 }
        );
      }

      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
        return NextResponse.json(
          { error: `Invalid ${key} address format` },
          { status: 400 }
        );
      }
    }

    // Validate private key is available
    if (!process.env.NEXT_SECRET_PRIVATE_KEY) {
      return NextResponse.json(
        {
          error:
            "NEXT_SECRET_PRIVATE_KEY environment variable is required for contract deployment",
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
    console.log(`Deployer wallet: ${wallet.address}`);
    console.log(`Wallet balance: ${balanceEth} ETH`);

    if (balance === BigInt(0)) {
      return NextResponse.json(
        {
          error: `Wallet ${wallet.address} has no balance. Please fund the wallet to deploy contracts.`,
        },
        { status: 400 }
      );
    }

    // Check if we have enough balance for deployment (at least 0.01 ETH)
    const minBalance = ethers.parseEther("0.01");
    if (balance < minBalance) {
      console.warn(
        `Warning: Wallet balance (${balanceEth} ETH) is very low. Deployment may fail.`
      );
    }

    // Ensure bytecode starts with 0x
    const contractBytecode = bytecode.startsWith("0x")
      ? bytecode
      : `0x${bytecode}`;

    // Create contract factory
    const factory = new ethers.ContractFactory(
      contractABI,
      contractBytecode,
      wallet
    );

    console.log(`Deploying contract with parameters:`, {
      opsAdmin,
      groundHandling,
      cleaning,
      fuel,
      catering,
      flightCrew,
      gate,
      turnaroundId,
      airport,
      scheduledArrival: scheduledArrivalBigInt.toString(),
      scheduledDeparture: scheduledDepartureBigInt.toString(),
    });

    // Deploy the contract
    // Constructor order from ABI: opsAdmin, groundHandling, cleaning, fuel, catering, flightCrew, gate, turnaroundId, airport, scheduledArrival, scheduledDeparture
    const contract = await factory.deploy(
      opsAdmin,
      groundHandling,
      cleaning,
      fuel,
      catering,
      flightCrew,
      gate,
      turnaroundId,
      airport,
      scheduledArrivalBigInt,
      scheduledDepartureBigInt,
      {
        gasLimit: 5000000, // 5M gas should be enough for most contracts
      }
    );

    // Get the deployment transaction
    const deploymentTx = contract.deploymentTransaction();

    if (!deploymentTx) {
      return NextResponse.json(
        { error: "Failed to get deployment transaction" },
        { status: 500 }
      );
    }

    console.log(`Deployment transaction hash: ${deploymentTx.hash}`);

    // Get the contract address
    const address = await contract.getAddress();
    console.log(`Contract address: ${address}`);

    // Wait for contract deployment to complete
    await contract.waitForDeployment();
    console.log(`Contract successfully deployed at ${address}`);

    return NextResponse.json(
      {
        contractAddress: address,
        transactionHash: deploymentTx.hash,
        chainId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deploying contract:", error);
    return NextResponse.json(
      {
        error:
          error.message || "An error occurred while deploying the contract",
      },
      { status: 500 }
    );
  }
}

