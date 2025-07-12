/**
 * Offline Demo for User Profiles
 * Demonstrates user profile functionality without backend dependency
 */

interface MockUserProfile {
  id: string
  wallet_address: string
  display_name: string
  email: string
  avatar_url: string
  bio: string
  location: string
  energy_producer_type: string
  installation_capacity: number
  verified: boolean
  reputation_score: number
  total_energy_sold: number
  created_at: string
}

class OfflineDemo {
  private mockProfiles: MockUserProfile[] = [
    {
      id: '1',
      wallet_address: '0x742d35cc6634c0532925a3b8d4c9db96590c6c87',
      display_name: '🌞 Solar Farm Owner',
      email: 'solar@example.com',
      avatar_url: 'https://via.placeholder.com/40x40/4CAF50/white?text=☀️',
      bio: 'Renewable energy producer specializing in solar power generation',
      location: 'Ho Chi Minh City, Vietnam',
      energy_producer_type: 'solar',
      installation_capacity: 100.5,
      verified: true,
      reputation_score: 95,
      total_energy_sold: 2450.5,
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      wallet_address: '0xcca6f2c8b3f8c8f8c8f8c8f8c8f8c8f8c8f8c1CD2',
      display_name: '💨 Wind Energy Co',
      email: 'wind@example.com',
      avatar_url: 'https://via.placeholder.com/40x40/2196F3/white?text=💨',
      bio: 'Large-scale wind energy production facility',
      location: 'Da Nang, Vietnam',
      energy_producer_type: 'wind',
      installation_capacity: 250.0,
      verified: true,
      reputation_score: 88,
      total_energy_sold: 5200.0,
      created_at: '2024-02-01T14:20:00Z'
    },
    {
      id: '3',
      wallet_address: '0x123456789abcdef123456789abcdef123456789a',
      display_name: '💧 Hydro Power Station',
      email: 'hydro@example.com',
      avatar_url: 'https://via.placeholder.com/40x40/00BCD4/white?text=💧',
      bio: 'Clean hydroelectric power generation',
      location: 'Hanoi, Vietnam',
      energy_producer_type: 'hydro',
      installation_capacity: 500.0,
      verified: false,
      reputation_score: 72,
      total_energy_sold: 1800.0,
      created_at: '2024-03-10T09:15:00Z'
    }
  ]

  private currentUser: MockUserProfile | null = null

  constructor() {
    this.initializeDemo()
  }

  /**
   * Initialize offline demo
   */
  private initializeDemo() {
    console.log('🎭 Initializing Offline Demo Mode')
    
    // Show demo banner
    this.showDemoBanner()
    
    // Setup demo controls
    this.setupDemoControls()
    
    // Load demo data
    this.loadDemoData()
  }

  /**
   * Show demo banner
   */
  private showDemoBanner() {
    const banner = document.createElement('div')
    banner.id = 'demo-banner'
    banner.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
        color: white;
        padding: 10px 20px;
        text-align: center;
        font-weight: bold;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      ">
        🎭 OFFLINE DEMO MODE - User Profiles & Enhanced UX Preview
        <button onclick="this.parentElement.parentElement.style.display='none'" 
                style="float: right; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
      </div>
    `
    
    document.body.insertBefore(banner, document.body.firstChild)
    
    // Adjust body padding to account for banner
    document.body.style.paddingTop = '50px'
  }

  /**
   * Setup demo controls
   */
  private setupDemoControls() {
    // Create demo control panel
    const controlPanel = document.createElement('div')
    controlPanel.id = 'demo-controls'
    controlPanel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 10px;
        padding: 15px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 999;
        min-width: 250px;
      ">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">🎮 Demo Controls</h4>
        
        <div style="margin-bottom: 10px;">
          <label style="display: block; font-size: 12px; color: #666; margin-bottom: 5px;">Switch User Profile:</label>
          <select id="demo-user-select" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">Select a user...</option>
            ${this.mockProfiles.map(profile => 
              `<option value="${profile.id}">${profile.display_name}</option>`
            ).join('')}
          </select>
        </div>
        
        <button id="demo-show-marketplace" style="
          width: 100%;
          padding: 8px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 5px;
        ">👥 Show Enhanced Marketplace</button>
        
        <button id="demo-show-trades" style="
          width: 100%;
          padding: 8px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">📊 Show Trade History</button>
        
        <div style="margin-top: 10px; font-size: 11px; color: #999;">
          💡 This demo shows user profiles without backend
        </div>
      </div>
    `
    
    document.body.appendChild(controlPanel)
    
    // Setup event listeners
    this.setupDemoEventListeners()
  }

