/**
 * User Profile UI Components
 * Enhanced user interface for profile management and display
 */

import { userProfileManager } from './user-profiles.js'

class UserProfileUI {
  private isProfileModalOpen = false
  private isAuthModalOpen = false

  constructor() {
    this.initializeUI()
    this.setupEventListeners()
  }

  /**
   * Initialize UI components
   */
  private initializeUI() {
    this.createAuthModal()
    this.createProfileModal()
    this.createUserProfileDisplay()
    this.updateAuthButton()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    // Auth button click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      
      if (target.id === 'auth-button') {
        this.toggleAuthModal()
      } else if (target.id === 'profile-button') {
        this.toggleProfileModal()
      } else if (target.classList.contains('close-modal')) {
        this.closeAllModals()
      }
    })

    // Form submissions
    document.addEventListener('submit', (e) => {
      const target = e.target as HTMLFormElement
      
      if (target.id === 'sign-in-form') {
        e.preventDefault()
        this.handleSignIn(target)
      } else if (target.id === 'sign-up-form') {
        e.preventDefault()
        this.handleSignUp(target)
      } else if (target.id === 'profile-form') {
        e.preventDefault()
        this.handleProfileUpdate(target)
      }
    })

    // Listen for auth state changes
    userProfileManager.getCurrentUser()
    setInterval(() => {
      this.updateAuthButton()
      this.updateUserProfileDisplay()
    }, 1000)
  }

  /**
   * Create authentication modal
   */
  private createAuthModal() {
    const modalHTML = `
      <div id="auth-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <div class="auth-tabs">
            <button class="tab-button active" data-tab="sign-in">Sign In</button>
            <button class="tab-button" data-tab="sign-up">Sign Up</button>
          </div>
          
          <div id="sign-in-tab" class="tab-content active">
            <h2>🔐 Sign In</h2>
            <form id="sign-in-form">
              <div class="form-group">
                <label for="signin-email">Email:</label>
                <input type="email" id="signin-email" required>
              </div>
              <div class="form-group">
                <label for="signin-password">Password:</label>
                <input type="password" id="signin-password" required>
              </div>
              <button type="submit" class="btn btn-primary">Sign In</button>
            </form>
          </div>
          
          <div id="sign-up-tab" class="tab-content">
            <h2>📝 Sign Up</h2>
            <form id="sign-up-form">
              <div class="form-group">
                <label for="signup-email">Email:</label>
                <input type="email" id="signup-email" required>
              </div>
              <div class="form-group">
                <label for="signup-password">Password:</label>
                <input type="password" id="signup-password" required minlength="6">
              </div>
              <div class="form-group">
                <label for="signup-name">Display Name:</label>
                <input type="text" id="signup-name" placeholder="Your name">
              </div>
              <button type="submit" class="btn btn-primary">Sign Up</button>
            </form>
          </div>
          
          <div id="auth-status" class="auth-status" style="display: none;"></div>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const tabName = target.getAttribute('data-tab')
        this.switchAuthTab(tabName!)
      })
    })
  }

  /**
   * Create profile management modal
   */
  private createProfileModal() {
    const modalHTML = `
      <div id="profile-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>👤 User Profile</h2>
          
          <form id="profile-form">
            <div class="form-group">
              <label for="profile-name">Display Name:</label>
              <input type="text" id="profile-name" placeholder="Your display name">
            </div>
            
            <div class="form-group">
              <label for="profile-bio">Bio:</label>
              <textarea id="profile-bio" placeholder="Tell us about yourself" rows="3"></textarea>
            </div>
            
            <div class="form-group">
              <label for="profile-location">Location:</label>
              <input type="text" id="profile-location" placeholder="Your location">
            </div>
            
            <div class="form-group">
              <label for="profile-phone">Phone:</label>
              <input type="tel" id="profile-phone" placeholder="Your phone number">
            </div>
            
            <div class="form-group">
              <label for="profile-avatar">Avatar URL:</label>
              <input type="url" id="profile-avatar" placeholder="https://example.com/avatar.jpg">
            </div>
            
            <div class="form-group">
              <label for="profile-producer-type">Energy Producer Type:</label>
              <select id="profile-producer-type">
                <option value="">Select type</option>
                <option value="solar">☀️ Solar</option>
                <option value="wind">💨 Wind</option>
                <option value="hydro">💧 Hydro</option>
                <option value="biomass">🌱 Biomass</option>
                <option value="other">⚡ Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="profile-capacity">Installation Capacity (kW):</label>
              <input type="number" id="profile-capacity" min="0" step="0.1" placeholder="100.5">
            </div>
            
            <div class="form-group">
              <label for="profile-install-date">Installation Date:</label>
              <input type="date" id="profile-install-date">
            </div>
            
            <div class="wallet-section">
              <h3>🔗 Wallet Connection</h3>
              <div id="wallet-status"></div>
              <button type="button" id="link-wallet-btn" class="btn btn-secondary">
                Link MetaMask Wallet
              </button>
            </div>
            
            <button type="submit" class="btn btn-primary">Update Profile</button>
          </form>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    
    // Wallet linking
    document.getElementById('link-wallet-btn')?.addEventListener('click', () => {
      this.handleWalletLinking()
    })
  }

  /**
   * Create user profile display
   */
  private createUserProfileDisplay() {
    const existingDisplay = document.getElementById('user-profile-display')
    if (existingDisplay) return

    const displayHTML = `
      <div id="user-profile-display" class="user-profile-display">
        <div class="user-profile-placeholder">
          <span>👤 Not signed in</span>
        </div>
      </div>
    `
    
    // Insert after the wallet connection section
    const walletSection = document.querySelector('.wallet-section')
    if (walletSection) {
      walletSection.insertAdjacentHTML('afterend', displayHTML)
    }
  }

  /**
   * Update authentication button
   */
  private updateAuthButton() {
    let authButton = document.getElementById('auth-button') as HTMLButtonElement
    
    if (!authButton) {
      // Create auth button if it doesn't exist
      const buttonHTML = `
        <button id="auth-button" class="btn btn-secondary">
          🔐 Sign In
        </button>
      `
      
      const walletConnectBtn = document.getElementById('connect-wallet')
      if (walletConnectBtn) {
        walletConnectBtn.insertAdjacentHTML('afterend', buttonHTML)
        authButton = document.getElementById('auth-button') as HTMLButtonElement
      }
    }

    if (authButton) {
      const { user } = userProfileManager.getCurrentUser()
      
      if (user) {
        authButton.textContent = '👤 Profile'
        authButton.id = 'profile-button'
      } else {
        authButton.textContent = '🔐 Sign In'
        authButton.id = 'auth-button'
      }
    }
  }

  /**
   * Update user profile display
   */
  private updateUserProfileDisplay() {
    const { user, profile } = userProfileManager.getCurrentUser()
    const displayElement = document.getElementById('user-profile-display')
    
    if (!displayElement) return

    if (user && profile) {
      const avatarUrl = profile.avatar_url || 'https://via.placeholder.com/40x40?text=👤'
      const displayName = profile.display_name || user.email?.split('@')[0] || 'User'
      const walletAddress = profile.wallet_address || 'No wallet linked'
      
      displayElement.innerHTML = `
        <div class="user-profile-card">
          <img src="${avatarUrl}" alt="Avatar" class="user-avatar" onerror="this.src='https://via.placeholder.com/40x40?text=👤'">
          <div class="user-info">
            <h3>${displayName}</h3>
            ${profile.wallet_address ? 
              `<p class="wallet-address">${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}</p>` :
              '<p class="no-wallet">No wallet linked</p>'
            }
            ${profile.verified ? '<span class="verified-badge">✅ Verified</span>' : ''}
            <p class="reputation">⭐ ${profile.reputation_score || 0} reputation</p>
          </div>
        </div>
      `
    } else if (user) {
      displayElement.innerHTML = `
        <div class="user-profile-placeholder">
          <span>👤 ${user.email}</span>
          <small>Complete your profile</small>
        </div>
      `
    } else {
      displayElement.innerHTML = `
        <div class="user-profile-placeholder">
          <span>👤 Not signed in</span>
        </div>
      `
    }
  }

  /**
   * Toggle authentication modal
   */
  private toggleAuthModal() {
    const modal = document.getElementById('auth-modal')
    if (!modal) return

    if (this.isAuthModalOpen) {
      this.closeAllModals()
    } else {
      modal.style.display = 'block'
      this.isAuthModalOpen = true
    }
  }

  /**
   * Toggle profile modal
   */
  private toggleProfileModal() {
    const modal = document.getElementById('profile-modal')
    if (!modal) return

    if (this.isProfileModalOpen) {
      this.closeAllModals()
    } else {
      this.loadProfileData()
      modal.style.display = 'block'
      this.isProfileModalOpen = true
    }
  }

  /**
   * Close all modals
   */
  private closeAllModals() {
    const modals = document.querySelectorAll('.modal')
    modals.forEach(modal => {
      (modal as HTMLElement).style.display = 'none'
    })
    
    this.isAuthModalOpen = false
    this.isProfileModalOpen = false
  }

  /**
   * Switch authentication tab
   */
  private switchAuthTab(tabName: string) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active')
    })
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active')
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active')
    })
    document.getElementById(`${tabName}-tab`)?.classList.add('active')
  }

  /**
   * Handle sign in form submission
   */
  private async handleSignIn(form: HTMLFormElement) {
    try {
      const formData = new FormData(form)
      const email = formData.get('signin-email') as string
      const password = formData.get('signin-password') as string

      // Validate required fields
      if (!email || !password) {
        this.showAuthStatus('❌ Email and password are required', 'error')
        return
      }

      this.showAuthStatus('🔄 Signing in...', 'info')

      const result = await userProfileManager.signIn(email, password)

      if (result.success) {
        this.closeAllModals()
        this.showAuthStatus('✅ Signed in successfully!', 'success')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      this.showAuthStatus(`❌ Sign in failed: ${error.message}`, 'error')
    }
  }

  /**
   * Handle sign up form submission
   */
  private async handleSignUp(form: HTMLFormElement) {
    try {
      const formData = new FormData(form)
      const email = formData.get('signup-email') as string
      const password = formData.get('signup-password') as string
      const displayName = formData.get('signup-name') as string

      // Validate required fields
      if (!email || !password) {
        this.showAuthStatus('❌ Email and password are required', 'error')
        return
      }

      if (password.length < 6) {
        this.showAuthStatus('❌ Password must be at least 6 characters', 'error')
        return
      }

      this.showAuthStatus('🔄 Creating account...', 'info')

      const result = await userProfileManager.signUp(email, password, displayName)

      if (result.success) {
        this.switchAuthTab('sign-in')
        this.showAuthStatus('✅ Account created! Check your email for verification.', 'success')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      this.showAuthStatus(`❌ Sign up failed: ${error.message}`, 'error')
    }
  }

  private showAuthStatus(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    const statusElement = document.getElementById('auth-status')
    if (!statusElement) return

    statusElement.textContent = message
    statusElement.className = `auth-status ${type}`
    statusElement.style.display = 'block'

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusElement.style.display = 'none'
      }, 5000)
    }
  }

  /**
   * Handle profile update form submission
   */
  private async handleProfileUpdate(form: HTMLFormElement) {
    const formData = new FormData(form)
    
    const profileData = {
      display_name: formData.get('profile-name') as string,
      bio: formData.get('profile-bio') as string,
      location: formData.get('profile-location') as string,
      phone: formData.get('profile-phone') as string,
      avatar_url: formData.get('profile-avatar') as string,
      energy_producer_type: formData.get('profile-producer-type') as string,
      installation_capacity: parseFloat(formData.get('profile-capacity') as string) || null,
      installation_date: formData.get('profile-install-date') as string || null
    }

    // Remove empty values
    Object.keys(profileData).forEach(key => {
      if (profileData[key] === '' || profileData[key] === null) {
        delete profileData[key]
      }
    })

    const result = await userProfileManager.updateProfile(profileData)
    
    if (result.success) {
      this.closeAllModals()
    }
  }

  /**
   * Load profile data into form
   */
  private loadProfileData() {
    const { profile } = userProfileManager.getCurrentUser()
    if (!profile) return

    const form = document.getElementById('profile-form') as HTMLFormElement
    if (!form) return

    // Populate form fields
    const fields = [
      'display_name', 'bio', 'location', 'phone', 'avatar_url',
      'energy_producer_type', 'installation_capacity', 'installation_date'
    ]

    fields.forEach(field => {
      const input = form.querySelector(`#profile-${field.replace('_', '-')}`) as HTMLInputElement
      if (input && profile[field]) {
        input.value = profile[field].toString()
      }
    })

    // Update wallet status
    this.updateWalletStatus()
  }

  /**
   * Update wallet status display
   */
  private updateWalletStatus() {
    const { profile } = userProfileManager.getCurrentUser()
    const statusElement = document.getElementById('wallet-status')
    const linkButton = document.getElementById('link-wallet-btn') as HTMLButtonElement
    
    if (!statusElement || !linkButton) return

    if (profile?.wallet_address) {
      statusElement.innerHTML = `
        <div class="wallet-connected">
          ✅ Wallet Connected: ${profile.wallet_address.slice(0, 10)}...${profile.wallet_address.slice(-8)}
        </div>
      `
      linkButton.textContent = 'Change Wallet'
    } else {
      statusElement.innerHTML = `
        <div class="wallet-not-connected">
          ⚠️ No wallet linked
        </div>
      `
      linkButton.textContent = 'Link MetaMask Wallet'
    }
  }

  /**
   * Handle wallet linking
   */
  private async handleWalletLinking() {
    // Check if MetaMask is available
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to link your wallet.')
      return
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const walletAddress = accounts[0]

      if (walletAddress) {
        const result = await userProfileManager.linkWallet(walletAddress)
        
        if (result.success) {
          this.updateWalletStatus()
        }
      }
    } catch (error) {
      console.error('Wallet linking error:', error)
      alert('Failed to link wallet. Please try again.')
    }
  }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new UserProfileUI()
})

export default UserProfileUI
