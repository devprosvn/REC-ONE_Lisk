import './energy-style.css'
import { ethers } from 'ethers'
import { apiClient } from './api/client.js'
import { offerManagement } from './offer-management.js'

// Smart Contract Configuration
const CONTRACT_ADDRESS = '0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7' // Deployed on Lisk Sepolia

// Check if contract is deployed
async function checkContractDeployment(): Promise<boolean> {
  try {
    if (!provider) return false

    const code = await provider.getCode(CONTRACT_ADDRESS)
    const isDeployed = code !== '0x'

    console.log('📋 Contract deployment check:', {
      address: CONTRACT_ADDRESS,
      deployed: isDeployed,
      codeLength: code.length
    })

    return isDeployed
  } catch (error) {
    console.error('❌ Failed to check contract deployment:', error)
    return false
  }
}
const LISK_SEPOLIA_CONFIG = {
  chainId: '0x106A', // 4202 in hex
  chainName: 'Lisk Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://rpc.sepolia-api.lisk.com'],
  blockExplorerUrls: ['https://sepolia-blockscout.lisk.com']
}

// Smart Contract ABI (simplified for main functions)
const CONTRACT_ABI = [
  "function generateEnergyReading(uint256 _quantity) external",
  "function createOffer(uint256 _quantity, uint256 _price) external",
  "function purchaseOffer(uint256 _offerId) external payable",
  "function getEnergyBalance(address _user) external view returns (uint256)",
  "function getActiveOffers() external view returns (uint256[])",
  "function getOffer(uint256 _offerId) external view returns (tuple(uint256 id, address seller, uint256 quantity, uint256 price, bool isActive, uint256 timestamp))",
  "event EnergyGenerated(address indexed user, uint256 quantity, uint256 timestamp)",
  "event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 quantity, uint256 price)",
  "event OfferPurchased(uint256 indexed offerId, address indexed buyer, address indexed seller, uint256 quantity, uint256 totalPrice)"
]

// Global variables
let provider: ethers.BrowserProvider | null = null
let signer: ethers.JsonRpcSigner | null = null
let contract: ethers.Contract | null = null
let userAddress: string = ''
let offersRefreshInterval: NodeJS.Timeout | null = null
let userEnergyBalance: any = null

// DOM Elements
const connectWalletBtn = document.getElementById('connect-wallet') as HTMLButtonElement
const checkContractBtn = document.getElementById('check-contract') as HTMLButtonElement
const refreshOffersBtn = document.getElementById('refresh-offers') as HTMLButtonElement
const refreshBalanceBtn = document.getElementById('refresh-balance') as HTMLButtonElement
const lastUpdatedSpan = document.getElementById('last-updated') as HTMLSpanElement
const userAddressSpan = document.getElementById('user-address') as HTMLSpanElement
const lskBalanceSpan = document.getElementById('lsk-balance') as HTMLSpanElement
const energyBalanceSpan = document.getElementById('energy-balance') as HTMLSpanElement
const availableEnergySpan = document.getElementById('available-energy') as HTMLSpanElement
const contractStatusSpan = document.getElementById('contract-status') as HTMLSpanElement

// Energy balance elements
const totalGeneratedSpan = document.getElementById('total-generated') as HTMLSpanElement
const totalSoldSpan = document.getElementById('total-sold') as HTMLSpanElement
const pendingOffersSpan = document.getElementById('pending-offers') as HTMLSpanElement
const maxCanSellSpan = document.getElementById('max-can-sell') as HTMLSpanElement
const maxQuantityHintSpan = document.getElementById('max-quantity-hint') as HTMLSpanElement
const offerValidationDiv = document.getElementById('offer-validation') as HTMLDivElement
const generateEnergyBtn = document.getElementById('generate-energy') as HTMLButtonElement
const energyAmountInput = document.getElementById('energy-amount') as HTMLInputElement
const createOfferBtn = document.getElementById('create-offer') as HTMLButtonElement
const offerQuantityInput = document.getElementById('offer-quantity') as HTMLInputElement
const offerPriceInput = document.getElementById('offer-price') as HTMLInputElement
const suggestPriceBtn = document.getElementById('suggest-price') as HTMLButtonElement
const tariffDisplay = document.getElementById('tariff-display') as HTMLDivElement
const priceDisplay = document.getElementById('price-display') as HTMLDivElement
const offersContainer = document.getElementById('offers-container') as HTMLDivElement
const loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement
const loadingText = document.getElementById('loading-text') as HTMLParagraphElement
const statusMessages = document.getElementById('status-messages') as HTMLDivElement

// Utility Functions
function showLoading(text: string = 'Processing...') {
  loadingText.textContent = text
  loadingOverlay.classList.remove('hidden')
}

function hideLoading() {
  loadingOverlay.classList.add('hidden')
}

