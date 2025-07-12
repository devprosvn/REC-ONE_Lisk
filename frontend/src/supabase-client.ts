/**
 * Supabase Client Configuration
 * Frontend client for authentication and database operations
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://jzzljxhqrbxeiqozptek.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6emxqeGhxcmJ4ZWlxb3pwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMzE5NDUsImV4cCI6MjA2NjgwNzk0NX0.-XsV3N9WuLfqpGModGoB9QtBKBAdh-p0D7HVEW2ZL-E'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  TRADES: 'trades',
  ENERGY_OFFERS: 'energy_offers',
  USER_STATS: 'user_stats',
  USER_TRADE_HISTORY: 'user_trade_history'
}

// Auth helper functions
export const authHelpers = {
  /**
   * Get current user session
   */
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: any) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  },

  /**
   * Sign out
   */
  async signOut() {
    return await supabase.auth.signOut()
  },

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
  },

  /**
   * Update user password
   */
  async updatePassword(password: string) {
    return await supabase.auth.updateUser({ password })
  },

  /**
   * Update user metadata
   */
  async updateUserMetadata(metadata: any) {
    return await supabase.auth.updateUser({
      data: metadata
    })
  }
}

// Database helper functions
export const dbHelpers = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    return await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single()
  },

  /**
   * Get user profile by wallet address
   */
  async getProfileByWallet(walletAddress: string) {
    return await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: any) {
    return await supabase
      .from(TABLES.PROFILES)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
  },

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    return await supabase
      .from(TABLES.USER_STATS)
      .select('*')
      .eq('id', userId)
      .single()
  },

  /**
   * Get user trade history
   */
  async getUserTradeHistory(userId: string, limit = 50, offset = 0) {
    return await supabase
      .from(TABLES.USER_TRADE_HISTORY)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  },

  /**
   * Search profiles
   */
  async searchProfiles(query: string, limit = 20) {
    return await supabase
      .from(TABLES.PROFILES)
      .select(`
        id, display_name, avatar_url, location,
        energy_producer_type, installation_capacity,
        reputation_score, verified
      `)
      .or(`display_name.ilike.%${query}%,location.ilike.%${query}%`)
      .order('reputation_score', { ascending: false })
      .limit(limit)
  },

  /**
   * Get all profiles for marketplace
   */
  async getAllProfiles(limit = 50, offset = 0) {
    return await supabase
      .from(TABLES.USER_STATS)
      .select(`
        id, display_name, avatar_url, energy_producer_type,
        installation_capacity, reputation_score,
        total_offers_created, total_offers_sold,
        total_energy_sold, avg_price_per_kwh
      `)
      .order('reputation_score', { ascending: false })
      .range(offset, offset + limit - 1)
  }
}

// Real-time subscription helpers
export const realtimeHelpers = {
  /**
   * Subscribe to profile changes
   */
  subscribeToProfile(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`profile:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.PROFILES,
        filter: `id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  /**
   * Subscribe to new trades
   */
  subscribeToTrades(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`trades:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: TABLES.TRADES,
        filter: `buyer_profile_id=eq.${userId},seller_profile_id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  /**
   * Subscribe to offer changes
   */
  subscribeToOffers(callback: (payload: any) => void) {
    return supabase
      .channel('offers')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.ENERGY_OFFERS
      }, callback)
      .subscribe()
  },

  /**
   * Unsubscribe from channel
   */
  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription)
  }
}

// Error handling helpers
export const errorHelpers = {
  /**
   * Check if error is authentication related
   */
  isAuthError(error: any): boolean {
    return error?.message?.includes('JWT') || 
           error?.message?.includes('auth') ||
           error?.status === 401
  },

  /**
   * Check if error is permission related
   */
  isPermissionError(error: any): boolean {
    return error?.message?.includes('permission') ||
           error?.message?.includes('policy') ||
           error?.status === 403
  },

  /**
   * Check if error is network related
   */
  isNetworkError(error: any): boolean {
    return error?.message?.includes('network') ||
           error?.message?.includes('fetch') ||
           !navigator.onLine
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: any): string {
    if (this.isAuthError(error)) {
      return 'Please sign in to continue'
    }
    if (this.isPermissionError(error)) {
      return 'You do not have permission to perform this action'
    }
    if (this.isNetworkError(error)) {
      return 'Network error. Please check your connection'
    }
    return error?.message || 'An unexpected error occurred'
  }
}

// Export default client
export default supabase
