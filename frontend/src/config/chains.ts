// Multi-Chain Configuration for REC-ONE
// Supports Lisk, Saga Chainlet, and BNB Smart Chain Testnet

export interface ChainConfig {
  id: string
  name: string
  displayName: string
  chainId: number
  rpcUrl: string
  wsUrl?: string
  blockExplorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  contractAddress?: string
  tokenAddress?: string
  icon: string
  description: string
  features: string[]
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  lisk: {
    id: 'lisk',
    name: 'lisk-sepolia',
    displayName: 'Lisk Sepolia',
    chainId: 4202,
    rpcUrl: 'https://rpc.sepolia-api.lisk.com',
    blockExplorer: 'https://sepolia-blockscout.lisk.com',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contractAddress: '0xC64Dc6F14F2d127d3F3E3c99a1372e5617648F08',
    icon: '⚡',
    description: 'Lisk Sepolia Testnet - Fast and efficient blockchain for energy trading',
    features: ['Low fees', 'Fast transactions', 'Ethereum compatible']
  },
  
  saga: {
    id: 'saga',
    name: 'devpros-chainlet',
    displayName: 'DevPros Saga Chainlet',
    chainId: 2749656616387000, // Will be converted to hex
    rpcUrl: 'https://devpros-2749656616387000-1.jsonrpc.sagarpc.io',
    wsUrl: 'https://devpros-2749656616387000-1.ws.sagarpc.io',
    blockExplorer: 'https://devpros-2749656616387000-1.sagaexplorer.io',
    nativeCurrency: {
      name: 'DevPros Saga Token',
      symbol: 'DPSV',
      decimals: 18
    },
    icon: '🌟',
    description: 'Saga Chainlet - Dedicated blockchain for DevPros energy marketplace',
    features: ['Dedicated chainlet', 'Custom gas settings', 'High performance']
  },
  
  bnb: {
    id: 'bnb',
    name: 'bsc-testnet',
    displayName: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    wsUrl: 'wss://bsc-testnet-rpc.publicnode.com',
    blockExplorer: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18
    },
    tokenAddress: '0xFBF7B3Cf3938A29099F76e511dE96a7e316Fdf33', // VNST Testnet
    icon: '💰',
    description: 'BNB Smart Chain Testnet - Trade with VNST stablecoin',
    features: ['VNST stablecoin', 'Stable pricing', 'BSC ecosystem']
  }
}

export const DEFAULT_CHAIN = 'lisk'

// Helper functions
export function getChainConfig(chainId: string | number): ChainConfig | null {
  if (typeof chainId === 'number') {
    return Object.values(SUPPORTED_CHAINS).find(chain => chain.chainId === chainId) || null
  }
  return SUPPORTED_CHAINS[chainId] || null
}

export function isChainSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).some(chain => chain.chainId === chainId)
}

export function getChainByChainId(chainId: number): ChainConfig | null {
  return Object.values(SUPPORTED_CHAINS).find(chain => chain.chainId === chainId) || null
}

// Network switching helpers
export async function switchToChain(chainConfig: ChainConfig): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  try {
    // Convert chainId to hex
    const chainIdHex = `0x${chainConfig.chainId.toString(16)}`
    
    // Try to switch to the chain
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    })
    
    return true
  } catch (switchError: any) {
    // Chain not added to MetaMask, try to add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainConfig.chainId.toString(16)}`,
            chainName: chainConfig.displayName,
            nativeCurrency: chainConfig.nativeCurrency,
            rpcUrls: [chainConfig.rpcUrl],
            blockExplorerUrls: [chainConfig.blockExplorer]
          }]
        })
        return true
      } catch (addError) {
        console.error('Failed to add chain:', addError)
        return false
      }
    } else {
      console.error('Failed to switch chain:', switchError)
      return false
    }
  }
}

// Contract ABI (same for all chains)
export const ENERGY_TRADING_ABI = [
  "function createOffer(uint256 quantity, uint256 price) external returns (uint256)",
  "function purchaseOffer(uint256 offerId) external payable",
  "function getOffer(uint256 offerId) external view returns (tuple(uint256 id, address seller, uint256 quantity, uint256 price, bool isActive, uint256 timestamp))",
  "function getActiveOffers() external view returns (uint256[])",
  "function getUserOffers(address user) external view returns (uint256[])",
  "function cancelOffer(uint256 offerId) external",
  "function getOfferCount() external view returns (uint256)",
  "event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 quantity, uint256 price)",
  "event OfferPurchased(uint256 indexed offerId, address indexed buyer, address indexed seller, uint256 quantity, uint256 price)",
  "event OfferCancelled(uint256 indexed offerId, address indexed seller)"
]

// ERC20 ABI for VNST token
export const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]
