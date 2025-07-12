import { ethers } from 'ethers'
import { supabase } from '../config/supabase.js'
import UserProfileService from './userProfileService.js'

/**
 * Transaction Indexer Service
 * Listens to blockchain events and indexes transactions for user-friendly display
 */
class TransactionIndexerService {
  constructor() {
    this.provider = null
    this.contract = null
    this.isRunning = false
    this.lastProcessedBlock = null
    
    // Contract ABI for events we care about
    this.contractABI = [
      "event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 quantity, uint256 pricePerKWh)",
      "event OfferPurchased(uint256 indexed offerId, address indexed buyer, address indexed seller, uint256 quantity, uint256 totalPrice)"
    ]
  }

  /**
   * Initialize the indexer service
   */
  async initialize() {
    try {
      console.log('🔍 Initializing Transaction Indexer Service...')
      
      // Setup provider
      const rpcUrl = process.env.LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
      this.provider = new ethers.JsonRpcProvider(rpcUrl)
      
      // Setup contract
      const contractAddress = process.env.CONTRACT_ADDRESS
      if (!contractAddress) {
        throw new Error('CONTRACT_ADDRESS environment variable not set')
      }
      
      this.contract = new ethers.Contract(contractAddress, this.contractABI, this.provider)
      
      // Get last processed block from database
      await this.loadLastProcessedBlock()
      
      console.log('✅ Transaction Indexer Service initialized')
      console.log(`   Contract: ${contractAddress}`)
      console.log(`   Last processed block: ${this.lastProcessedBlock}`)
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Transaction Indexer:', error.message)
      return false
    }
  }

  /**
   * Start listening to blockchain events
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Transaction Indexer is already running')
      return
    }

    try {
      console.log('🚀 Starting Transaction Indexer Service...')
      this.isRunning = true

      // Process historical events first
      await this.processHistoricalEvents()

      // Listen to new events
      this.setupEventListeners()

      console.log('✅ Transaction Indexer Service started successfully')
    } catch (error) {
      console.error('❌ Failed to start Transaction Indexer:', error.message)
      this.isRunning = false
    }
  }

  /**
   * Stop the indexer service
   */
  async stop() {
    console.log('🛑 Stopping Transaction Indexer Service...')
    this.isRunning = false
    
    if (this.contract) {
      this.contract.removeAllListeners()
    }
    
    console.log('✅ Transaction Indexer Service stopped')
  }

