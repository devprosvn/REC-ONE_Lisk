// Authentication Modals for User Management
import { userProfileManager } from './user-profile.js'

class AuthModals {
  constructor() {
    this.createAuthModals()
    this.setupEventListeners()
  }

  private createAuthModals() {
    // Create login modal
    this.createLoginModal()
    
    // Create register modal
    this.createRegisterModal()
    
    // Create profile modal
    this.createProfileModal()
  }

  private createLoginModal() {
    const modal = document.createElement('div')
    modal.id = 'login-modal'
    modal.className = 'auth-modal-overlay'
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h2>🔐 Đăng Nhập</h2>
          <button class="modal-close" onclick="authModals.hideLoginModal()">&times;</button>
        </div>
        <div class="auth-modal-body">
          <form id="login-form">
            <div class="form-group">
              <label for="login-email">Email:</label>
              <input type="email" id="login-email" required placeholder="your@email.com">
            </div>
            <div class="form-group">
              <label for="login-password">Mật khẩu:</label>
              <input type="password" id="login-password" required placeholder="••••••••">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Đăng nhập</button>
              <button type="button" class="btn btn-secondary" onclick="authModals.showRegisterModal()">
                Chưa có tài khoản?
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  private createRegisterModal() {
    const modal = document.createElement('div')
    modal.id = 'register-modal'
    modal.className = 'auth-modal-overlay'
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h2>📝 Đăng Ký</h2>
          <button class="modal-close" onclick="authModals.hideRegisterModal()">&times;</button>
        </div>
        <div class="auth-modal-body">
          <form id="register-form">
            <div class="form-group">
              <label for="register-name">Tên hiển thị:</label>
              <input type="text" id="register-name" required placeholder="Nguyễn Văn A">
            </div>
            <div class="form-group">
              <label for="register-email">Email:</label>
              <input type="email" id="register-email" required placeholder="your@email.com">
            </div>
            <div class="form-group">
              <label for="register-password">Mật khẩu:</label>
              <input type="password" id="register-password" required placeholder="••••••••" minlength="6">
            </div>
            <div class="form-group">
              <label for="register-confirm">Xác nhận mật khẩu:</label>
              <input type="password" id="register-confirm" required placeholder="••••••••">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Đăng ký</button>
              <button type="button" class="btn btn-secondary" onclick="authModals.showLoginModal()">
                Đã có tài khoản?
              </button>
            </div>
          </form>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  private createProfileModal() {
    const modal = document.createElement('div')
    modal.id = 'profile-modal'
    modal.className = 'auth-modal-overlay'
    modal.innerHTML = `
      <div class="auth-modal profile-modal">
        <div class="auth-modal-header">
          <h2>👤 Hồ Sơ Người Dùng</h2>
          <button class="modal-close" onclick="authModals.hideProfileModal()">&times;</button>
        </div>
        <div class="auth-modal-body">
          <div id="profile-content">
            <!-- Profile content will be loaded here -->
          </div>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  private setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form') as HTMLFormElement
    loginForm?.addEventListener('submit', (e) => this.handleLogin(e))

    // Register form
    const registerForm = document.getElementById('register-form') as HTMLFormElement
    registerForm?.addEventListener('submit', (e) => this.handleRegister(e))

    // Close modals on overlay click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('auth-modal-overlay')) {
        this.hideAllModals()
      }
    })

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals()
      }
    })
  }

  private async handleLogin(e: Event) {
    e.preventDefault()
    
    const email = (document.getElementById('login-email') as HTMLInputElement).value
    const password = (document.getElementById('login-password') as HTMLInputElement).value

    if (!email || !password) {
      this.showStatus('Vui lòng điền đầy đủ thông tin', 'error')
      return
    }

    try {
      this.showStatus('Đang đăng nhập...', 'info')
      
      const result = await userProfileManager.signIn(email, password)
      
      if (result.success) {
        this.showStatus(result.message, 'success')
        this.hideLoginModal()
        
        // Check if user needs to link wallet
        setTimeout(() => this.checkWalletLinking(), 1000)
      } else {
        this.showStatus(result.message, 'error')
      }
    } catch (error) {
      this.showStatus('Lỗi đăng nhập: ' + error.message, 'error')
    }
  }

  private async handleRegister(e: Event) {
    e.preventDefault()
    
    const name = (document.getElementById('register-name') as HTMLInputElement).value
    const email = (document.getElementById('register-email') as HTMLInputElement).value
    const password = (document.getElementById('register-password') as HTMLInputElement).value
    const confirm = (document.getElementById('register-confirm') as HTMLInputElement).value

    if (!name || !email || !password || !confirm) {
      this.showStatus('Vui lòng điền đầy đủ thông tin', 'error')
      return
    }

    if (password !== confirm) {
      this.showStatus('Mật khẩu xác nhận không khớp', 'error')
      return
    }

    if (password.length < 6) {
      this.showStatus('Mật khẩu phải có ít nhất 6 ký tự', 'error')
      return
    }

    try {
      this.showStatus('Đang đăng ký...', 'info')
      
      const result = await userProfileManager.signUp(email, password, name)
      
      if (result.success) {
        this.showStatus(result.message, 'success')
        this.hideRegisterModal()
      } else {
        this.showStatus(result.message, 'error')
      }
    } catch (error) {
      this.showStatus('Lỗi đăng ký: ' + error.message, 'error')
    }
  }

  private async checkWalletLinking() {
    const currentUser = userProfileManager.getCurrentUser()
    const connectedWallet = (window as any).userAddress // From main app
    
    if (currentUser && connectedWallet && !currentUser.wallet_address) {
      const shouldLink = confirm(
        `Bạn có muốn liên kết ví ${this.formatAddress(connectedWallet)} với tài khoản của mình không?`
      )
      
      if (shouldLink) {
        const result = await userProfileManager.linkWalletAddress(connectedWallet)
        this.showStatus(result.message, result.success ? 'success' : 'error')
      }
    }
  }

  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Profile modal methods
  async showProfileModal() {
    const currentUser = userProfileManager.getCurrentUser()
    if (!currentUser) {
      this.showLoginModal()
      return
    }

    const profileContent = document.getElementById('profile-content')
    if (profileContent) {
      profileContent.innerHTML = this.createProfileContent(currentUser)
      this.setupProfileEventListeners()
    }

    const modal = document.getElementById('profile-modal')
    if (modal) {
      modal.style.display = 'flex'
    }
  }

  private createProfileContent(user: any): string {
    return `
      <div class="profile-section">
        <div class="profile-avatar-section">
          <div class="profile-avatar">
            ${user.avatar_url ? 
              `<img src="${user.avatar_url}" alt="Avatar">` :
              `<div class="avatar-placeholder">${user.display_name?.charAt(0) || '?'}</div>`
            }
          </div>
          <button class="btn btn-secondary btn-sm" onclick="authModals.changeAvatar()">
            Đổi ảnh
          </button>
        </div>
        
        <div class="profile-info-section">
          <form id="profile-form">
            <div class="form-group">
              <label for="profile-name">Tên hiển thị:</label>
              <input type="text" id="profile-name" value="${user.display_name || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="profile-email">Email:</label>
              <input type="email" id="profile-email" value="${user.email || ''}" readonly>
            </div>
            
            <div class="form-group">
              <label for="profile-wallet">Ví liên kết:</label>
              <input type="text" id="profile-wallet" value="${user.wallet_address || 'Chưa liên kết'}" readonly>
              ${!user.wallet_address ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="authModals.linkCurrentWallet()">
                  Liên kết ví hiện tại
                </button>
              ` : ''}
            </div>
            
            <div class="form-group">
              <label for="profile-bio">Giới thiệu:</label>
              <textarea id="profile-bio" rows="3" placeholder="Giới thiệu về bản thân...">${user.bio || ''}</textarea>
            </div>
            
            <div class="form-group">
              <label for="profile-location">Địa điểm:</label>
              <input type="text" id="profile-location" value="${user.location || ''}" placeholder="Thành phố, Quốc gia">
            </div>
            
            <div class="profile-stats">
              <div class="stat-item">
                <div class="stat-value">${user.reputation_score || 0}</div>
                <div class="stat-label">Điểm uy tín</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${user.total_transactions || 0}</div>
                <div class="stat-label">Giao dịch</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${user.total_energy_sold || 0} kWh</div>
                <div class="stat-label">Năng lượng đã bán</div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Cập nhật hồ sơ</button>
              <button type="button" class="btn btn-secondary" onclick="authModals.showTradeHistory()">
                Lịch sử giao dịch
              </button>
              <button type="button" class="btn btn-outline" onclick="userProfileManager.signOut()">
                Đăng xuất
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  private setupProfileEventListeners() {
    const profileForm = document.getElementById('profile-form') as HTMLFormElement
    profileForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const name = (document.getElementById('profile-name') as HTMLInputElement).value
      const bio = (document.getElementById('profile-bio') as HTMLTextAreaElement).value
      const location = (document.getElementById('profile-location') as HTMLInputElement).value

      try {
        this.showStatus('Đang cập nhật hồ sơ...', 'info')
        
        const result = await userProfileManager.updateProfile({
          display_name: name,
          bio: bio,
          location: location
        })
        
        this.showStatus(result.message, result.success ? 'success' : 'error')
        
        if (result.success) {
          // Refresh profile content
          setTimeout(() => this.showProfileModal(), 1000)
        }
      } catch (error) {
        this.showStatus('Lỗi cập nhật hồ sơ: ' + error.message, 'error')
      }
    })
  }

  // Public methods for modal management
  showLoginModal() {
    this.hideAllModals()
    const modal = document.getElementById('login-modal')
    if (modal) {
      modal.style.display = 'flex'
      // Focus on email input
      setTimeout(() => {
        const emailInput = document.getElementById('login-email') as HTMLInputElement
        emailInput?.focus()
      }, 100)
    }
  }

  hideLoginModal() {
    const modal = document.getElementById('login-modal')
    if (modal) {
      modal.style.display = 'none'
    }
  }

  showRegisterModal() {
    this.hideAllModals()
    const modal = document.getElementById('register-modal')
    if (modal) {
      modal.style.display = 'flex'
      // Focus on name input
      setTimeout(() => {
        const nameInput = document.getElementById('register-name') as HTMLInputElement
        nameInput?.focus()
      }, 100)
    }
  }

  hideRegisterModal() {
    const modal = document.getElementById('register-modal')
    if (modal) {
      modal.style.display = 'none'
    }
  }

  hideProfileModal() {
    const modal = document.getElementById('profile-modal')
    if (modal) {
      modal.style.display = 'none'
    }
  }

  hideAllModals() {
    this.hideLoginModal()
    this.hideRegisterModal()
    this.hideProfileModal()
  }

  // Utility methods
  async linkCurrentWallet() {
    const connectedWallet = (window as any).userAddress
    if (!connectedWallet) {
      this.showStatus('Vui lòng kết nối ví trước', 'error')
      return
    }

    const result = await userProfileManager.linkWalletAddress(connectedWallet)
    this.showStatus(result.message, result.success ? 'success' : 'error')
    
    if (result.success) {
      setTimeout(() => this.showProfileModal(), 1000)
    }
  }

  changeAvatar() {
    // TODO: Implement avatar upload
    this.showStatus('Tính năng đổi ảnh đại diện sẽ được cập nhật sớm', 'info')
  }

  showTradeHistory() {
    // TODO: Implement trade history modal
    this.showStatus('Tính năng lịch sử giao dịch sẽ được cập nhật sớm', 'info')
  }

  private showStatus(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    // Use existing showStatus function from main app
    if (typeof (window as any).showStatus === 'function') {
      (window as any).showStatus(message, type)
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`)
    }
  }
}

// Create global instance
const authModals = new AuthModals()

// Export for use in other modules
export { authModals, AuthModals }

// Make available globally
;(window as any).authModals = authModals