function showStatus(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  const statusDiv = document.createElement('div')
  statusDiv.className = `status-message ${type}`
  statusDiv.textContent = message
  statusMessages.appendChild(statusDiv)
  
  setTimeout(() => {
    statusDiv.remove()
  }, 5000)
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatEther(value: bigint): string {
  return parseFloat(ethers.formatEther(value)).toFixed(4)
}

// Vietnam Electricity Pricing System (EVN Tariff)
const VN_ELECTRICITY_TARIFF = [
  { min: 0, max: 50, price: 1984, tier: 'Tier 1' },      // Tier 1: 0-50 kWh
  { min: 51, max: 100, price: 2050, tier: 'Tier 2' },    // Tier 2: 51-100 kWh
  { min: 101, max: 200, price: 2380, tier: 'Tier 3' },   // Tier 3: 101-200 kWh
  { min: 201, max: 300, price: 2998, tier: 'Tier 4' },   // Tier 4: 201-300 kWh
  { min: 301, max: 400, price: 3350, tier: 'Tier 5' },   // Tier 5: 301-400 kWh
  { min: 401, max: Infinity, price: 3460, tier: 'Tier 6' } // Tier 6: 401+ kWh
]

// Current exchange rates (should be updated regularly)
const EXCHANGE_RATES = {
  VND_TO_USD: 24000, // 1 USD = 24,000 VND (approximate)
  ETH_TO_USD: 2000   // 1 ETH = 2,000 USD (approximate, should be fetched from API)
}

// Calculate Vietnam electricity price for given kWh
function calculateVNElectricityPrice(kWh: number): { totalVND: number, breakdown: any[] } {
  let totalVND = 0
  let remainingKWh = kWh
  const breakdown = []

  for (const tier of VN_ELECTRICITY_TARIFF) {
    if (remainingKWh <= 0) break

    const tierMin = tier.min
    const tierMax = tier.max === Infinity ? remainingKWh + tierMin - 1 : tier.max
    const tierKWh = Math.min(remainingKWh, tierMax - tierMin + 1)

    if (tierKWh > 0) {
      const tierCost = tierKWh * tier.price
      totalVND += tierCost

      breakdown.push({
        tier: tier.tier,
        range: tier.max === Infinity ? `${tierMin}+ kWh` : `${tierMin}-${tierMax} kWh`,
        kWh: tierKWh,
        pricePerKWh: tier.price,
        totalCost: tierCost
      })

      remainingKWh -= tierKWh
    }
  }

  return { totalVND, breakdown }
}

// Convert VND to ETH for blockchain transactions
function convertVNDtoETH(vndAmount: number): string {
  const usdAmount = vndAmount / EXCHANGE_RATES.VND_TO_USD
  const ethAmount = usdAmount / EXCHANGE_RATES.ETH_TO_USD
  return ethAmount.toFixed(6)
}

// Convert ETH to VND for display
function convertETHtoVND(ethAmount: string): number {
  const ethValue = parseFloat(ethAmount)
  const usdValue = ethValue * EXCHANGE_RATES.ETH_TO_USD
  const vndValue = usdValue * EXCHANGE_RATES.VND_TO_USD
  return Math.round(vndValue)
}

// Format VND currency
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount)
}

// Get suggested price for energy based on Vietnam tariff
function getSuggestedEnergyPrice(kWh: number): { vnd: number, eth: string, breakdown: any[] } {
  const { totalVND, breakdown } = calculateVNElectricityPrice(kWh)
  const averagePriceVND = totalVND / kWh

  // Add a small margin for P2P trading (5-10%)
  const tradingPriceVND = Math.round(averagePriceVND * 1.05)
  const tradingPriceETH = convertVNDtoETH(tradingPriceVND)

  return {
    vnd: tradingPriceVND,
    eth: tradingPriceETH,
    breakdown
  }
}

// Check if user is connected
function isWalletConnected(): boolean {
  return provider !== null && signer !== null && userAddress !== ''
}

// Get network name from chain ID
function getNetworkName(chainId: bigint): string {
  switch (chainId) {
    case 1n: return 'Ethereum Mainnet'
    case 11155111n: return 'Sepolia Testnet'
    case 4202n: return 'Lisk Sepolia'
    default: return `Unknown Network (${chainId})`
  }
}

// Validate input values
function validateEnergyAmount(value: string): { valid: boolean; error?: string } {
  const num = parseInt(value)
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Please enter a valid positive number' }
  }
  if (num > 10000) {
    return { valid: false, error: 'Energy amount too large (max: 10,000 kWh)' }
  }
  return { valid: true }
}

function validatePrice(value: string): { valid: boolean; error?: string } {
  const num = parseFloat(value)
  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a valid number' }
  }
  if (num <= 0) {
    return { valid: false, error: 'Price must be greater than 0 ETH/kWh' }
  }
  if (num < 0.000001) {
    return { valid: false, error: 'Price too low (min: 0.000001 ETH/kWh)' }
  }
  if (num > 1) {
    return { valid: false, error: 'Price too high (max: 1 ETH/kWh)' }
  }
  return { valid: true }
}

// Copy text to clipboard
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Fast Wallet Connection
async function connectWallet() {
  try {
    // Quick MetaMask detection
    if (!isMetaMaskInstalled()) {
      showStatus('MetaMask is not installed. Please install MetaMask extension.', 'error')
      window.open('https://metamask.io/download/', '_blank')
      return false
    }

    showLoading('Connecting to MetaMask...')

    // Fast connection request - this should open MetaMask popup immediately
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
      params: []
    })

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from MetaMask')
    }

    // Quick provider initialization
    provider = new ethers.BrowserProvider(window.ethereum)
    signer = await provider.getSigner()
    userAddress = await signer.getAddress()

    console.log('✅ Connected to wallet:', userAddress)

    // Update UI immediately
    updateWalletUI()

    // Do network check and contract init in background
    Promise.all([
      ensureCorrectNetwork(),
      initializeContract(),
      updateBalances(),
      updateEnergyBalance(),
      loadOffers()
    ]).then(() => {
      console.log('✅ All wallet setup completed')
      // Start auto-refresh for offers
      startOffersAutoRefresh()
    }).catch(error => {
      console.warn('Background setup error:', error)
    })

    // Store connection state in localStorage
    localStorage.setItem('walletConnected', 'true')
    localStorage.setItem('lastConnectedWallet', userAddress.toLowerCase())

    showStatus('✅ Wallet connected successfully!', 'success')
    hideLoading()
    return true

  } catch (error: any) {
    console.error('❌ Error connecting wallet:', error)

    // Handle specific error types
    if (error.code === 4001) {
      showStatus('Connection rejected by user', 'warning')
    } else if (error.code === -32002) {
      showStatus('Connection request already pending. Please check MetaMask.', 'warning')
    } else if (error.message?.includes('User rejected')) {
      showStatus('Connection rejected by user', 'warning')
    } else {
      showStatus(`Failed to connect wallet: ${error.message}`, 'error')
    }

    hideLoading()
    return false
  }
}

// Fast MetaMask detection
function isMetaMaskInstalled(): boolean {
  return !!(window.ethereum && window.ethereum.isMetaMask)
}

// Fast network check and switch
async function ensureCorrectNetwork() {
  if (!provider) return

  try {
    const network = await provider.getNetwork()
    console.log('📡 Current network:', network.chainId, network.name)

    if (network.chainId !== 4202n) {
      console.log('🔄 Switching to Lisk Sepolia...')

      // Try to switch to Lisk Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: LISK_SEPOLIA_CONFIG.chainId }]
      })
      console.log('✅ Switched to Lisk Sepolia')
    } else {
      console.log('✅ Already on Lisk Sepolia')
    }
  } catch (switchError: any) {
    // If network doesn't exist, add it
    if (switchError.code === 4902) {
      console.log('➕ Adding Lisk Sepolia network...')
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [LISK_SEPOLIA_CONFIG]
      })
      console.log('✅ Lisk Sepolia network added')
    } else if (switchError.code === 4001) {
      console.log('⚠️ User rejected network switch')
      showStatus('Please switch to Lisk Sepolia network manually', 'warning')
    } else {
      console.warn('⚠️ Network switch error:', switchError)
    }
  }
}