  /**
   * Setup demo event listeners
   */
  private setupDemoEventListeners() {
    const userSelect = document.getElementById('demo-user-select') as HTMLSelectElement
    const showMarketplaceBtn = document.getElementById('demo-show-marketplace')
    const showTradesBtn = document.getElementById('demo-show-trades')

    userSelect?.addEventListener('change', (e) => {
      const userId = (e.target as HTMLSelectElement).value
      if (userId) {
        this.switchUser(userId)
      }
    })

    showMarketplaceBtn?.addEventListener('click', () => {
      this.showEnhancedMarketplace()
    })

    showTradesBtn?.addEventListener('click', () => {
      this.showTradeHistory()
    })
  }

  /**
   * Switch to different user profile
   */
  private switchUser(userId: string) {
    const profile = this.mockProfiles.find(p => p.id === userId)
    if (!profile) return

    this.currentUser = profile
    this.updateUserProfileDisplay()
    
    console.log('👤 Switched to user:', profile.display_name)
  }

  /**
   * Update user profile display
   */
  private updateUserProfileDisplay() {
    if (!this.currentUser) return

    // Update or create user profile display
    let profileDisplay = document.getElementById('user-profile-display')
    
    if (!profileDisplay) {
      profileDisplay = document.createElement('div')
      profileDisplay.id = 'user-profile-display'
      
      // Insert after wallet section
      const walletSection = document.querySelector('.wallet-section')
      if (walletSection) {
        walletSection.insertAdjacentElement('afterend', profileDisplay)
      } else {
        document.querySelector('.container')?.appendChild(profileDisplay)
      }
    }

    profileDisplay.innerHTML = `
      <div class="user-profile-card" style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 15px;
        background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%);
        border-radius: 8px;
        border: 1px solid #e0e7ff;
        margin: 10px 0;
      ">
        <img src="${this.currentUser.avatar_url}" alt="Avatar" style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #3b82f6;
        ">
        <div class="user-info">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #1e40af; font-weight: 600;">
            ${this.currentUser.display_name}
          </h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; font-family: 'Courier New', monospace;">
            ${this.currentUser.wallet_address.slice(0, 10)}...${this.currentUser.wallet_address.slice(-8)}
          </p>
          ${this.currentUser.verified ? 
            '<span style="display: inline-block; font-size: 10px; background: #10b981; color: white; padding: 2px 6px; border-radius: 10px; margin-right: 8px;">✅ Verified</span>' : 
            ''
          }
          <span style="font-size: 12px; color: #f59e0b;">⭐ ${this.currentUser.reputation_score} reputation</span>
          <div style="margin-top: 4px; font-size: 11px; color: #6b7280;">
            📍 ${this.currentUser.location} • ${this.currentUser.energy_producer_type} (${this.currentUser.installation_capacity} kW)
          </div>
        </div>
      </div>
    `
  }

