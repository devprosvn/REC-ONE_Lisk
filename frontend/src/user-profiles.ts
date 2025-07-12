/**
 * User Profiles Management
 * Enhanced user experience with detailed profiles and authentication
 */

import { supabase } from './supabase-client.js'

interface UserProfile {
  id: string
  wallet_address?: string
  display_name?: string
  email?: string
  avatar_url?: string
  bio?: string
  location?: string
  phone?: string
  energy_producer_type?: 'solar' | 'wind' | 'hydro' | 'biomass' | 'other'
  installation_capacity?: number
  installation_date?: string
  verified: boolean
  reputation_score: number
  total_energy_sold: number
  total_energy_bought: number
  total_transactions: number
  created_at: string
  updated_at: string
}

interface UserStats {
  total_offers_created: number
  total_offers_sold: number
  active_offers: number
  total_energy_sold: number
  total_eth_earned: number
  avg_price_per_kwh: number
}

interface TradeHistory {
  id: string
  offer_id: number
  quantity: number
  price_per_kwh_eth: number
  total_price_eth: number
  transaction_hash: string
  block_timestamp: string
  trade_type: 'buy' | 'sell'
  buyer_name?: string
  seller_name?: string
  buyer_avatar?: string
  seller_avatar?: string
}

class UserProfileManager {
  private currentUser: any = null
  private currentProfile: UserProfile | null = null

  constructor() {
    this.initializeAuth()
  }

  /**
   * Initialize Supabase authentication
   */
  private async initializeAuth() {
    // Check if user is already logged in
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      this.currentUser = session.user
      await this.loadUserProfile()
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.currentUser = session.user
        await this.loadUserProfile()
        this.showAuthStatus('✅ Signed in successfully', 'success')
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.currentProfile = null
        this.showAuthStatus('👋 Signed out', 'info')
      }
    })
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, displayName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || (email ? email.split('@')[0] : 'User')
          }
        }
      })

      if (error) throw error

      this.showAuthStatus('📧 Check your email for verification link', 'info')
      return { success: true, data }
    } catch (error) {
      this.showAuthStatus(`❌ Sign up failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      this.showAuthStatus(`❌ Sign in failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return { success: true }
    } catch (error) {
      this.showAuthStatus(`❌ Sign out failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  /**
   * Load current user's profile
   */
  private async loadUserProfile() {
    if (!this.currentUser) return

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      this.currentProfile = profile
      this.updateProfileDisplay()
    } catch (error) {
      console.error('Error loading profile:', error.message)
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: Partial<UserProfile>) {
    if (!this.currentUser) {
      this.showAuthStatus('❌ Please sign in first', 'error')
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUser.id)
        .select()
        .single()

      if (error) throw error

      this.currentProfile = data
      this.updateProfileDisplay()
      this.showAuthStatus('✅ Profile updated successfully', 'success')
      
      return { success: true, data }
    } catch (error) {
      this.showAuthStatus(`❌ Profile update failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  /**
   * Link wallet address to profile
   */
  async linkWallet(walletAddress: string) {
    if (!this.currentUser) {
      this.showAuthStatus('❌ Please sign in first', 'error')
      return { success: false, error: 'Not authenticated' }
    }

    try {
      // Check if wallet is already linked
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('wallet_address', walletAddress.toLowerCase())
        .neq('id', this.currentUser.id)
        .single()

      if (existingProfile) {
        this.showAuthStatus('❌ Wallet already linked to another account', 'error')
        return { success: false, error: 'Wallet already linked' }
      }

      // Link wallet to current profile
      const result = await this.updateProfile({
        wallet_address: walletAddress.toLowerCase()
      })

      if (result.success) {
        this.showAuthStatus('✅ Wallet linked successfully', 'success')
      }

      return result
    } catch (error) {
      this.showAuthStatus(`❌ Wallet linking failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getProfileByWallet(walletAddress: string): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Profile not found
        }
        throw error
      }

      return profile
    } catch (error) {
      console.error('Error fetching profile by wallet:', error.message)
      return null
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId?: string): Promise<UserStats | null> {
    const targetUserId = userId || this.currentUser?.id
    if (!targetUserId) return null

    try {
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Stats not found
        }
        throw error
      }

      return stats
    } catch (error) {
      console.error('Error fetching user stats:', error.message)
      return null
    }
  }

  /**
   * Get user's trade history
   */
  async getTradeHistory(limit = 50, offset = 0): Promise<TradeHistory[]> {
    if (!this.currentUser) return []

    try {
      const { data: trades, error } = await supabase
        .from('user_trade_history')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return trades || []
    } catch (error) {
      console.error('Error fetching trade history:', error.message)
      return []
    }
  }

  /**
   * Search user profiles
   */
  async searchProfiles(query: string, limit = 20): Promise<UserProfile[]> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id, display_name, avatar_url, location, 
          energy_producer_type, installation_capacity, 
          reputation_score, verified
        `)
        .or(`display_name.ilike.%${query}%,location.ilike.%${query}%`)
        .order('reputation_score', { ascending: false })
        .limit(limit)

      if (error) throw error

      return profiles || []
    } catch (error) {
      console.error('Error searching profiles:', error.message)
      return []
    }
  }

  /**
   * Update profile display in UI
   */
  private updateProfileDisplay() {
    const profileContainer = document.getElementById('user-profile-display')
    if (!profileContainer || !this.currentProfile) return

    const avatarUrl = this.currentProfile.avatar_url || 'https://via.placeholder.com/40x40?text=👤'
    const displayName = this.currentProfile.display_name || 'Anonymous User'
    const walletAddress = this.currentProfile.wallet_address || 'No wallet linked'

    profileContainer.innerHTML = `
      <div class="user-profile-card">
        <img src="${avatarUrl}" alt="Avatar" class="user-avatar">
        <div class="user-info">
          <h3>${displayName}</h3>
          <p class="wallet-address">${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}</p>
          ${this.currentProfile.verified ? '<span class="verified-badge">✅ Verified</span>' : ''}
          <p class="reputation">⭐ ${this.currentProfile.reputation_score} reputation</p>
        </div>
      </div>
    `
  }

  /**
   * Show authentication status message
   */
  private showAuthStatus(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const statusElement = document.getElementById('auth-status')
    if (!statusElement) return

    statusElement.textContent = message
    statusElement.className = `auth-status ${type}`
    statusElement.style.display = 'block'

    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusElement.style.display = 'none'
    }, 5000)
  }

  /**
   * Get current user and profile
   */
  getCurrentUser() {
    return {
      user: this.currentUser,
      profile: this.currentProfile
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUser
  }

  /**
   * Check if user has linked wallet
   */
  hasLinkedWallet(): boolean {
    return !!(this.currentProfile?.wallet_address)
  }
}

// Export singleton instance
export const userProfileManager = new UserProfileManager()
export default userProfileManager