// Smart contract initialization with better error handling
async function initializeContract() {
  if (!signer) {
    console.warn('⚠️ Signer not available for contract initialization')
    showStatus('Please connect wallet first', 'warning')
    return
  }

  try {
    // Check if we're on the correct network
    const network = await provider!.getNetwork()
    if (network.chainId !== 4202n) {
      console.warn('⚠️ Wrong network. Expected Lisk Sepolia (4202), got:', network.chainId.toString())
      showStatus('Please switch to Lisk Sepolia network', 'warning')
      return
    }

    // Check if contract is deployed first
    const isDeployed = await checkContractDeployment()
    if (!isDeployed) {
      console.error('❌ Contract not deployed at address:', CONTRACT_ADDRESS)
      showStatus('Error: Smart contract not deployed on this network', 'error')
      updateContractStatus('❌ Not deployed')
      return
    }

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
    console.log('📄 Smart contract initialized:', CONTRACT_ADDRESS)
    console.log('🌐 Network:', network.name, 'Chain ID:', network.chainId.toString())

    // Test contract connection with timeout
    const testPromise = contract.getFunction('getEnergyBalance')(userAddress)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Contract call timeout')), 8000)
    )

    try {
      await Promise.race([testPromise, timeoutPromise])
      console.log('✅ Contract connection verified successfully')
      showStatus('✅ Smart contract connected successfully', 'success')
      updateContractStatus('✅ Connected')
    } catch (testError) {
      console.warn('⚠️ Contract test failed:', testError)
      showStatus('Warning: Contract connection unstable, but will continue', 'warning')
      updateContractStatus('⚠️ Unstable')

      // Still allow usage but with warning
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
    }

  } catch (error: any) {
    console.error('❌ Contract initialization failed:', error)

    let errorMessage = 'Smart contract connection failed'
    if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network connection error. Please check your internet connection.'
    } else if (error.code === 'INVALID_ARGUMENT') {
      errorMessage = 'Invalid contract configuration. Please contact support.'
    } else if (error.message?.includes('network')) {
      errorMessage = 'Please switch to Lisk Sepolia network'
    }

    showStatus(`Warning: ${errorMessage}`, 'warning')
  }
}

// Update contract status display
function updateContractStatus(status: string) {
  if (contractStatusSpan) {
    contractStatusSpan.textContent = status
    contractStatusSpan.className = 'value'

    if (status.includes('✅')) {
      contractStatusSpan.style.color = '#28a745'
    } else if (status.includes('⚠️')) {
      contractStatusSpan.style.color = '#ffc107'
    } else if (status.includes('❌')) {
      contractStatusSpan.style.color = '#dc3545'
    } else {
      contractStatusSpan.style.color = '#6c757d'
    }
  }
}

// Manual contract check
async function manualContractCheck() {
  if (!provider) {
    showStatus('Please connect wallet first', 'warning')
    return
  }

  showLoading('Checking contract status...')

  try {
    const isDeployed = await checkContractDeployment()

    if (isDeployed) {
      updateContractStatus('✅ Deployed')

      if (signer) {
        // Try to initialize contract
        await initializeContract()
      } else {
        showStatus('Contract deployed but signer not available', 'warning')
      }
    } else {
      updateContractStatus('❌ Not deployed')
      showStatus('Contract not deployed on this network', 'error')
    }
  } catch (error) {
    console.error('Manual contract check failed:', error)
    updateContractStatus('❌ Check failed')
    showStatus('Failed to check contract status', 'error')
  } finally {
    hideLoading()
  }
}

// Disconnect wallet
async function disconnectWallet() {
  try {
    // Reset all state
    provider = null
    signer = null
    contract = null
    userAddress = ''

    // Stop auto-refresh
    stopOffersAutoRefresh()

    // Clear stored connection state
    localStorage.removeItem('walletConnected')
    localStorage.removeItem('lastConnectedWallet')

    // Update UI
    updateWalletUI()
    lskBalanceSpan.textContent = '0 ETH'
    energyBalanceSpan.textContent = '0 kWh'
    updateContractStatus('Not connected')
    updateLastUpdated('error')
    offersContainer.innerHTML = '<p class="no-offers">Please connect your wallet to see offers.</p>'

    // Hide check contract button
    if (checkContractBtn) {
      checkContractBtn.style.display = 'none'
    }

    showStatus('Wallet disconnected', 'success')
  } catch (error) {
    console.error('Error disconnecting wallet:', error)
  }
}

// Update Wallet UI
function updateWalletUI() {
  const myOffersBtn = document.getElementById('my-offers-btn') as HTMLButtonElement

  if (userAddress) {
    connectWalletBtn.textContent = '🔗 Connected'
    connectWalletBtn.classList.add('btn-success')
    connectWalletBtn.classList.remove('btn-primary')
    connectWalletBtn.onclick = disconnectWallet
    userAddressSpan.textContent = formatAddress(userAddress)
    userAddressSpan.title = userAddress // Show full address on hover

    // Show check contract button
    if (checkContractBtn) {
      checkContractBtn.style.display = 'inline-block'
    }

    // Enable offer management button
    if (myOffersBtn) {
      myOffersBtn.disabled = false
      offerManagement.setUserWallet(userAddress)
    }
  } else {
    connectWalletBtn.textContent = '🔌 Connect MetaMask'
    connectWalletBtn.classList.add('btn-primary')
    connectWalletBtn.classList.remove('btn-success')
    connectWalletBtn.onclick = connectWallet
    userAddressSpan.textContent = 'Not connected'
    userAddressSpan.title = ''

    // Hide check contract button
    if (checkContractBtn) {
      checkContractBtn.style.display = 'none'
    }

    // Disable offer management button
    if (myOffersBtn) {
      myOffersBtn.disabled = true
      offerManagement.setUserWallet(null)
    }
  }
}

