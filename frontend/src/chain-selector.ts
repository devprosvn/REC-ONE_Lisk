// Chain Selector Module for Multi-Chain Support
import { SUPPORTED_CHAINS, switchToChain, getChainByChainId, type ChainConfig } from './config/chains.js'

class ChainSelector {
  private selectedChain: ChainConfig | null = null
  private onChainChanged: ((chain: ChainConfig) => void) | null = null

  constructor() {
    this.initializeChainSelector()
    this.setupEventListeners()
  }

  private initializeChainSelector() {
    // Create chain selection modal
    this.createChainSelectionModal()
    
    // Check if user has already selected a chain
    const savedChain = localStorage.getItem('selectedChain')
    if (savedChain && SUPPORTED_CHAINS[savedChain]) {
      this.selectedChain = SUPPORTED_CHAINS[savedChain]
    }
  }

  private createChainSelectionModal() {
    const modal = document.createElement('div')
    modal.id = 'chain-selection-modal'
    modal.className = 'chain-modal-overlay'
    modal.innerHTML = `
      <div class="chain-modal">
        <div class="chain-modal-header">
          <h2>🌐 Chọn Blockchain</h2>
          <p>Chọn blockchain bạn muốn sử dụng để giao dịch năng lượng</p>
        </div>
        <div class="chain-modal-body">
          <div class="chain-grid">
            ${Object.values(SUPPORTED_CHAINS).map(chain => this.createChainCard(chain)).join('')}
          </div>
        </div>
        <div class="chain-modal-footer">
          <p class="chain-note">💡 Bạn có thể thay đổi blockchain bất kỳ lúc nào trong cài đặt</p>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Add event listeners for chain cards
    this.attachChainCardListeners()
  }

  private createChainCard(chain: ChainConfig): string {
    const features = chain.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')
    
    return `
      <div class="chain-card" data-chain-id="${chain.id}">
        <div class="chain-icon">${chain.icon}</div>
        <div class="chain-info">
          <h3>${chain.displayName}</h3>
          <p class="chain-description">${chain.description}</p>
          <div class="chain-currency">
            <strong>Tiền tệ:</strong> ${chain.nativeCurrency.symbol}
            ${chain.tokenAddress ? `<br><strong>Token:</strong> VNST` : ''}
          </div>
          <div class="chain-features">
            ${features}
          </div>
        </div>
        <div class="chain-select-btn">
          <button class="btn btn-primary">Chọn ${chain.nativeCurrency.symbol}</button>
        </div>
      </div>
    `
  }

  private attachChainCardListeners() {
    const chainCards = document.querySelectorAll('.chain-card')
    chainCards.forEach(card => {
      card.addEventListener('click', async (e) => {
        const chainId = (e.currentTarget as HTMLElement).dataset.chainId
        if (chainId) {
          await this.selectChain(chainId)
        }
      })
    })
  }

  private setupEventListeners() {
    // Listen for MetaMask chain changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId: string) => {
        const numericChainId = parseInt(chainId, 16)
        const chain = getChainByChainId(numericChainId)
        
        if (chain) {
          this.selectedChain = chain
          localStorage.setItem('selectedChain', chain.id)
          this.updateUI()
          
          if (this.onChainChanged) {
            this.onChainChanged(chain)
          }
        } else {
          this.showUnsupportedChainWarning(numericChainId)
        }
      })
    }
  }

  async selectChain(chainId: string): Promise<boolean> {
    const chain = SUPPORTED_CHAINS[chainId]
    if (!chain) {
      console.error('Unsupported chain:', chainId)
      return false
    }

    try {
      this.showStatus('🔄 Đang kết nối với ' + chain.displayName + '...', 'info')
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        this.showStatus('❌ Vui lòng cài đặt MetaMask để tiếp tục', 'error')
        return false
      }

      // Switch to the selected chain
      const success = await switchToChain(chain)
      
      if (success) {
        this.selectedChain = chain
        localStorage.setItem('selectedChain', chainId)
        this.hideChainSelectionModal()
        this.updateUI()
        
        this.showStatus(`✅ Đã kết nối với ${chain.displayName}`, 'success')
        
        if (this.onChainChanged) {
          this.onChainChanged(chain)
        }
        
        return true
      } else {
        this.showStatus(`❌ Không thể kết nối với ${chain.displayName}`, 'error')
        return false
      }
    } catch (error) {
      console.error('Chain selection error:', error)
      this.showStatus(`❌ Lỗi khi kết nối: ${error.message}`, 'error')
      return false
    }
  }

  showChainSelectionModal() {
    const modal = document.getElementById('chain-selection-modal')
    if (modal) {
      modal.style.display = 'flex'
    }
  }

  hideChainSelectionModal() {
    const modal = document.getElementById('chain-selection-modal')
    if (modal) {
      modal.style.display = 'none'
    }
  }

  private updateUI() {
    // Update chain indicator in header
    this.updateChainIndicator()
    
    // Update any chain-specific UI elements
    this.updateChainSpecificElements()
  }

  private updateChainIndicator() {
    let indicator = document.getElementById('chain-indicator')
    if (!indicator) {
      indicator = document.createElement('div')
      indicator.id = 'chain-indicator'
      indicator.className = 'chain-indicator'
      
      // Insert after wallet info
      const walletInfo = document.getElementById('wallet-info')
      if (walletInfo && walletInfo.parentNode) {
        walletInfo.parentNode.insertBefore(indicator, walletInfo.nextSibling)
      }
    }

    if (this.selectedChain) {
      indicator.innerHTML = `
        <div class="current-chain">
          <span class="chain-icon">${this.selectedChain.icon}</span>
          <span class="chain-name">${this.selectedChain.displayName}</span>
          <button class="chain-switch-btn" onclick="chainSelector.showChainSelectionModal()">
            🔄 Đổi
          </button>
        </div>
      `
      indicator.style.display = 'block'
    } else {
      indicator.style.display = 'none'
    }
  }

  private updateChainSpecificElements() {
    if (!this.selectedChain) return

    // Update currency symbols in UI
    const currencyElements = document.querySelectorAll('.currency-symbol')
    currencyElements.forEach(element => {
      if (this.selectedChain.tokenAddress) {
        element.textContent = 'VNST'
      } else {
        element.textContent = this.selectedChain.nativeCurrency.symbol
      }
    })

    // Update price labels
    const priceLabels = document.querySelectorAll('.price-label')
    priceLabels.forEach(element => {
      const currency = this.selectedChain.tokenAddress ? 'VNST' : this.selectedChain.nativeCurrency.symbol
      element.textContent = element.textContent.replace(/ETH|VNST|DPSV|tBNB/g, currency)
    })
  }

  private showUnsupportedChainWarning(chainId: number) {
    this.showStatus(`⚠️ Blockchain không được hỗ trợ (Chain ID: ${chainId}). Vui lòng chọn một blockchain được hỗ trợ.`, 'warning')
    this.showChainSelectionModal()
  }

  private showStatus(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    // Use existing showStatus function from main app
    if (typeof (window as any).showStatus === 'function') {
      (window as any).showStatus(message, type)
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`)
    }
  }

  // Public methods
  getSelectedChain(): ChainConfig | null {
    return this.selectedChain
  }

  onChainChange(callback: (chain: ChainConfig) => void) {
    this.onChainChanged = callback
  }

  isChainSelected(): boolean {
    return this.selectedChain !== null
  }

  requireChainSelection(): Promise<ChainConfig> {
    return new Promise((resolve, reject) => {
      if (this.selectedChain) {
        resolve(this.selectedChain)
        return
      }

      this.showChainSelectionModal()
      
      const originalCallback = this.onChainChanged
      this.onChainChanged = (chain) => {
        this.onChainChanged = originalCallback
        resolve(chain)
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Chain selection timeout'))
      }, 30000)
    })
  }
}

// Create global instance
const chainSelector = new ChainSelector()

// Export for use in other modules
export { chainSelector, ChainSelector }

// Make available globally
;(window as any).chainSelector = chainSelector
