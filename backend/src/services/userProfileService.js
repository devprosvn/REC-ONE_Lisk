import { supabase } from '../config/supabase.js'

/**
 * User Profile Service
 * Manages user profiles, authentication, and user-related data
 */
class UserProfileService {
  
  /**
   * Get user profile by ID
   */
  static async getProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_stats (
            total_offers_created,
            total_offers_sold,
            active_offers,
            total_energy_sold,
            total_eth_earned,
            avg_price_per_kwh
          )
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error.message)
        return { success: false, message: 'Failed to fetch user profile', error: error.message }
      }

      return { success: true, data: profile }
    } catch (error) {
      console.error('Profile service error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Get user profile by wallet address
   */
  static async getProfileByWallet(walletAddress) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_stats (
            total_offers_created,
            total_offers_sold,
            active_offers,
            total_energy_sold,
            total_eth_earned,
            avg_price_per_kwh
          )
        `)
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, message: 'User profile not found', error: 'NOT_FOUND' }
        }
        console.error('Error fetching user profile by wallet:', error.message)
        return { success: false, message: 'Failed to fetch user profile', error: error.message }
      }

      return { success: true, data: profile }
    } catch (error) {
      console.error('Profile service error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, profileData) {
    try {
      // Validate and sanitize input
      const allowedFields = [
        'display_name', 'bio', 'location', 'phone', 'avatar_url',
        'energy_producer_type', 'installation_capacity', 'installation_date'
      ]
      
      const updateData = {}
      Object.keys(profileData).forEach(key => {
        if (allowedFields.includes(key) && profileData[key] !== undefined) {
          updateData[key] = profileData[key]
        }
      })

      updateData.updated_at = new Date().toISOString()

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error.message)
        return { success: false, message: 'Failed to update profile', error: error.message }
      }

      return { success: true, data: profile, message: 'Profile updated successfully' }
    } catch (error) {
      console.error('Profile update error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Link wallet address to user profile
   */
  static async linkWallet(userId, walletAddress) {
    try {
      // Check if wallet is already linked to another user
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('wallet_address', walletAddress.toLowerCase())
        .neq('id', userId)
        .single()

      if (existingProfile) {
        return { 
          success: false, 
          message: 'Wallet address is already linked to another account',
          error: 'WALLET_ALREADY_LINKED'
        }
      }

      // Link wallet to user profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error linking wallet:', error.message)
        return { success: false, message: 'Failed to link wallet', error: error.message }
      }

      return { success: true, data: profile, message: 'Wallet linked successfully' }
    } catch (error) {
      console.error('Wallet linking error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Get all user profiles (for marketplace display)
   */
  static async getAllProfiles(limit = 50, offset = 0) {
    try {
      const { data: profiles, error } = await supabase
        .from('user_stats')
        .select(`
          id,
          display_name,
          avatar_url,
          energy_producer_type,
          installation_capacity,
          reputation_score,
          total_offers_created,
          total_offers_sold,
          total_energy_sold,
          avg_price_per_kwh
        `)
        .order('reputation_score', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching all profiles:', error.message)
        return { success: false, message: 'Failed to fetch profiles', error: error.message }
      }

      return { success: true, data: profiles }
    } catch (error) {
      console.error('Profiles fetch error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Search profiles by name or location
   */
  static async searchProfiles(query, limit = 20) {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          avatar_url,
          location,
          energy_producer_type,
          installation_capacity,
          reputation_score
        `)
        .or(`display_name.ilike.%${query}%,location.ilike.%${query}%`)
        .order('reputation_score', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error searching profiles:', error.message)
        return { success: false, message: 'Failed to search profiles', error: error.message }
      }

      return { success: true, data: profiles }
    } catch (error) {
      console.error('Profile search error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Get user's trade history
   */
  static async getUserTradeHistory(userId, limit = 50, offset = 0) {
    try {
      const { data: trades, error } = await supabase
        .from('user_trade_history')
        .select('*')
        .eq('buyer_profile_id', userId)
        .or(`seller_profile_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching trade history:', error.message)
        return { success: false, message: 'Failed to fetch trade history', error: error.message }
      }

      return { success: true, data: trades }
    } catch (error) {
      console.error('Trade history error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Verify user profile (admin function)
   */
  static async verifyProfile(userId, verified = true) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ 
          verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error verifying profile:', error.message)
        return { success: false, message: 'Failed to verify profile', error: error.message }
      }

      return { 
        success: true, 
        data: profile, 
        message: `Profile ${verified ? 'verified' : 'unverified'} successfully` 
      }
    } catch (error) {
      console.error('Profile verification error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId) {
    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user stats:', error.message)
        return { success: false, message: 'Failed to fetch user statistics', error: error.message }
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('User stats error:', error.message)
      return { success: false, message: 'Internal server error', error: error.message }
    }
  }
}

export default UserProfileService