// Update Balances including energy balance from backend
async function updateBalances() {
  if (!userAddress) return

  try {
    // Get LSK balance
    if (provider) {
      const balance = await provider.getBalance(userAddress)
      lskBalanceSpan.textContent = `${formatEther(balance)} ETH`
    }

    // Get energy balance from contract
    if (contract) {
      try {
        const energyBalance = await contract.getEnergyBalance(userAddress)
        energyBalanceSpan.textContent = `${energyBalance.toString()} kWh`
      } catch (contractError) {
        console.warn('Contract energy balance failed:', contractError)
        energyBalanceSpan.textContent = 'N/A'
      }
    }

    // Get detailed energy balance from backend
    await updateEnergyBalance()

  } catch (error) {
    console.error('Error updating balances:', error)
    lskBalanceSpan.textContent = 'Error'
    energyBalanceSpan.textContent = 'Error'
  }
}

// Update energy balance from backend
async function updateEnergyBalance() {
  if (!userAddress) {
    console.warn('No user address available for balance update')
    return
  }

  try {
    console.log('📊 Fetching energy balance for:', userAddress)
    const response = await apiClient.getUserEnergyBalance(userAddress)

    if (response.success) {
      userEnergyBalance = response.data

      console.log('✅ Energy balance received:', userEnergyBalance)

      // Update UI elements with animation
      if (totalGeneratedSpan) {
        totalGeneratedSpan.textContent = `${userEnergyBalance.totalGenerated} kWh`
        totalGeneratedSpan.style.color = userEnergyBalance.totalGenerated > 0 ? '#28a745' : '#666'
      }
      if (totalSoldSpan) {
        totalSoldSpan.textContent = `${userEnergyBalance.totalSold} kWh`
      }
      if (pendingOffersSpan) {
        pendingOffersSpan.textContent = `${userEnergyBalance.pendingOffers} kWh`
      }
      if (maxCanSellSpan) {
        maxCanSellSpan.textContent = `${userEnergyBalance.maxCanSell} kWh`
        maxCanSellSpan.style.color = userEnergyBalance.maxCanSell > 0 ? '#1976d2' : '#666'
      }
      if (maxQuantityHintSpan) {
        maxQuantityHintSpan.textContent = userEnergyBalance.maxCanSell.toString()
      }
      if (availableEnergySpan) {
        availableEnergySpan.textContent = `${userEnergyBalance.maxCanSell} kWh`
      }

      console.log('✅ Energy balance UI updated successfully')
    } else {
      console.warn('❌ Failed to get energy balance:', response.message)
      showStatus(`Failed to load energy balance: ${response.message}`, 'warning')
    }
  } catch (error) {
    console.error('❌ Error updating energy balance:', error)
    showStatus('Failed to connect to backend. Please check your connection.', 'error')

    // Set default values
    if (totalGeneratedSpan) totalGeneratedSpan.textContent = '0 kWh'
    if (totalSoldSpan) totalSoldSpan.textContent = '0 kWh'
    if (pendingOffersSpan) pendingOffersSpan.textContent = '0 kWh'
    if (maxCanSellSpan) maxCanSellSpan.textContent = '0 kWh'
    if (maxQuantityHintSpan) maxQuantityHintSpan.textContent = '0'
    if (availableEnergySpan) availableEnergySpan.textContent = '0 kWh'
  }
}

// Generate Energy
async function generateEnergy() {
  // Check wallet connection
  if (!isWalletConnected()) {
    showStatus('Please connect your wallet first', 'warning')
    return
  }

  // Validate input
  const validation = validateEnergyAmount(energyAmountInput.value)
  if (!validation.valid) {
    showStatus(validation.error!, 'warning')
    return
  }

  try {
    const quantity = parseInt(energyAmountInput.value)
    showLoading(`Generating ${quantity} kWh of energy...`)

    const tx = await contract!.generateEnergyReading(quantity)
    console.log('Transaction sent:', tx.hash)

    showLoading('Waiting for transaction confirmation...')
    const receipt = await tx.wait()
    console.log('Transaction confirmed:', receipt.hash)

    // Record in backend database
    try {
      await apiClient.recordEnergyGeneration({
        walletAddress: userAddress,
        quantity: quantity,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        gasPrice: receipt.gasPrice?.toString()
      })
      console.log('✅ Energy generation recorded in database')
    } catch (dbError) {
      console.warn('⚠️ Failed to record in database:', dbError)
    }

    energyAmountInput.value = ''

    // Update both contract and backend balances
    await updateBalances()

    // Force refresh energy balance from backend
    console.log('🔄 Force refreshing energy balance after generation...')
    await updateEnergyBalance()

    showStatus(`✅ Successfully generated ${quantity} kWh of energy! Balance updated.`, 'success')
    hideLoading()

  } catch (error: any) {
    console.error('Error generating energy:', error)

    if (error.code === 'ACTION_REJECTED') {
      showStatus('Transaction rejected by user', 'warning')
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      showStatus('Insufficient funds for gas fees', 'error')
    } else {
      showStatus(`Failed to generate energy: ${error.reason || error.message}`, 'error')
    }

    hideLoading()
  }
}

