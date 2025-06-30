// Blockchain Indexer Service for Multi-Chain Support
// Listens to blockchain events and indexes them in Supabase

import { ethers } from 'ethers'
import { supabase } from '../config/supabase.js'
import { TABLES } from '../config/supabase.js'

// Chain configurations
const CHAIN_CONFIGS = {
  lisk: {
    name: 'Lisk Sepolia',
    chainId: 4202,
    rpcUrl: 'https://rpc.sepolia-api.lisk.com',
    contractAddress: '0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7',
    currency: 'ETH',
    startBlock: 'latest'
  },
  saga: {
    name: 'DevPros Saga Chainlet',
    chainId: 2749656616387000,
    rpcUrl: 'https://devpros-2749656616387000-1.jsonrpc.sagarpc.io',
    contractAddress: null, // To be deployed
    currency: 'DPSV',
    startBlock: 'latest'
  },
  bnb: {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    contractAddress: null, // To be deployed
    currency: 'VNST',
    startBlock: 'latest'
  }
}

// Contract ABI for event listening
const CONTRACT_ABI = [
  "event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 quantity, uint256 price)",
  "event OfferPurchased(uint256 indexed offerId, address indexed buyer, address indexed seller, uint256 quantity, uint256 price)",
  "event OfferCancelled(uint256 indexed offerId, address indexed seller)"
]

class BlockchainIndexer {
  constructor() {
    this.providers = {}
    this.contracts = {}
    this.isRunning = false
    this.lastProcessedBlocks = {}
  }

