/**
 * Blockchain network configuration
 * Maps chain IDs to their RPC URLs (static networks only)
 * Ethereum networks (1, 11155111) are handled dynamically in getRpcUrl()
 */
export const BLOCKCHAIN_NETWORKS = {
  500: "https://api.camino.network/ext/bc/C/rpc", // Camino
  501: "https://columbus.camino.network/ext/bc/C/rpc", // Columbus
} as const;

/**
 * Supported chain IDs
 * 500 = Camino
 * 501 = Columbus
 */
export type ChainId = 500 | 501 | keyof typeof BLOCKCHAIN_NETWORKS;

/**
 * Blockchain network display names
 * Maps chain IDs to their display names
 */
export const BLOCKCHAIN_DISPLAY_NAMES = {
  500: "Camino (Mainnet)",
  501: "Columbus (Testnet)",
} as const;

/**
 * Blockchain explorer URLs
 * Maps chain IDs to their explorer URLs
 */
export const BLOCKCHAIN_EXPLORERS = {
  500: "https://caminoscan.com", // Camino
  501: "https://columbus.caminoscan.com", // Columbus
} as const;

/**
 * Get the RPC URL for a given chain ID
 * @param chainId - The chain ID (500 for Camino, 501 for Columbus)
 * @returns The RPC URL for the network
 * @throws Error if chainId is not supported
 */
export function getRpcUrl(chainId: number): string {
  // For Camino networks, use the static configuration
  if (chainId === 500 || chainId === 501) {
    const rpcUrl =
      BLOCKCHAIN_NETWORKS[chainId as keyof typeof BLOCKCHAIN_NETWORKS];
    return rpcUrl;
  }

  throw new Error(
    `Unsupported chain ID: ${chainId}. Supported chain IDs are: 500 (Camino), 501 (Columbus)`
  );
}

/**
 * Get the explorer URL for a given chain ID and address
 * @param chainId - The chain ID (500 for Camino, 501 for Columbus)
 * @param address - The contract or address to view
 * @returns The explorer URL for the address
 * @throws Error if chainId is not supported
 */
export function getExplorerUrl(chainId: number, address: string): string {
  const explorerBaseUrl =
    BLOCKCHAIN_EXPLORERS[chainId as keyof typeof BLOCKCHAIN_EXPLORERS];
  return `${explorerBaseUrl}/address/${address}`;
}

/**
 * Get the explorer URL for a given chain ID and transaction hash
 * @param chainId - The chain ID (500 for Camino, 501 for Columbus)
 * @param txHash - The transaction hash to view
 * @returns The explorer URL for the transaction
 * @throws Error if chainId is not supported
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const explorerBaseUrl =
    BLOCKCHAIN_EXPLORERS[chainId as keyof typeof BLOCKCHAIN_EXPLORERS];
  return `${explorerBaseUrl}/tx/${txHash}`;
}

/**
 * Get the display name for a given chain ID
 * @param chainId - The chain ID (500 for Camino, 501 for Columbus)
 * @returns The display name for the network
 * @throws Error if chainId is not supported
 */
export function getDisplayName(chainId: number): string {
  const displayName =
    BLOCKCHAIN_DISPLAY_NAMES[chainId as keyof typeof BLOCKCHAIN_DISPLAY_NAMES];
  return displayName;
}