// Create Offer
async function createOffer() {
  // Check wallet connection
  if (!isWalletConnected()) {
    showStatus('Please connect your wallet first', 'warning')
    return
  }

  // Validate inputs
  const quantityValidation = validateEnergyAmount(offerQuantityInput.value)
  if (!quantityValidation.valid) {
    showStatus(`Quantity error: ${quantityValidation.error}`, 'warning')
    return
  }

  const priceValidation = validatePrice(offerPriceInput.value)
  if (!priceValidation.valid) {
    showStatus(`Price error: ${priceValidation.error}`, 'warning')
    return
  }

  // Validate energy balance
  const quantity = parseInt(offerQuantityInput.value)
  const balanceValidation = await validateOfferQuantity(quantity)
  if (!balanceValidation.valid) {
    showOfferValidation(balanceValidation.message, 'error')
    showStatus(`Energy balance error: ${balanceValidation.message}`, 'warning')
    return
  }

  try {
    const quantity = parseInt(offerQuantityInput.value)
    const price = ethers.parseEther(offerPriceInput.value)
    const totalValue = ethers.formatEther(BigInt(quantity) * price)

    showLoading(`Creating offer: ${quantity} kWh at ${offerPriceInput.value} ETH/kWh...`)

    const tx = await contract!.createOffer(quantity, price)
    console.log('Transaction sent:', tx.hash)

    showLoading('Waiting for transaction confirmation...')
    const receipt = await tx.wait()
    console.log('Transaction confirmed:', receipt.hash)

    // Record in backend database
    try {
      // Get offer ID from transaction logs
      const offerCreatedEvent = receipt.logs?.find((log: any) =>
        log.topics[0] === ethers.id('OfferCreated(uint256,address,uint256,uint256)')
      )

      if (offerCreatedEvent) {
        const offerId = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], offerCreatedEvent.topics[1])[0]

        console.log('📊 Recording offer in database with ID:', offerId.toString())

        try {
          const dbResponse = await apiClient.recordEnergyOffer({
            offerId: offerId.toString(),
            sellerWallet: userAddress,
            quantity: quantity,
            pricePerKWhETH: ethers.formatEther(price),
            pricePerKWhVND: convertETHtoVND(offerPriceInput.value),
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
          })

          if (dbResponse.success) {
            console.log('✅ Energy offer recorded in database:', dbResponse.data)
          } else {
            console.warn('⚠️ Database response indicates failure:', dbResponse.message)
          }
        } catch (dbError: any) {
          if (dbError.message && dbError.message.includes('Resource already exists')) {
            console.log('⚠️ Offer already exists in database (duplicate event) - this is normal')
            console.log('✅ Offer creation successful on blockchain, database already has record')
          } else {
            console.error('❌ Failed to record offer in database:', dbError.message)
            showStatus('⚠️ Offer created on blockchain but failed to record in database. Please refresh manually.', 'warning')
          }
        }
      } else {
        console.warn('⚠️ Could not find OfferCreated event in transaction logs')
      }
    } catch (dbError) {
      console.error('❌ Failed to record offer in database:', dbError)
      showStatus('⚠️ Offer created on blockchain but failed to record in database. Please refresh manually.', 'warning')
    }

    offerQuantityInput.value = ''
    offerPriceInput.value = ''

    // Update balances and refresh offers
    await updateBalances()

    // Force refresh energy balance from backend
    console.log('🔄 Force refreshing energy balance after offer creation...')
    await updateEnergyBalance()

    // Wait a moment for database to commit, then refresh offers
    console.log('🔄 Refreshing offers list after offer creation...')
    setTimeout(async () => {
      await loadOffers(true)
      console.log('✅ Offers list refreshed after offer creation')
    }, 1000) // 1 second delay to ensure database commit

    showStatus(`✅ Successfully created offer for ${quantity} kWh (Total: ${totalValue} ETH)! Refreshing marketplace...`, 'success')
    hideLoading()

  } catch (error: any) {
    console.error('Error creating offer:', error)

    if (error.code === 'ACTION_REJECTED') {
      showStatus('Transaction rejected by user', 'warning')
    } else if (error.reason?.includes('Insufficient energy balance')) {
      showStatus('Insufficient energy balance. Generate more energy first.', 'error')
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      showStatus('Insufficient funds for gas fees', 'error')
    } else {
      showStatus(`Failed to create offer: ${error.reason || error.message}`, 'error')
    }

    hideLoading()
  }
}

// Load Offers with backend integration and auto-refresh
async function loadOffers(showLoadingIndicator: boolean = true) {
  try {
    if (showLoadingIndicator) {
      updateLastUpdated('updating')
      offersContainer.innerHTML = '<p class="no-offers">Loading offers...</p>'
    }

    console.log('📊 Loading marketplace offers from backend...')

    // Get offers from backend API first
    let backendOffers: any[] = []
    try {
      console.log('📡 Fetching offers from backend API...')
      const backendResponse = await apiClient.getActiveOffers(50, 0)
      if (backendResponse.success) {
        backendOffers = backendResponse.data
        console.log(`📊 Found ${backendOffers.length} offers in backend database`)

        // Log offer details for debugging
        backendOffers.forEach((offer, index) => {
          console.log(`   ${index + 1}. Offer ID: ${offer.offer_id}, Quantity: ${offer.quantity} kWh, Status: ${offer.status}, Created: ${offer.created_at}`)
        })
      } else {
        console.warn('Backend offers API returned failure:', backendResponse.message)
      }
    } catch (backendError) {
      if (backendError.message.includes('Rate limit exceeded')) {
        console.warn('⚠️ Rate limit exceeded, will retry automatically')
        // Don't fall back to blockchain for rate limit errors, just show cached data
        return
      } else {
        console.error('❌ Backend offers failed, falling back to blockchain:', backendError)
      }
    }

    // Get valid offer IDs from blockchain contract
    let validOfferIds: number[] = []
    let blockchainOffers: any[] = []

    if (contract) {
      try {
        console.log('⛓️ Fetching valid offer IDs from blockchain contract...')
        const activeOfferIds = await contract.getActiveOffers()
        validOfferIds = activeOfferIds.map((id: any) => parseInt(id.toString()))
        console.log(`📊 Valid offer IDs from contract: [${validOfferIds.join(', ')}]`)

        for (const offerId of activeOfferIds) {
          const offer = await contract.getOffer(offerId)
          blockchainOffers.push({
            id: offerId,
            seller: offer.seller,
            quantity: offer.quantity.toString(),
            price: formatEther(offer.price),
            totalPrice: formatEther(offer.quantity * offer.price)
          })
        }
        console.log(`✅ Successfully loaded ${blockchainOffers.length} offers from contract`)
      } catch (contractError) {
        console.warn('Contract offers failed:', contractError)
      }
    }

    // Filter backend offers to only include those that exist on contract
    if (validOfferIds.length > 0 && backendOffers.length > 0) {
      const originalCount = backendOffers.length
      backendOffers = backendOffers.filter(offer =>
        validOfferIds.includes(parseInt(offer.offer_id))
      )
      console.log(`🔍 Filtered backend offers: ${originalCount} → ${backendOffers.length} (only contract-verified offers)`)

      if (backendOffers.length === 0) {
        console.log('⚠️ No backend offers match contract offers - showing contract data only')
      }
    }

    // Combine and display offers (prioritize filtered backend data)
    const offersToDisplay = backendOffers.length > 0 ? backendOffers : blockchainOffers

    if (offersToDisplay.length === 0) {
      offersContainer.innerHTML = '<p class="no-offers">No active offers available. Be the first to create one!</p>'
      updateLastUpdated('success')
      return
    }

    let offersHTML = ''
    for (const offer of offersToDisplay) {
      // Handle both backend and blockchain offer formats
      const quantity = offer.quantity
      const seller = offer.seller_wallet || offer.seller
      const offerId = offer.offer_id || offer.id
      const pricePerKWhVND = offer.price_per_kwh_vnd || convertETHtoVND(offer.price)
      const totalPriceVND = offer.total_price_vnd || convertETHtoVND(offer.totalPrice)
      const pricePerKWhETH = offer.price_per_kwh_eth || offer.price
      const totalPriceETH = offer.total_price_eth || offer.totalPrice

      const isOwnOffer = seller.toLowerCase() === userAddress.toLowerCase()

      // Format seller info
      const sellerInfo = offer.seller?.username
        ? `${offer.seller.username} (${formatAddress(seller)})`
        : formatAddress(seller)

      offersHTML += `
        <div class="offer-item ${isOwnOffer ? 'own-offer' : ''}">
          <div class="offer-detail">
            <span class="label">👤 Seller</span>
            <span class="value">${sellerInfo}</span>
          </div>
          <div class="offer-detail">
            <span class="label">⚡ Quantity</span>
            <span class="value">${quantity} kWh</span>
          </div>
          <div class="offer-detail">
            <span class="label">💰 Price per kWh</span>
            <span class="value">
              ${formatVND(pricePerKWhVND)}<br>
              <small style="opacity: 0.7;">(${parseFloat(pricePerKWhETH).toFixed(6)} ETH)</small>
            </span>
          </div>
          <div class="offer-detail">
            <span class="label">💵 Total Price</span>
            <span class="value">
              <strong>${formatVND(totalPriceVND)}</strong><br>
              <small style="opacity: 0.7;">(${parseFloat(totalPriceETH).toFixed(4)} ETH)</small>
            </span>
          </div>
          ${offer.created_at ? `
            <div class="offer-detail">
              <span class="label">📅 Created</span>
              <span class="value">${new Date(offer.created_at).toLocaleString()}</span>
            </div>
          ` : ''}
          <div>
            ${isOwnOffer
              ? '<span class="btn btn-warning" style="cursor: not-allowed;">🏷️ Your Offer</span>'
              : `<button class="btn btn-primary" onclick="purchaseOffer(${offerId})">🛒 Buy Now</button>`
            }
          </div>
        </div>
      `
    }

    offersContainer.innerHTML = offersHTML
    updateLastUpdated('success')
    console.log(`✅ Loaded ${offersToDisplay.length} active offers`)

  } catch (error) {
    console.error('Error loading offers:', error)
    offersContainer.innerHTML = '<p class="no-offers error">Failed to load offers. Please try again.</p>'
    updateLastUpdated('error')
  }
}

