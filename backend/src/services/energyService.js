import { supabase, TABLES } from '../config/supabase.js'
import { UserService } from './userService.js'

export class EnergyService {

  // Record energy generation
  static async recordEnergyGeneration(data) {
    try {
      const { walletAddress, quantity, txHash, blockNumber, gasUsed, gasPrice } = data

      // Get or create user
      const { user } = await UserService.createOrGetUser(walletAddress)

      // Insert energy generation record
      const { data: generation, error } = await supabase
        .from(TABLES.ENERGY_GENERATION)
        .insert([
          {
            user_id: user.id,
            wallet_address: walletAddress.toLowerCase(),
            quantity: parseFloat(quantity),
            tx_hash: txHash,
            block_number: blockNumber,
            gas_used: gasUsed,
            gas_price: gasPrice,
            timestamp: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Update user stats
      await UserService.updateUserEnergyStats(walletAddress, 'generated', quantity)

      return generation
    } catch (error) {
      console.error('Error recording energy generation:', error)
      throw error
    }
  }

  // Record energy offer creation with balance validation
  static async recordEnergyOffer(data) {
    try {
      const {
        offerId,
        sellerWallet,
        quantity,
        pricePerKWhETH,
        pricePerKWhVND,
        txHash,
        blockNumber
      } = data

      // Get or create user
      const { user } = await UserService.createOrGetUser(sellerWallet)

      // Validate energy balance before creating offer
      const isValid = await this.validateEnergyBalance(sellerWallet, quantity)
      if (!isValid) {
        throw new Error(`Insufficient energy balance. You can only sell energy that you have generated.`)
      }

      // Calculate total prices
      const totalPriceETH = parseFloat(quantity) * parseFloat(pricePerKWhETH)
      const totalPriceVND = parseFloat(quantity) * parseFloat(pricePerKWhVND)

      // Insert energy offer record
      const { data: offer, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .insert([
          {
            offer_id: parseInt(offerId),
            seller_id: user.id,
            seller_wallet: sellerWallet.toLowerCase(),
            quantity: parseFloat(quantity),
            price_per_kwh_eth: parseFloat(pricePerKWhETH),
            price_per_kwh_vnd: parseFloat(pricePerKWhVND),
            total_price_eth: totalPriceETH,
            total_price_vnd: totalPriceVND,
            status: 'active',
            tx_hash_created: txHash,
            block_number_created: blockNumber
          }
        ])
        .select()
        .single()

      if (error) throw error
      return offer
    } catch (error) {
      console.error('Error recording energy offer:', error)
      throw error
    }
  }

  // Record energy purchase
  static async recordEnergyPurchase(data) {
    try {
      const { 
        offerId, 
        buyerWallet, 
        sellerWallet, 
        quantity, 
        totalPriceETH,
        totalPriceVND,
        txHash, 
        blockNumber 
      } = data

      // Get or create buyer
      const { user: buyer } = await UserService.createOrGetUser(buyerWallet)

      // Update offer status
      const { data: offer, error: offerError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({
          status: 'sold',
          buyer_id: buyer.id,
          buyer_wallet: buyerWallet.toLowerCase(),
          tx_hash_completed: txHash,
          block_number_completed: blockNumber,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', parseInt(offerId))
        .select()
        .single()

      if (offerError) throw offerError

      // Update user stats
      await UserService.updateUserEnergyStats(sellerWallet, 'sold', quantity, totalPriceVND)
      await UserService.updateUserEnergyStats(buyerWallet, 'bought', quantity, totalPriceVND)

      return offer
    } catch (error) {
      console.error('Error recording energy purchase:', error)
      throw error
    }
  }

  // Cancel energy offer
  static async cancelEnergyOffer(data) {
    try {
      const { offerId, txHash, blockNumber } = data

      // Update offer status
      const { data: offer, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({
          status: 'cancelled',
          tx_hash_completed: txHash,
          block_number_completed: blockNumber,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', parseInt(offerId))
        .select()
        .single()

      if (error) throw error
      return offer
    } catch (error) {
      console.error('Error cancelling energy offer:', error)
      throw error
    }
  }

  // Get active offers with enhanced data
  static async getActiveOffers(limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select(`
          *,
          seller:users!seller_id(wallet_address, username, reputation_score)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting active offers:', error)
      throw error
    }
  }

  // Get user's energy history
  static async getUserEnergyHistory(walletAddress, limit = 50) {
    try {
      const { data: user } = await supabase
        .from(TABLES.USERS)
        .select('id')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (!user) throw new Error('User not found')

      // Get generation history
      const { data: generations, error: genError } = await supabase
        .from(TABLES.ENERGY_GENERATION)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (genError) throw genError

      // Get offer history
      const { data: offers, error: offerError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select(`
          *,
          buyer:users!buyer_id(wallet_address, username)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (offerError) throw offerError

      // Get purchase history
      const { data: purchases, error: purchaseError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select(`
          *,
          seller:users!seller_id(wallet_address, username)
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'sold')
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (purchaseError) throw purchaseError

      return {
        generations,
        offers,
        purchases
      }
    } catch (error) {
      console.error('Error getting user energy history:', error)
      throw error
    }
  }

  // Get marketplace statistics
  static async getMarketplaceStats() {
    try {
      // Active offers count and total volume
      const { data: activeStats, error: activeError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('quantity, total_price_vnd')
        .eq('status', 'active')

      if (activeError) throw activeError

      // Completed trades in last 24 hours
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: recentTrades, error: tradesError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('quantity, total_price_vnd, completed_at')
        .eq('status', 'sold')
        .gte('completed_at', yesterday.toISOString())

      if (tradesError) throw tradesError

      // Calculate statistics
      const activeOffersCount = activeStats.length
      const totalActiveVolume = activeStats.reduce((sum, offer) => sum + parseFloat(offer.quantity), 0)
      const totalActiveValue = activeStats.reduce((sum, offer) => sum + parseFloat(offer.total_price_vnd), 0)

      const recentTradesCount = recentTrades.length
      const recentVolume = recentTrades.reduce((sum, trade) => sum + parseFloat(trade.quantity), 0)
      const recentValue = recentTrades.reduce((sum, trade) => sum + parseFloat(trade.total_price_vnd), 0)

      const averagePrice = totalActiveVolume > 0 ? totalActiveValue / totalActiveVolume : 0

      return {
        activeOffers: {
          count: activeOffersCount,
          totalVolume: totalActiveVolume,
          totalValue: totalActiveValue,
          averagePrice
        },
        recentTrades: {
          count: recentTradesCount,
          volume: recentVolume,
          value: recentValue
        }
      }
    } catch (error) {
      console.error('Error getting marketplace stats:', error)
      throw error
    }
  }

  // Search offers
  static async searchOffers(filters = {}) {
    try {
      let query = supabase
        .from(TABLES.ENERGY_OFFERS)
        .select(`
          *,
          seller:users!seller_id(wallet_address, username, reputation_score)
        `)
        .eq('status', 'active')

      // Apply filters
      if (filters.minQuantity) {
        query = query.gte('quantity', filters.minQuantity)
      }
      if (filters.maxQuantity) {
        query = query.lte('quantity', filters.maxQuantity)
      }
      if (filters.minPrice) {
        query = query.gte('price_per_kwh_vnd', filters.minPrice)
      }
      if (filters.maxPrice) {
        query = query.lte('price_per_kwh_vnd', filters.maxPrice)
      }
      if (filters.sellerWallet) {
        query = query.eq('seller_wallet', filters.sellerWallet.toLowerCase())
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const limit = Math.min(filters.limit || 20, 100)
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error searching offers:', error)
      throw error
    }
  }

  // Validate energy balance for offers
  static async validateEnergyBalance(walletAddress, offerQuantity) {
    try {
      const { data, error } = await supabase.rpc('validate_energy_offer', {
        user_wallet: walletAddress.toLowerCase(),
        offer_quantity: parseFloat(offerQuantity)
      })

      if (error) {
        console.error('Error validating energy balance:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('Error in validateEnergyBalance:', error)
      return false
    }
  }

  // Get user's available energy balance
  static async getAvailableEnergyBalance(walletAddress) {
    try {
      const { data, error } = await supabase.rpc('get_available_energy_balance', {
        user_wallet: walletAddress.toLowerCase()
      })

      if (error) {
        console.error('Error getting energy balance:', error)
        return 0
      }

      return parseFloat(data) || 0
    } catch (error) {
      console.error('Error in getAvailableEnergyBalance:', error)
      return 0
    }
  }

  // Get user's energy balance summary
  static async getUserEnergyBalance(walletAddress) {
    try {
      const { data: user, error } = await supabase
        .from(TABLES.USERS)
        .select('total_energy_generated, total_energy_sold, available_energy_balance')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) {
        console.error('Error getting user energy balance:', error)
        return {
          totalGenerated: 0,
          totalSold: 0,
          availableBalance: 0,
          pendingOffers: 0,
          maxCanSell: 0
        }
      }

      // Get pending offers quantity
      const { data: pendingOffers, error: offersError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('quantity')
        .eq('seller_wallet', walletAddress.toLowerCase())
        .eq('status', 'active')

      if (offersError) {
        console.error('Error getting pending offers:', offersError)
      }

      const pendingQuantity = pendingOffers?.reduce((sum, offer) => sum + parseFloat(offer.quantity), 0) || 0

      return {
        totalGenerated: parseFloat(user.total_energy_generated) || 0,
        totalSold: parseFloat(user.total_energy_sold) || 0,
        availableBalance: parseFloat(user.available_energy_balance) || 0,
        pendingOffers: pendingQuantity,
        maxCanSell: Math.max(0, (parseFloat(user.available_energy_balance) || 0) - pendingQuantity)
      }
    } catch (error) {
      console.error('Error in getUserEnergyBalance:', error)
      return {
        totalGenerated: 0,
        totalSold: 0,
        availableBalance: 0,
        pendingOffers: 0,
        maxCanSell: 0
      }
    }
  }
}
