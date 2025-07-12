// REC-ONE Backend API Client
// Prefer environment variable (set via Vite) or fallback to default backend port
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002/api/v1'

class APIClient {
  constructor() {
    this.baseURL = API_BASE
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        // Handle rate limiting with retry
        if (response.status === 429 && retryCount < 2) {
          console.warn(`Rate limit exceeded for ${endpoint}. Retrying in ${(retryCount + 1) * 2} seconds... (attempt ${retryCount + 1}/3)`)
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000))
          return this.request(endpoint, options, retryCount + 1)
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait a moment and try again.`)
        }

        // Handle duplicate resource errors (409)
        if (response.status === 409) {
          throw new Error(`Resource already exists`)
        }

        throw new Error(data.message || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)

      // Handle network connection errors
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        // Show user-friendly error message
        if (retryCount === 0) {
          this.showConnectionError(error.message)
        }

        // Retry logic for network errors
        if (retryCount < 3) {
          console.log(`Retrying request (${retryCount + 1}/4)...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return this.request(endpoint, options, retryCount + 1)
        }

        // Final retry failed - show offline mode message
        this.showOfflineMode()
      }

      throw error
    }
  }

  showConnectionError(errorMessage) {
    const statusElement = document.getElementById('status')
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="status-message warning">
          ⚠️ Connection issue: Retrying...
        </div>
      `
      statusElement.style.display = 'block'
    }
  }

  showOfflineMode() {
    const statusElement = document.getElementById('status')
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="status-message error">
          ❌ Backend connection failed. Please check if the server is running on port 3002.
          <br>
          <small>Run: <code>cd backend && npm start</code></small>
        </div>
      `
      statusElement.style.display = 'block'
    }

    // Also show in console for developers
    console.error('🚨 Backend connection failed. Please start the backend server:')
    console.error('   cd backend && npm start')
  }

  // Energy API
  async recordEnergyGeneration(data) {
    return this.request('/energy/generation', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async recordEnergyOffer(data) {
    return this.request('/energy/offers', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async recordEnergyPurchase(data) {
    return this.request('/energy/purchase', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async cancelEnergyOffer(data) {
    return this.request('/energy/cancel', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getActiveOffers(limit = 50, offset = 0) {
    return this.request(`/energy/offers?limit=${limit}&offset=${offset}`)
  }

  async searchOffers(filters = {}) {
    const params = new URLSearchParams(filters).toString()
    return this.request(`/energy/offers/search?${params}`)
  }

  async getUserEnergyHistory(walletAddress, limit = 50) {
    return this.request(`/energy/history/${walletAddress}?limit=${limit}`)
  }

  async getMarketplaceStats() {
    return this.request('/energy/marketplace/stats')
  }

  async getUserEnergyBalance(walletAddress) {
    return this.request(`/energy/balance/${walletAddress}`)
  }

  async validateEnergyOffer(walletAddress, quantity) {
    return this.request('/energy/validate-offer', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, quantity })
    })
  }

  // User API
  async createOrGetUser(walletAddress) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    })
  }

  async getUserProfile(walletAddress) {
    return this.request(`/users/${walletAddress}`)
  }

  async getUserStats(walletAddress) {
    return this.request(`/users/${walletAddress}/stats`)
  }

  async updateUserProfile(walletAddress, updates) {
    return this.request(`/users/${walletAddress}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async getLeaderboard(limit = 10, type = 'earnings') {
    return this.request(`/users/leaderboard?limit=${limit}&type=${type}`)
  }

  async searchUsers(query, limit = 20) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  }

  // Transaction API
  async recordTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getTransaction(txHash) {
    return this.request(`/transactions/${txHash}`)
  }

  async getUserTransactions(walletAddress, limit = 50) {
    return this.request(`/transactions/user/${walletAddress}?limit=${limit}`)
  }

  async getRecentTransactions(limit = 20) {
    return this.request(`/transactions/recent?limit=${limit}`)
  }

  // Stats API
  async getPlatformOverview() {
    return this.request('/stats/overview')
  }

  async getDailyStats(date = null) {
    const params = date ? `?date=${date}` : ''
    return this.request(`/stats/daily${params}`)
  }

  async getPriceHistory(days = 7) {
    return this.request(`/stats/prices?days=${days}`)
  }

  // Health check
  async healthCheck() {
    return this.request('/health', { baseURL: 'http://localhost:3002' })
  }
}

// Create singleton instance
export const apiClient = new APIClient()

// Export individual methods for convenience
export const {
  recordEnergyGeneration,
  recordEnergyOffer,
  recordEnergyPurchase,
  cancelEnergyOffer,
  getActiveOffers,
  searchOffers,
  getUserEnergyHistory,
  getMarketplaceStats,
  getUserEnergyBalance,
  validateEnergyOffer,
  createOrGetUser,
  getUserProfile,
  getUserStats,
  updateUserProfile,
  getLeaderboard,
  searchUsers,
  recordTransaction,
  getTransaction,
  getUserTransactions,
  getRecentTransactions,
  getPlatformOverview,
  getDailyStats,
  getPriceHistory,
  healthCheck
} = apiClient

export default apiClient