// Update last updated timestamp
function updateLastUpdated(status: 'updating' | 'success' | 'error') {
  if (!lastUpdatedSpan) return

  const now = new Date()
  const timeString = now.toLocaleTimeString()

  lastUpdatedSpan.className = `last-updated ${status}`

  switch (status) {
    case 'updating':
      lastUpdatedSpan.textContent = 'Updating...'
      break
    case 'success':
      lastUpdatedSpan.textContent = `Updated at ${timeString}`
      break
    case 'error':
      lastUpdatedSpan.textContent = `Failed at ${timeString}`
      break
  }
}

// Start auto-refresh for offers
function startOffersAutoRefresh() {
  // Clear existing interval
  if (offersRefreshInterval) {
    clearInterval(offersRefreshInterval)
  }

  // Refresh every 60 seconds to reduce API calls
  offersRefreshInterval = setInterval(() => {
    if (userAddress && contract) {
      console.log('🔄 Auto-refreshing offers...')
      loadOffers(false) // Silent refresh
    }
  }, 60000) // 60 seconds

  console.log('✅ Auto-refresh started (60s interval)')
}

// Stop auto-refresh
function stopOffersAutoRefresh() {
  if (offersRefreshInterval) {
    clearInterval(offersRefreshInterval)
    offersRefreshInterval = null
    console.log('⏹️ Auto-refresh stopped')
  }
}

// Manual refresh offers
async function refreshOffers() {
  console.log('🔄 Manual refresh triggered')

  try {
    // Show loading state
    if (refreshOffersBtn) {
      refreshOffersBtn.textContent = '🔄 Refreshing...'
      refreshOffersBtn.disabled = true
    }

    // Force refresh offers from backend
    await loadOffers(true)

    showStatus('✅ Marketplace offers refreshed successfully!', 'success')
    console.log('✅ Manual offers refresh completed')
  } catch (error) {
    console.error('❌ Manual offers refresh failed:', error)
    showStatus('❌ Failed to refresh offers. Please try again.', 'error')
  } finally {
    // Restore button state
    if (refreshOffersBtn) {
      refreshOffersBtn.textContent = '🔄 Refresh Offers'
      refreshOffersBtn.disabled = false
    }
  }
}

// Manual refresh energy balance
async function refreshBalance() {
  console.log('🔄 Manual balance refresh triggered')
  if (!userAddress) {
    showStatus('Please connect your wallet first', 'warning')
    return
  }

  try {
    // Show loading state
    if (refreshBalanceBtn) {
      refreshBalanceBtn.textContent = '🔄 Refreshing...'
      refreshBalanceBtn.disabled = true
    }

    // Update energy balance from backend
    await updateEnergyBalance()

    // Also update contract balance
    await updateBalances()

    showStatus('✅ Energy balance refreshed successfully!', 'success')
    console.log('✅ Balance refresh completed')
  } catch (error) {
    console.error('❌ Balance refresh failed:', error)
    showStatus('❌ Failed to refresh balance. Please try again.', 'error')
  } finally {
    // Restore button state
    if (refreshBalanceBtn) {
      refreshBalanceBtn.textContent = '🔄 Refresh Balance'
      refreshBalanceBtn.disabled = false
    }
  }
}