  /**
   * Show enhanced marketplace with user profiles
   */
  private showEnhancedMarketplace() {
    // Create marketplace modal
    const modal = document.createElement('div')
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        ">
          <button onclick="this.closest('div').remove()" style="
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
          ">×</button>
          
          <h2 style="margin: 0 0 20px 0; color: #1976d2;">👥 Enhanced Marketplace</h2>
          
          <div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 6px; font-size: 14px;">
            💡 <strong>Before:</strong> Only wallet addresses<br>
            ✨ <strong>After:</strong> Rich user profiles with names, avatars, and reputation
          </div>
          
          ${this.mockProfiles.map(profile => `
            <div style="
              display: flex;
              align-items: center;
              gap: 15px;
              padding: 15px;
              border: 1px solid #e0e7ff;
              border-radius: 8px;
              margin-bottom: 10px;
              background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
            ">
              <img src="${profile.avatar_url}" alt="Avatar" style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 2px solid #3b82f6;
              ">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px;">
                  ${profile.display_name}
                  ${profile.verified ? '<span style="color: #10b981;">✅</span>' : ''}
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">
                  📍 ${profile.location} • ⭐ ${profile.reputation_score} reputation
                </div>
                <div style="font-size: 11px; color: #9ca3af;">
                  ${profile.energy_producer_type} producer • ${profile.installation_capacity} kW capacity
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: bold; color: #1976d2;">50 kWh</div>
                <div style="font-size: 12px; color: #666;">0.002 ETH</div>
                <button style="
                  margin-top: 5px;
                  padding: 4px 8px;
                  background: #4CAF50;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 11px;
                  cursor: pointer;
                ">🛒 Buy</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
  }

  /**
   * Show trade history with user names
   */
  private showTradeHistory() {
    const modal = document.createElement('div')
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        ">
          <button onclick="this.closest('div').remove()" style="
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
          ">×</button>
          
          <h2 style="margin: 0 0 20px 0; color: #1976d2;">📊 Friendly Trade History</h2>
          
          <div style="margin-bottom: 15px; padding: 10px; background: #e8f5e8; border-radius: 6px; font-size: 14px;">
            💡 <strong>Before:</strong> "Transaction 0xabc123... - 50 kWh - 0.002 ETH"<br>
            ✨ <strong>After:</strong> "You bought 50 kWh from Solar Farm Owner at 10:30 AM"
          </div>
          
          <div style="space-y: 10px;">
            <div style="
              padding: 15px;
              border: 1px solid #e0e7ff;
              border-radius: 8px;
              margin-bottom: 10px;
              background: #f8f9ff;
            ">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #1976d2;">🛒 Purchase</span>
                <span style="font-size: 12px; color: #666;">2 hours ago</span>
              </div>
              <div style="margin-bottom: 4px;">
                You bought <strong>50 kWh</strong> from <strong>🌞 Solar Farm Owner</strong>
              </div>
              <div style="font-size: 12px; color: #666;">
                Price: 0.002 ETH • Transaction: 0xabc123...def456
              </div>
            </div>
            
            <div style="
              padding: 15px;
              border: 1px solid #e0e7ff;
              border-radius: 8px;
              margin-bottom: 10px;
              background: #f0f9ff;
            ">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #10b981;">💰 Sale</span>
                <span style="font-size: 12px; color: #666;">1 day ago</span>
              </div>
              <div style="margin-bottom: 4px;">
                You sold <strong>75 kWh</strong> to <strong>💨 Wind Energy Co</strong>
              </div>
              <div style="font-size: 12px; color: #666;">
                Price: 0.003 ETH • Transaction: 0xdef456...ghi789
              </div>
            </div>
            
            <div style="
              padding: 15px;
              border: 1px solid #e0e7ff;
              border-radius: 8px;
              margin-bottom: 10px;
              background: #f8f9ff;
            ">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #1976d2;">🛒 Purchase</span>
                <span style="font-size: 12px; color: #666;">3 days ago</span>
              </div>
              <div style="margin-bottom: 4px;">
                You bought <strong>25 kWh</strong> from <strong>💧 Hydro Power Station</strong>
              </div>
              <div style="font-size: 12px; color: #666;">
                Price: 0.0015 ETH • Transaction: 0xghi789...jkl012
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
  }

  /**
   * Load demo data
   */
  private loadDemoData() {
    // Auto-select first user for demo
    setTimeout(() => {
      this.switchUser('1')
    }, 1000)
  }
}

// Initialize offline demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if backend is not available
  setTimeout(() => {
    const statusElement = document.getElementById('status')
    if (statusElement && statusElement.textContent?.includes('Backend connection failed')) {
      console.log('🎭 Backend unavailable, starting offline demo')
      new OfflineDemo()
    }
  }, 3000) // Wait 3 seconds for backend connection attempts
})

export default OfflineDemo
