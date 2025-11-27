"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Input, 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from "@heroui/react";
import { useAuth } from "../../contexts/AuthContext";
import { useWeb3 } from "../../contexts/Web3Context";
import { H1, Body } from "../../components/typography";
import { Wallet } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const { signIn, user, loading } = useAuth();
  const { connectWallet, isConnected } = useWeb3();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Redirect if wallet is connected
  useEffect(() => {
    if (isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleWalletSignInClick = () => {
    onOpen();
  };

  const handleWalletSignInConfirm = async () => {
    onClose();
    setError(null);
    setIsConnectingWallet(true);

    try {
      await connectWallet();
      // The useEffect will handle redirect when isConnected becomes true
    } catch (err: any) {
      let errorMessage = "Failed to connect wallet. Please try again.";
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof window.ethereum === "undefined") {
        errorMessage = "Please install MetaMask to use this feature.";
      }

      setError(errorMessage);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/");
    } catch (err: any) {
      // Handle Firebase auth errors
      let errorMessage = "Failed to sign in. Please try again.";
      
      if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-8">
        <Card className="w-full max-w-md">
          <CardBody className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <Body>Loading...</Body>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-8">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6">
          <H1 className="text-center">Sign In</H1>
          <Body className="text-center text-gray-600 dark:text-gray-400">
            Enter your credentials to access your account
          </Body>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              isDisabled={isLoading}
              autoComplete="email"
              classNames={{
                input: "text-base",
                label: "text-base",
              }}
            />
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
              isDisabled={isLoading}
              autoComplete="current-password"
              classNames={{
                input: "text-base",
                label: "text-base",
              }}
            />
            
            {error && (
              <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              color="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              isDisabled={isLoading || isConnectingWallet || !email || !password}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <Divider className="flex-1" />
            <Body className="text-xs text-gray-500 dark:text-gray-400">OR</Body>
            <Divider className="flex-1" />
          </div>

          <Button
            type="button"
            variant="bordered"
            size="lg"
            className="w-full"
            isLoading={isConnectingWallet}
            isDisabled={isLoading || isConnectingWallet}
            onPress={handleWalletSignInClick}
            startContent={!isConnectingWallet ? <Wallet className="w-5 h-5" /> : undefined}
          >
            {isConnectingWallet ? "Connecting..." : "Sign in with Wallet"}
          </Button>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <H1 className="text-xl">Confirm Wallet Connection</H1>
              </ModalHeader>
              <ModalBody>
                <Body>
                  By connecting your wallet, you confirm that it will be used to sign in to your account. 
                  Please make sure you're connecting the correct wallet address.
                </Body>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleWalletSignInConfirm}
                  startContent={<Wallet className="w-4 h-4" />}
                >
                  Confirm & Connect
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