// Validate offer quantity against available energy balance
async function validateOfferQuantity(quantity: number): Promise<{valid: boolean, message: string}> {
  if (!userAddress) {
    return { valid: false, message: 'Please connect your wallet first' }
  }

  if (!userEnergyBalance) {
    await updateEnergyBalance()
  }

  if (!userEnergyBalance) {
    return { valid: false, message: 'Unable to fetch energy balance' }
  }

  if (quantity <= 0) {
    return { valid: false, message: 'Quantity must be greater than 0' }
  }

  if (quantity > userEnergyBalance.maxCanSell) {
    return {
      valid: false,
      message: `Insufficient energy balance. You can sell maximum ${userEnergyBalance.maxCanSell} kWh (Generated: ${userEnergyBalance.totalGenerated}, Sold: ${userEnergyBalance.totalSold}, Pending: ${userEnergyBalance.pendingOffers})`
    }
  }

  return { valid: true, message: `✅ You can create this offer (${quantity} kWh available: ${userEnergyBalance.maxCanSell} kWh)` }
}

// Show offer validation message
function showOfferValidation(message: string, type: 'success' | 'error' | 'warning') {
  if (!offerValidationDiv) return

  offerValidationDiv.textContent = message
  offerValidationDiv.className = `offer-validation ${type}`
  offerValidationDiv.style.display = 'block'

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      if (offerValidationDiv) {
        offerValidationDiv.style.display = 'none'
      }
    }, 5000)
  }
}

// Hide offer validation
function hideOfferValidation() {
  if (offerValidationDiv) {
    offerValidationDiv.style.display = 'none'
  }
}

// Purchase Offer
async function purchaseOffer(offerId: number) {
  if (!contract) return

  try {
    showLoading('Purchasing energy offer...')

    const offer = await contract.getOffer(offerId)
    const totalPrice = offer.quantity * offer.price

    const tx = await contract.purchaseOffer(offerId, { value: totalPrice })
    const receipt = await tx.wait()
    console.log('✅ Purchase transaction confirmed:', receipt.hash)

    // Decode event to get seller address, quantity already fetched
    const offerPurchasedEvent = receipt.logs?.find((log: any) =>
      log.topics[0] === ethers.id('OfferPurchased(uint256,address,address,uint256,uint256)')
    )

    let sellerAddr = offer.seller as string
    if (offerPurchasedEvent) {
      // topics: 0 event id, 1 offerId, 2 buyer, 3 seller
      sellerAddr = '0x' + offerPurchasedEvent.topics[3].slice(26)
    }

    const totalPriceETH = ethers.formatEther(totalPrice)
    const totalPriceVND = convertETHtoVND(totalPriceETH)

    await apiClient.recordEnergyPurchase({
      offerId: offerId,
      buyerWallet: userAddress,
      sellerWallet: sellerAddr,
      quantity: offer.quantity.toString(),
      totalPriceETH: parseFloat(totalPriceETH),
      totalPriceVND: totalPriceVND,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    })
    console.log('✅ Energy purchase recorded in database')

    // Update balances and refresh offers
    await updateBalances()
    await updateEnergyBalance()

    // Force refresh offers after purchase
    console.log('🔄 Refreshing offers after purchase...')
    setTimeout(async () => {
      await loadOffers(true)
      console.log('✅ Offers refreshed after purchase')
    }, 1000)

    showStatus(`Successfully purchased ${offer.quantity.toString()} kWh of energy!`, 'success')
    hideLoading()

  } catch (error: any) {
    console.error('Error purchasing offer:', error)
    showStatus(`Failed to purchase offer: ${error.message}`, 'error')
    hideLoading()
  }
}

// Copy address to clipboard
async function copyAddress() {
  if (userAddress) {
    const success = await copyToClipboard(userAddress)
    if (success) {
      showStatus('Address copied to clipboard!', 'success')
    } else {
      showStatus('Failed to copy address', 'error')
    }
  }
}

// Display Vietnam electricity tariff breakdown
function displayTariffBreakdown(kWh: number) {
  if (!kWh || kWh <= 0) {
    tariffDisplay.innerHTML = '<small>Enter quantity to see suggested pricing based on EVN tariff</small>'
    return
  }

  const { totalVND, breakdown } = calculateVNElectricityPrice(kWh)

  let html = '<div class="tariff-breakdown">'
  html += '<strong>📊 EVN Tariff Breakdown:</strong><br>'

  breakdown.forEach(tier => {
    html += `
      <div class="tariff-tier">
        <span>${tier.tier} (${tier.range}): ${tier.kWh} kWh × ${tier.pricePerKWh.toLocaleString('vi-VN')} VND</span>
        <span>${formatVND(tier.totalCost)}</span>
      </div>
    `
  })

  html += `
    <div class="tariff-tier">
      <span><strong>Total Cost:</strong></span>
      <span><strong>${formatVND(totalVND)}</strong></span>
    </div>
  `
  html += '</div>'

  tariffDisplay.innerHTML = html
}

// Suggest price based on Vietnam electricity tariff
function suggestPrice() {
  const kWh = parseInt(offerQuantityInput.value)

  if (!kWh || kWh <= 0) {
    showStatus('Please enter a valid quantity first', 'warning')
    return
  }

  const suggestion = getSuggestedEnergyPrice(kWh)

  // Update price input
  offerPriceInput.value = suggestion.eth

  // Display price information
  const vndTotal = suggestion.vnd * kWh
  const ethTotal = parseFloat(suggestion.eth) * kWh

  priceDisplay.innerHTML = `
    <div class="price-suggestion">
      <strong>💡 Suggested Pricing (EVN + 5% margin):</strong><br>
      <div style="margin-top: 0.5rem;">
        <div>📈 Price per kWh: <strong>${formatVND(suggestion.vnd)}</strong> (${suggestion.eth} ETH)</div>
        <div>💰 Total for ${kWh} kWh: <strong>${formatVND(vndTotal)}</strong> (${ethTotal.toFixed(6)} ETH)</div>
        <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">
          Based on Vietnam electricity tariff with 5% trading margin
        </div>
      </div>
    </div>
  `

  // Also display tariff breakdown
  displayTariffBreakdown(kWh)

  showStatus('✅ Price suggested based on Vietnam electricity tariff!', 'success')
}

