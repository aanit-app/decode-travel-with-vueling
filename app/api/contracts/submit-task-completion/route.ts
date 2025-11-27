import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { ethers } from "ethers";
import { getRpcUrl } from "@/app/lib/blockchain";

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
      turnaroundId,
      contractAddress,
      chainId,
      taskId,
      signerAddress,
      signature,
      message,
      timestamp,
    } = body;

    // Validate required parameters
    if (!turnaroundId || typeof turnaroundId !== "string") {
      return NextResponse.json(
        { error: "turnaroundId is required" },
        { status: 400 }
      );
    }

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

    if (!signerAddress || typeof signerAddress !== "string") {
      return NextResponse.json(
        { error: "signerAddress is required" },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(signerAddress)) {
      return NextResponse.json(
        { error: "Invalid signerAddress format" },
        { status: 400 }
      );
    }

    if (!signature || typeof signature !== "string") {
      return NextResponse.json(
        { error: "signature is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "object") {
      return NextResponse.json(
        { error: "message is required and must be an object" },
        { status: 400 }
      );
    }

    if (!timestamp || typeof timestamp !== "number") {
      return NextResponse.json(
        { error: "timestamp is required and must be a number" },
        { status: 400 }
      );
    }

    if (taskId === undefined || taskId === null) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    if (!chainId || (chainId !== 500 && chainId !== 501)) {
      return NextResponse.json(
        { error: "Chain ID must be 500 (Camino) or 501 (Columbus)" },
        { status: 400 }
      );
    }

    // Validate timestamp is within 10 seconds
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - timestamp);
    
    if (timeDifference > 10) {
      return NextResponse.json(
        {
          error: `Timestamp is too old. Difference: ${timeDifference} seconds (max 10 seconds allowed)`,
        },
        { status: 400 }
      );
    }

    // Verify EIP712 signature
    try {
      const rpcUrl = getRpcUrl(chainId);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Reconstruct the EIP712 domain and types
      const domain = {
        name: "TurnaroundTaskCompletion",
        version: "1",
        chainId: chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        TaskCompletion: [
          { name: "turnaroundId", type: "string" },
          { name: "taskId", type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      };

      // Verify the signature
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        message,
        signature
      );

      if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
        return NextResponse.json(
          {
            error:
              "Invalid signature: recovered address does not match signer address",
          },
          { status: 400 }
        );
      }

      console.log(`EIP712 signature verified for address: ${signerAddress}`);
    } catch (sigError: any) {
      return NextResponse.json(
        { error: `Invalid signature: ${sigError.message}` },
        { status: 400 }
      );
    }

    // Generate receipt signature from backend
    if (!process.env.NEXT_SECRET_PRIVATE_KEY) {
      return NextResponse.json(
        {
          error:
            "NEXT_SECRET_PRIVATE_KEY environment variable is required for receipt signature",
        },
        { status: 500 }
      );
    }

    const receiptWallet = new ethers.Wallet(process.env.NEXT_SECRET_PRIVATE_KEY);
    
    // Create receipt message
    const receiptMessage = {
      turnaroundId: turnaroundId,
      taskId: taskId,
      timestamp: timestamp,
      signerAddress: signerAddress,
      originalSignature: signature,
    };

    // Sign receipt with backend wallet
    const receiptSignature = await receiptWallet.signMessage(
      JSON.stringify(receiptMessage)
    );

    // Prepare data to store in Firestore
    const taskCompletionData = {
      turnaroundId,
      contractAddress,
      chainId,
      taskId: Number(taskId),
      signerAddress,
      signature,
      message,
      timestamp,
      receiptSignature,
      receiptSigner: receiptWallet.address,
      submittedAt: new Date(),
    };

    // Store in Firestore subcollection
    const db = getAdminFirestore();
    const turnaroundRef = db.collection("turnarounds").doc(turnaroundId);
    const taskCompletionsRef = turnaroundRef.collection("taskCompletions");
    
    // Convert Date to Firestore Timestamp
    const taskCompletionDataWithTimestamp = {
      ...taskCompletionData,
      submittedAt: new Date(),
    };
    
    await taskCompletionsRef.add(taskCompletionDataWithTimestamp);

    console.log(
      `Task completion submitted for turnaround ${turnaroundId}, task ${taskId}`
    );

    return NextResponse.json(
      {
        success: true,
        receiptSignature,
        receiptSigner: receiptWallet.address,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error submitting task completion:", error);
    return NextResponse.json(
      {
        error:
          error.message || "An error occurred while submitting task completion",
      },
      { status: 500 }
    );
  }
}