  /**
   * Load last processed block from database
   */
  async loadLastProcessedBlock() {
    try {
      const { data, error } = await supabase
        .from('indexer_state')
        .select('last_processed_block')
        .eq('service_name', 'transaction_indexer')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        this.lastProcessedBlock = data.last_processed_block
      } else {
        // If no state exists, start from current block minus 1000 blocks
        const currentBlock = await this.provider.getBlockNumber()
        this.lastProcessedBlock = Math.max(0, currentBlock - 1000)
        
        // Save initial state
        await this.saveLastProcessedBlock()
      }
    } catch (error) {
      console.error('Error loading last processed block:', error.message)
      // Fallback to recent blocks
      const currentBlock = await this.provider.getBlockNumber()
      this.lastProcessedBlock = Math.max(0, currentBlock - 100)
    }
  }

  /**
   * Save last processed block to database
   */
  async saveLastProcessedBlock() {
    try {
      const { error } = await supabase
        .from('indexer_state')
        .upsert({
          service_name: 'transaction_indexer',
          last_processed_block: this.lastProcessedBlock,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'service_name'
        })

      if (error) {
        console.error('Error saving last processed block:', error.message)
      }
    } catch (error) {
      console.error('Error saving indexer state:', error.message)
    }
  }

  /**
   * Process historical events from last processed block to current
   */
  async processHistoricalEvents() {
    try {
      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock = this.lastProcessedBlock + 1
      
      if (fromBlock > currentBlock) {
        console.log('📊 No new blocks to process')
        return
      }

      console.log(`📊 Processing historical events from block ${fromBlock} to ${currentBlock}`)

      // Process in chunks to avoid RPC limits
      const chunkSize = 1000
      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock)
        
        console.log(`   Processing blocks ${start} to ${end}`)
        
        // Get OfferPurchased events (these are the trades we want to index)
        const purchaseEvents = await this.contract.queryFilter(
          this.contract.filters.OfferPurchased(),
          start,
          end
        )

        // Process each purchase event
        for (const event of purchaseEvents) {
          await this.processPurchaseEvent(event)
        }

        // Update last processed block
        this.lastProcessedBlock = end
        await this.saveLastProcessedBlock()
      }

      console.log(`✅ Historical events processed up to block ${currentBlock}`)
    } catch (error) {
      console.error('❌ Error processing historical events:', error.message)
    }
  }

  /**
   * Setup real-time event listeners
   */
  setupEventListeners() {
    console.log('👂 Setting up real-time event listeners...')

    // Listen for new OfferPurchased events
    this.contract.on('OfferPurchased', async (offerId, buyer, seller, quantity, totalPrice, event) => {
      if (!this.isRunning) return

      console.log(`🔔 New purchase event: Offer ${offerId}`)
      await this.processPurchaseEvent(event)
      
      // Update last processed block
      this.lastProcessedBlock = event.blockNumber
      await this.saveLastProcessedBlock()
    })

    // Handle provider errors
    this.provider.on('error', (error) => {
      console.error('🚨 Provider error:', error.message)
    })
  }

  /**
   * Process a single OfferPurchased event
   */
  async processPurchaseEvent(event) {
    try {
      const { offerId, buyer, seller, quantity, totalPrice } = event.args
      const txHash = event.transactionHash
      const blockNumber = event.blockNumber

      console.log(`📝 Processing purchase: Offer ${offerId}, Buyer: ${buyer}, Seller: ${seller}`)

      // Get transaction details
      const tx = await this.provider.getTransaction(txHash)
      const receipt = await this.provider.getTransactionReceipt(txHash)
      const block = await this.provider.getBlock(blockNumber)

      // Get user profiles
      const buyerProfile = await UserProfileService.getProfileByWallet(buyer)
      const sellerProfile = await UserProfileService.getProfileByWallet(seller)

      // Get offer details from database
      const { data: offer, error: offerError } = await supabase
        .from('energy_offers')
        .select('price_per_kwh_vnd, total_price_vnd')
        .eq('offer_id', parseInt(offerId))
        .single()

      if (offerError) {
        console.warn(`⚠️ Could not find offer ${offerId} in database:`, offerError.message)
      }

      // Prepare trade data
      const tradeData = {
        offer_id: parseInt(offerId),
        buyer_profile_id: buyerProfile.success ? buyerProfile.data.id : null,
        seller_profile_id: sellerProfile.success ? sellerProfile.data.id : null,
        buyer_wallet_address: buyer.toLowerCase(),
        seller_wallet_address: seller.toLowerCase(),
        quantity: parseFloat(ethers.formatUnits(quantity, 0)), // quantity is in whole numbers
        price_per_kwh_eth: parseFloat(ethers.formatEther(totalPrice)) / parseFloat(ethers.formatUnits(quantity, 0)),
        total_price_eth: parseFloat(ethers.formatEther(totalPrice)),
        price_per_kwh_vnd: offer?.price_per_kwh_vnd || null,
        total_price_vnd: offer?.total_price_vnd || null,
        transaction_hash: txHash,
        block_number: blockNumber,
        block_timestamp: new Date(block.timestamp * 1000).toISOString(),
        gas_used: receipt.gasUsed ? parseInt(receipt.gasUsed) : null,
        gas_price: tx.gasPrice ? parseInt(tx.gasPrice) : null,
        status: 'completed'
      }

      // Save trade to database
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .upsert(tradeData, {
          onConflict: 'transaction_hash',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (tradeError) {
        console.error(`❌ Error saving trade for offer ${offerId}:`, tradeError.message)
        return
      }

      console.log(`✅ Trade indexed successfully: ${trade.id}`)

      // Update offer status to 'sold' if not already
      const { error: updateError } = await supabase
        .from('energy_offers')
        .update({ 
          status: 'sold',
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', parseInt(offerId))
        .neq('status', 'sold')

      if (updateError) {
        console.warn(`⚠️ Could not update offer ${offerId} status:`, updateError.message)
      }

    } catch (error) {
      console.error(`❌ Error processing purchase event:`, error.message)
    }
  }

  /**
   * Get indexer status and statistics
   */
  async getStatus() {
    try {
      const currentBlock = await this.provider.getBlockNumber()
      const blocksBehind = currentBlock - this.lastProcessedBlock

      // Get trade statistics
      const { data: tradeStats, error } = await supabase
        .from('trades')
        .select('id')
        .eq('status', 'completed')

      const totalTrades = tradeStats?.length || 0

      return {
        isRunning: this.isRunning,
        currentBlock,
        lastProcessedBlock: this.lastProcessedBlock,
        blocksBehind,
        totalTradesIndexed: totalTrades,
        contractAddress: this.contract?.target,
        status: blocksBehind < 10 ? 'synced' : 'syncing'
      }
    } catch (error) {
      console.error('Error getting indexer status:', error.message)
      return {
        isRunning: this.isRunning,
        error: error.message
      }
    }
  }

  /**
   * Manually reindex from a specific block
   */
  async reindexFromBlock(fromBlock) {
    try {
      console.log(`🔄 Reindexing from block ${fromBlock}`)
      
      this.lastProcessedBlock = fromBlock - 1
      await this.saveLastProcessedBlock()
      
      await this.processHistoricalEvents()
      
      console.log('✅ Reindexing completed')
      return true
    } catch (error) {
      console.error('❌ Reindexing failed:', error.message)
      return false
    }
  }
}

export default TransactionIndexerService
