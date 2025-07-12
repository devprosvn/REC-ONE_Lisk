import { supabase, supabaseAdmin, TABLES } from '../config/supabase.js'

export class UserService {
  
  // Create or get user by wallet address
  static async createOrGetUser(walletAddress) {
    try {
      // First, try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (existingUser && !fetchError) {
        return { user: existingUser, isNew: false }
      }

      // Create new user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from(TABLES.USERS)
        .insert([
          {
            wallet_address: walletAddress.toLowerCase(),
            username: `User_${walletAddress.slice(-6)}`,
            reputation_score: 100
          }
        ])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return { user: newUser, isNew: true }
    } catch (error) {
      console.error('Error in createOrGetUser:', error)
      throw error
    }
  }

  // Update user profile
  static async updateUserProfile(walletAddress, updates) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress.toLowerCase())
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  // Get user statistics
  static async getUserStats(walletAddress) {
    try {
      const { data: user, error } = await supabase
        .from(TABLES.USERS)
        .select(`
          *,
          energy_generation(quantity, created_at),
          energy_offers(quantity, price_per_kwh_vnd, status, created_at)
        `)
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) throw error

      // Calculate additional stats
      const totalGenerated = user.energy_generation?.reduce((sum, gen) => sum + parseFloat(gen.quantity), 0) || 0
      const activeOffers = user.energy_offers?.filter(offer => offer.status === 'active').length || 0
      const soldOffers = user.energy_offers?.filter(offer => offer.status === 'sold').length || 0

      return {
        ...user,
        stats: {
          totalGenerated,
          activeOffers,
          soldOffers,
          totalOffers: user.energy_offers?.length || 0
        }
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      throw error
    }
  }

  // Update user energy stats using database function
  static async updateUserEnergyStats(walletAddress, type, quantity, amount_vnd = 0) {
    try {
      console.log(`📊 Updating user energy stats: ${walletAddress}, ${type}, ${quantity}, ${amount_vnd}`)

      // Use the database function for energy stats updates
      const { data, error } = await supabase.rpc('update_user_energy_stats', {
        user_wallet: walletAddress.toLowerCase(),
        stat_type: type,
        quantity_val: parseFloat(quantity),
        earnings_val: parseFloat(amount_vnd)
      })

      if (error) {
        console.error('Database function error:', error)
        throw error
      }

      console.log('✅ User energy stats updated successfully')
      return data
    } catch (error) {
      console.error('Error updating user energy stats:', error)
      throw error
    }
  }

  // Get user leaderboard
  static async getLeaderboard(limit = 10, type = 'earnings') {
    try {
      let orderBy = 'total_earnings_vnd'
      
      switch (type) {
        case 'generation':
          orderBy = 'total_energy_generated'
          break
        case 'trading':
          orderBy = 'total_energy_sold'
          break
        case 'reputation':
          orderBy = 'reputation_score'
          break
      }

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('wallet_address, username, total_energy_generated, total_energy_sold, total_earnings_vnd, reputation_score, created_at')
        .order(orderBy, { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting leaderboard:', error)
      throw error
    }
  }

  // Search users
  static async searchUsers(query, limit = 20) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('wallet_address, username, reputation_score, total_energy_sold, created_at')
        .or(`username.ilike.%${query}%, wallet_address.ilike.%${query}%`)
        .order('reputation_score', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  }

  // Update user reputation
  static async updateReputation(walletAddress, change) {
    try {
      const { data, error } = await supabase.rpc('update_reputation', {
        wallet_addr: walletAddress.toLowerCase(),
        reputation_change: change
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating reputation:', error)
      throw error
    }
  }
}