  async initialize() {
    console.log('🔗 Initializing Blockchain Indexer...')
    
    try {
      // Initialize providers and contracts for each chain
      for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
        if (config.contractAddress) {
          await this.initializeChain(chainKey, config)
        } else {
          console.log(`⚠️ Skipping ${config.name} - contract not deployed yet`)
        }
      }
      
      console.log('✅ Blockchain Indexer initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Blockchain Indexer:', error)
      return false
    }
  }

  async initializeChain(chainKey, config) {
    try {
      console.log(`🔗 Connecting to ${config.name}...`)
      
      // Create provider
      const provider = new ethers.JsonRpcProvider(config.rpcUrl)
      this.providers[chainKey] = provider
      
      // Test connection
      const network = await provider.getNetwork()
      console.log(`✅ Connected to ${config.name} (Chain ID: ${network.chainId})`)
      
      // Create contract instance
      const contract = new ethers.Contract(
        config.contractAddress,
        CONTRACT_ABI,
        provider
      )
      this.contracts[chainKey] = contract
      
      // Get last processed block from database
      await this.loadLastProcessedBlock(chainKey)
      
      console.log(`✅ ${config.name} initialized successfully`)
    } catch (error) {
      console.error(`❌ Failed to initialize ${config.name}:`, error)
      throw error
    }
  }

  async loadLastProcessedBlock(chainKey) {
    try {
      // In a real implementation, you'd store this in database
      // For now, we'll start from current block
      const provider = this.providers[chainKey]
      const currentBlock = await provider.getBlockNumber()
      this.lastProcessedBlocks[chainKey] = currentBlock
      
      console.log(`📊 ${CHAIN_CONFIGS[chainKey].name} starting from block ${currentBlock}`)
    } catch (error) {
      console.error(`Error loading last processed block for ${chainKey}:`, error)
      this.lastProcessedBlocks[chainKey] = 'latest'
    }
  }

  async startIndexing() {
    if (this.isRunning) {
      console.log('⚠️ Indexer is already running')
      return
    }

    console.log('🚀 Starting blockchain indexing...')
    this.isRunning = true

    // Start listening to events for each chain
    for (const [chainKey, contract] of Object.entries(this.contracts)) {
      this.startChainIndexing(chainKey, contract)
    }

    console.log('✅ Blockchain indexing started for all chains')
  }

  startChainIndexing(chainKey, contract) {
    const config = CHAIN_CONFIGS[chainKey]
    console.log(`👂 Listening to events on ${config.name}...`)

    // Listen to OfferCreated events
    contract.on('OfferCreated', async (offerId, seller, quantity, price, event) => {
      await this.handleOfferCreated(chainKey, {
        offerId: offerId.toString(),
        seller,
        quantity: ethers.formatEther(quantity),
        price: ethers.formatEther(price),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      })
    })

    // Listen to OfferPurchased events
    contract.on('OfferPurchased', async (offerId, buyer, seller, quantity, price, event) => {
      await this.handleOfferPurchased(chainKey, {
        offerId: offerId.toString(),
        buyer,
        seller,
        quantity: ethers.formatEther(quantity),
        price: ethers.formatEther(price),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      })
    })

    // Listen to OfferCancelled events
    contract.on('OfferCancelled', async (offerId, seller, event) => {
      await this.handleOfferCancelled(chainKey, {
        offerId: offerId.toString(),
        seller,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      })
    })
  }

  async handleOfferCreated(chainKey, eventData) {
    const config = CHAIN_CONFIGS[chainKey]
    console.log(`📝 OfferCreated on ${config.name}:`, eventData)

    try {
      // This event is already handled by the main application
      // We could add additional processing here if needed
      console.log(`✅ OfferCreated processed for offer ${eventData.offerId}`)
    } catch (error) {
      console.error('Error handling OfferCreated:', error)
    }
  }

  async handleOfferPurchased(chainKey, eventData) {
    const config = CHAIN_CONFIGS[chainKey]
    console.log(`💰 OfferPurchased on ${config.name}:`, eventData)

    try {
      // Get user profiles for buyer and seller
      const [buyerProfile, sellerProfile] = await Promise.all([
        this.getUserByWallet(eventData.buyer),
        this.getUserByWallet(eventData.seller)
      ])

      // Record the trade in database
      const { data, error } = await supabase
        .from('trades')
        .insert({
          offer_id: parseInt(eventData.offerId),
          buyer_id: buyerProfile?.id || null,
          seller_id: sellerProfile?.id || null,
          buyer_wallet: eventData.buyer.toLowerCase(),
          seller_wallet: eventData.seller.toLowerCase(),
          buyer_name: buyerProfile?.display_name || null,
          seller_name: sellerProfile?.display_name || null,
          quantity: parseFloat(eventData.quantity),
          price_per_kwh: parseFloat(eventData.price),
          total_price: parseFloat(eventData.quantity) * parseFloat(eventData.price),
          currency: config.currency,
          chain_id: config.chainId,
          chain_name: config.name,
          tx_hash: eventData.txHash,
          block_number: eventData.blockNumber,
          status: 'completed'
        })

      if (error) {
        console.error('Error recording trade:', error)
      } else {
        console.log(`✅ Trade recorded for offer ${eventData.offerId}`)
      }

      // Update offer status in energy_offers table
      await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({ 
          status: 'sold',
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', parseInt(eventData.offerId))

    } catch (error) {
      console.error('Error handling OfferPurchased:', error)
    }
  }

  async handleOfferCancelled(chainKey, eventData) {
    const config = CHAIN_CONFIGS[chainKey]
    console.log(`❌ OfferCancelled on ${config.name}:`, eventData)

    try {
      // Update offer status in energy_offers table
      const { error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', parseInt(eventData.offerId))

      if (error) {
        console.error('Error updating cancelled offer:', error)
      } else {
        console.log(`✅ Offer ${eventData.offerId} marked as cancelled`)
      }
    } catch (error) {
      console.error('Error handling OfferCancelled:', error)
    }
  }

  async getUserByWallet(walletAddress) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      return null
    }
  }

  async stopIndexing() {
    if (!this.isRunning) {
      console.log('⚠️ Indexer is not running')
      return
    }

    console.log('🛑 Stopping blockchain indexing...')
    this.isRunning = false

    // Remove all event listeners
    for (const [chainKey, contract] of Object.entries(this.contracts)) {
      contract.removeAllListeners()
      console.log(`🔇 Stopped listening to ${CHAIN_CONFIGS[chainKey].name}`)
    }

    console.log('✅ Blockchain indexing stopped')
  }

  // Get indexing status
  getStatus() {
    return {
      isRunning: this.isRunning,
      chains: Object.keys(this.contracts).map(chainKey => ({
        chain: chainKey,
        name: CHAIN_CONFIGS[chainKey].name,
        lastBlock: this.lastProcessedBlocks[chainKey],
        hasContract: !!this.contracts[chainKey]
      }))
    }
  }

  // Manual event processing for historical data
  async processHistoricalEvents(chainKey, fromBlock, toBlock) {
    const contract = this.contracts[chainKey]
    const config = CHAIN_CONFIGS[chainKey]
    
    if (!contract) {
      throw new Error(`Contract not initialized for ${chainKey}`)
    }

    console.log(`📚 Processing historical events for ${config.name} from block ${fromBlock} to ${toBlock}`)

    try {
      // Get historical OfferPurchased events
      const purchaseFilter = contract.filters.OfferPurchased()
      const purchaseEvents = await contract.queryFilter(purchaseFilter, fromBlock, toBlock)

      for (const event of purchaseEvents) {
        await this.handleOfferPurchased(chainKey, {
          offerId: event.args.offerId.toString(),
          buyer: event.args.buyer,
          seller: event.args.seller,
          quantity: ethers.formatEther(event.args.quantity),
          price: ethers.formatEther(event.args.price),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        })
      }

      console.log(`✅ Processed ${purchaseEvents.length} historical purchase events for ${config.name}`)
    } catch (error) {
      console.error(`Error processing historical events for ${chainKey}:`, error)
    }
  }
}

// Create singleton instance
const blockchainIndexer = new BlockchainIndexer()

export { blockchainIndexer, BlockchainIndexer }
