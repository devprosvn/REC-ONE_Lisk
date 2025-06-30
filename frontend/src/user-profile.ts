// User Profile Management Module
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = 'https://jzzljxhqrbxeiqozptek.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6emxqeGhxcmJ4ZWlxb3p0ZWsiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzU3NzE5NCwiZXhwIjoyMDQ5MTUzMTk0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  wallet_address?: string
  bio?: string
  location?: string
  phone?: string
  is_verified: boolean
  reputation_score: number
  total_energy_sold: number
  total_energy_bought: number
  total_transactions: number
  created_at: string
  updated_at: string
}

interface TradeRecord {
  id: string
  offer_id: number
  buyer_wallet: string
  seller_wallet: string
  buyer_name?: string
  seller_name?: string
  quantity: number
  price_per_kwh: number
  total_price: number
  currency: string
  chain_id: number
  chain_name: string
  tx_hash: string
  status: string
  created_at: string
}

class UserProfileManager {
  private currentUser: UserProfile | null = null
  private isAuthenticated: boolean = false

  constructor() {
    this.initializeAuth()
    this.setupAuthListeners()
  }

  private async initializeAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await this.loadUserProfile(session.user.id)
        this.isAuthenticated = true
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    }
  }

  private setupAuthListeners() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.loadUserProfile(session.user.id)
        this.isAuthenticated = true
        this.updateAuthUI()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.isAuthenticated = false
        this.updateAuthUI()
      }
    })
  }

  // Authentication methods
  async signUp(email: string, password: string, displayName: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      })

      if (error) {
        return { success: false, message: error.message }
      }

      return { 
        success: true, 
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.' 
      }
    } catch (error) {
      return { success: false, message: 'Lỗi đăng ký: ' + error.message }
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Đăng nhập thành công!' }
    } catch (error) {
      return { success: false, message: 'Lỗi đăng nhập: ' + error.message }
    }
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Profile management
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error loading profile:', error)
        return
      }

      this.currentUser = data
    } catch (error) {
      console.error('Load profile error:', error)
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; message: string }> {
    if (!this.isAuthenticated || !this.currentUser) {
      return { success: false, message: 'Bạn cần đăng nhập để cập nhật hồ sơ' }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', this.currentUser.id)
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      this.currentUser = { ...this.currentUser, ...data }
      return { success: true, message: 'Cập nhật hồ sơ thành công!' }
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật hồ sơ: ' + error.message }
    }
  }

  async linkWalletAddress(walletAddress: string): Promise<{ success: boolean; message: string }> {
    if (!this.isAuthenticated || !this.currentUser) {
      return { success: false, message: 'Bạn cần đăng nhập để liên kết ví' }
    }

    try {
      // Check if wallet is already linked to another account
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('wallet_address', walletAddress.toLowerCase())
        .neq('id', this.currentUser.id)
        .single()

      if (existingProfile) {
        return { 
          success: false, 
          message: `Ví này đã được liên kết với tài khoản khác: ${existingProfile.display_name}` 
        }
      }

      const result = await this.updateProfile({ 
        wallet_address: walletAddress.toLowerCase() 
      })

      if (result.success) {
        return { success: true, message: 'Liên kết ví thành công!' }
      } else {
        return result
      }
    } catch (error) {
      return { success: false, message: 'Lỗi liên kết ví: ' + error.message }
    }
  }

  // User lookup methods
  async getUserByWallet(walletAddress: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      console.error('Get user by wallet error:', error)
      return null
    }
  }

  async getUserDisplayName(walletAddress: string): Promise<string> {
    const user = await this.getUserByWallet(walletAddress)
    if (user && user.display_name) {
      return user.display_name
    }
    
    // Return formatted wallet address if no display name
    return this.formatWalletAddress(walletAddress)
  }

  private formatWalletAddress(address: string): string {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Transaction history
  async recordTrade(tradeData: {
    offerId: number
    buyerWallet: string
    sellerWallet: string
    quantity: number
    pricePerKwh: number
    totalPrice: number
    currency: string
    chainId: number
    chainName: string
    txHash: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Get user profiles for buyer and seller
      const [buyerProfile, sellerProfile] = await Promise.all([
        this.getUserByWallet(tradeData.buyerWallet),
        this.getUserByWallet(tradeData.sellerWallet)
      ])

      const { data, error } = await supabase
        .from('trades')
        .insert({
          offer_id: tradeData.offerId,
          buyer_id: buyerProfile?.id || null,
          seller_id: sellerProfile?.id || null,
          buyer_wallet: tradeData.buyerWallet.toLowerCase(),
          seller_wallet: tradeData.sellerWallet.toLowerCase(),
          buyer_name: buyerProfile?.display_name || null,
          seller_name: sellerProfile?.display_name || null,
          quantity: tradeData.quantity,
          price_per_kwh: tradeData.pricePerKwh,
          total_price: tradeData.totalPrice,
          currency: tradeData.currency,
          chain_id: tradeData.chainId,
          chain_name: tradeData.chainName,
          tx_hash: tradeData.txHash,
          status: 'completed'
        })

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Ghi nhận giao dịch thành công!' }
    } catch (error) {
      return { success: false, message: 'Lỗi ghi nhận giao dịch: ' + error.message }
    }
  }

  async getUserTrades(walletAddress: string, limit: number = 50): Promise<TradeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .or(`buyer_wallet.eq.${walletAddress.toLowerCase()},seller_wallet.eq.${walletAddress.toLowerCase()}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Get user trades error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Get user trades error:', error)
      return []
    }
  }

  async getAllTrades(limit: number = 100): Promise<TradeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Get all trades error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Get all trades error:', error)
      return []
    }
  }

  // UI management
  private updateAuthUI() {
    // Update authentication-related UI elements
    this.updateUserInfo()
    this.updateAuthButtons()
  }

  private updateUserInfo() {
    const userInfoElement = document.getElementById('user-info')
    if (!userInfoElement) return

    if (this.isAuthenticated && this.currentUser) {
      userInfoElement.innerHTML = `
        <div class="user-profile-info">
          <div class="user-avatar">
            ${this.currentUser.avatar_url ? 
              `<img src="${this.currentUser.avatar_url}" alt="Avatar">` :
              `<div class="avatar-placeholder">${this.currentUser.display_name?.charAt(0) || '?'}</div>`
            }
          </div>
          <div class="user-details">
            <div class="user-name">${this.currentUser.display_name || 'Người dùng'}</div>
            <div class="user-reputation">⭐ ${this.currentUser.reputation_score} điểm</div>
          </div>
        </div>
      `
    } else {
      userInfoElement.innerHTML = '<div class="user-not-logged-in">Chưa đăng nhập</div>'
    }
  }

  private updateAuthButtons() {
    const authButtonsElement = document.getElementById('auth-buttons')
    if (!authButtonsElement) return

    if (this.isAuthenticated) {
      authButtonsElement.innerHTML = `
        <button id="profile-btn" class="btn btn-secondary">👤 Hồ sơ</button>
        <button id="logout-btn" class="btn btn-outline">Đăng xuất</button>
      `
      
      // Add event listeners
      document.getElementById('profile-btn')?.addEventListener('click', () => this.showProfileModal())
      document.getElementById('logout-btn')?.addEventListener('click', () => this.signOut())
    } else {
      authButtonsElement.innerHTML = `
        <button id="login-btn" class="btn btn-primary">Đăng nhập</button>
        <button id="register-btn" class="btn btn-secondary">Đăng ký</button>
      `
      
      // Add event listeners
      document.getElementById('login-btn')?.addEventListener('click', () => this.showLoginModal())
      document.getElementById('register-btn')?.addEventListener('click', () => this.showRegisterModal())
    }
  }

  // Modal management methods (to be implemented)
  private showLoginModal() {
    // Implementation for login modal
    console.log('Show login modal')
  }

  private showRegisterModal() {
    // Implementation for register modal
    console.log('Show register modal')
  }

  private showProfileModal() {
    // Implementation for profile modal
    console.log('Show profile modal')
  }

  // Public getters
  getCurrentUser(): UserProfile | null {
    return this.currentUser
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  getCurrentUserWallet(): string | null {
    return this.currentUser?.wallet_address || null
  }
}

// Create global instance
const userProfileManager = new UserProfileManager()

// Export for use in other modules
export { userProfileManager, UserProfileManager, type UserProfile, type TradeRecord }

// Make available globally
;(window as any).userProfileManager = userProfileManager