// Update price display when quantity changes
function updatePriceDisplay() {
  const kWh = parseInt(offerQuantityInput.value)
  const priceETH = parseFloat(offerPriceInput.value)

  if (kWh > 0 && priceETH > 0) {
    const totalETH = kWh * priceETH
    const totalVND = convertETHtoVND(totalETH.toString())
    const priceVND = convertETHtoVND(priceETH.toString())

    priceDisplay.innerHTML = `
      <div class="price-calculation">
        <strong>💰 Price Calculation:</strong><br>
        <div style="margin-top: 0.5rem;">
          <div>📊 Price per kWh: ${formatVND(priceVND)} (${priceETH.toFixed(6)} ETH)</div>
          <div>🔢 Total for ${kWh} kWh: <strong>${formatVND(totalVND)}</strong> (${totalETH.toFixed(6)} ETH)</div>
        </div>
      </div>
    `
  } else {
    priceDisplay.innerHTML = ''
  }

  // Update tariff display
  displayTariffBreakdown(kWh)
}

// Make functions globally available
(window as any).purchaseOffer = purchaseOffer;
(window as any).copyAddress = copyAddress

// Event Listeners Setup
function setupEventListeners() {
  // Initial wallet connection button (will be updated by updateWalletUI)
  connectWalletBtn.addEventListener('click', connectWallet)
  checkContractBtn.addEventListener('click', manualContractCheck)
  refreshOffersBtn.addEventListener('click', refreshOffers)
  refreshBalanceBtn.addEventListener('click', refreshBalance)
  generateEnergyBtn.addEventListener('click', generateEnergy)
  createOfferBtn.addEventListener('click', createOffer)

  // Vietnam pricing features
  suggestPriceBtn.addEventListener('click', suggestPrice)
  offerQuantityInput.addEventListener('input', updatePriceDisplay)
  offerPriceInput.addEventListener('input', updatePriceDisplay)

  // Real-time offer validation
  offerQuantityInput.addEventListener('input', async () => {
    const quantity = parseInt(offerQuantityInput.value)
    if (quantity && quantity > 0) {
      const validation = await validateOfferQuantity(quantity)
      showOfferValidation(validation.message, validation.valid ? 'success' : 'error')
    } else {
      hideOfferValidation()
    }
  })

  // MetaMask event listeners
  if (window.ethereum) {
    // Account changes (user switches accounts or disconnects)
    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      console.log('Accounts changed:', accounts)

      if (accounts.length === 0) {
        // User disconnected from MetaMask
        console.log('User disconnected from MetaMask')
        await disconnectWallet()
        showStatus('Wallet disconnected', 'warning')
      } else if (accounts[0] !== userAddress) {
        // User switched to different account
        console.log('User switched accounts')
        showStatus('Account changed. Reconnecting...', 'warning')
        await connectWallet()
      }
    })

    // Network changes
    window.ethereum.on('chainChanged', (chainId: string) => {
      console.log('Network changed to:', chainId)

      if (chainId === LISK_SEPOLIA_CONFIG.chainId) {
        showStatus('Switched to Lisk Sepolia network', 'success')
        // Reconnect to update contract
        if (userAddress) {
          connectWallet()
        }
      } else {
        showStatus('Please switch to Lisk Sepolia network', 'warning')
        // Optionally auto-switch back
        setTimeout(() => {
          if (userAddress) {
            ensureCorrectNetwork()
          }
        }, 2000)
      }
    })

    // Connection events
    window.ethereum.on('connect', (connectInfo: any) => {
      console.log('MetaMask connected:', connectInfo)
    })

    window.ethereum.on('disconnect', (error: any) => {
      console.log('MetaMask disconnected:', error)
      disconnectWallet()
    })
  }
}

// Check for existing wallet connection and auto-restore
async function checkExistingConnection() {
  if (!window.ethereum) return

  try {
    // Check if wallet was previously connected (stored in localStorage)
    const wasConnected = localStorage.getItem('walletConnected')
    const lastConnectedWallet = localStorage.getItem('lastConnectedWallet')

    if (wasConnected === 'true') {
      console.log('🔄 Checking for existing wallet connection...')

      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        const currentAccount = accounts[0]

        // Verify it's the same wallet as before
        if (!lastConnectedWallet || currentAccount.toLowerCase() === lastConnectedWallet.toLowerCase()) {
          console.log('✅ Auto-restoring wallet connection:', currentAccount)
          userAddress = currentAccount

          // Initialize wallet without showing loading (silent restore)
          provider = new ethers.BrowserProvider(window.ethereum)
          signer = await provider.getSigner()

          // Update UI
          updateWalletUI()
          updateContractStatus('Checking...')

          // Initialize in background
          Promise.all([
            ensureCorrectNetwork(),
            initializeContract(),
            updateBalances(),
            updateEnergyBalance(),
            loadOffers()
          ]).then(() => {
            console.log('✅ Wallet connection fully restored')
            showStatus('✅ Wallet connection restored', 'success')
            // Start auto-refresh for offers
            startOffersAutoRefresh()
          }).catch(error => {
            console.warn('Background restore error:', error)
            showStatus('⚠️ Wallet restored but some features may need refresh', 'warning')
          })

          return true
        } else {
          console.log('⚠️ Different wallet detected, clearing stored connection')
          localStorage.removeItem('walletConnected')
          localStorage.removeItem('lastConnectedWallet')
        }
      } else {
        console.log('⚠️ No accounts available, wallet may be locked')
        connectWalletBtn.textContent = '🔓 Unlock Wallet'
        connectWalletBtn.classList.add('btn-warning')
        showStatus('Please unlock your wallet to restore connection', 'info')
      }
    } else if (window.ethereum.selectedAddress) {
      // Show reconnect option if wallet is available but not previously connected
      connectWalletBtn.textContent = '🔌 Connect Wallet'
      connectWalletBtn.classList.add('btn-primary')
    }
  } catch (error) {
    console.log('Connection check failed:', error.message)
    localStorage.removeItem('walletConnected')
    localStorage.removeItem('lastConnectedWallet')
  }
}

// Fast application initialization
function initializeApp() {
  console.log('🚀 Application initializing...')

  // Setup event listeners immediately
  setupEventListeners()

  // Quick check for existing connection (no loading)
  checkExistingConnection()

  // Load offers even without wallet connection (to show marketplace)
  setTimeout(() => {
    if (!userAddress) {
      console.log('📊 Loading marketplace offers for visitors...')
      loadOffers(true)
    }
  }, 1000) // Small delay to let connection check complete

  console.log('✅ Application ready')
}

// Initialize application immediately when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  // DOM is already ready
  initializeApp()
}

// Declare ethereum on window
declare global {
  interface Window {
    ethereum?: any
  }
}
