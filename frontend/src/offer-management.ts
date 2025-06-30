// REC-ONE Offer Management Module
// Handles offer lifecycle: edit, cancel, restore, expiration

import { apiClient } from './api/client.js'

interface OfferWithStatus {
  offer_id: number
  quantity: number
  price_per_kwh_eth: number
  price_per_kwh_vnd: number
  total_price_eth: number
  total_price_vnd: number
  status: string
  status_vietnamese: string
  created_at: string
  expires_at: string
  days_until_expiry: number
  days_until_deletion: number
  can_restore: boolean
  can_edit: boolean
  can_cancel: boolean
  is_expired: boolean
  is_restored: boolean
  restore_count: number
  edit_count: number
}

class OfferManagement {
  private userWallet: string | null = null

  constructor() {
    this.initializeEventListeners()
  }

  setUserWallet(wallet: string) {
    this.userWallet = wallet
  }

  private initializeEventListeners() {
    // My Offers button
    const myOffersBtn = document.getElementById('my-offers-btn')
    if (myOffersBtn) {
      myOffersBtn.addEventListener('click', () => this.showMyOffers())
    }

    // Modal close buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('modal-close') || target.classList.contains('modal-overlay')) {
        this.closeModals()
      }
    })

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModals()
      }
    })
  }

  async showMyOffers() {
    if (!this.userWallet) {
      this.showStatus('⚠️ Please connect your wallet first', 'warning')
      return
    }

    try {
      this.showStatus('📊 Loading your offers...', 'info')
      
      const response = await apiClient.request(`/offers/lifecycle/user/${this.userWallet}`)
      
      if (response.success) {
        this.displayMyOffersModal(response.data)
      } else {
        this.showStatus('❌ Failed to load your offers', 'error')
      }
    } catch (error) {
      console.error('Error loading user offers:', error)
      this.showStatus('❌ Error loading offers: ' + error.message, 'error')
    }
  }

  private displayMyOffersModal(offers: OfferWithStatus[]) {
    const modal = this.createModal('my-offers-modal', 'Quản lý tin đăng của bạn')
    
    const content = `
      <div class="offers-grid">
        ${offers.length === 0 ? 
          '<p class="no-offers">Bạn chưa có tin đăng nào</p>' :
          offers.map(offer => this.createOfferCard(offer)).join('')
        }
      </div>
    `
    
    const modalBody = modal.querySelector('.modal-body')
    if (modalBody) {
      modalBody.innerHTML = content
    }
    
    document.body.appendChild(modal)
    
    // Add event listeners for offer actions
    this.attachOfferActionListeners()
  }

  private createOfferCard(offer: OfferWithStatus): string {
    const statusClass = this.getStatusClass(offer.status)
    const expiryText = offer.days_until_expiry > 0 ? 
      `${offer.days_until_expiry} ngày` : 'Đã hết hạn'
    
    return `
      <div class="offer-card ${statusClass}" data-offer-id="${offer.offer_id}">
        <div class="offer-header">
          <h3>Offer #${offer.offer_id}</h3>
          <span class="offer-status">${offer.status_vietnamese}</span>
        </div>
        
        <div class="offer-details">
          <div class="detail-row">
            <span>Số lượng:</span>
            <span>${offer.quantity} kWh</span>
          </div>
          <div class="detail-row">
            <span>Giá:</span>
            <span>${offer.price_per_kwh_eth} ETH/kWh</span>
          </div>
          <div class="detail-row">
            <span>Tổng giá trị:</span>
            <span>${offer.total_price_eth} ETH</span>
          </div>
          <div class="detail-row">
            <span>Thời hạn:</span>
            <span>${expiryText}</span>
          </div>
          ${offer.edit_count > 0 ? `
            <div class="detail-row">
              <span>Đã sửa:</span>
              <span>${offer.edit_count} lần</span>
            </div>
          ` : ''}
          ${offer.restore_count > 0 ? `
            <div class="detail-row">
              <span>Đã khôi phục:</span>
              <span>${offer.restore_count} lần</span>
            </div>
          ` : ''}
        </div>
        
        <div class="offer-actions">
          ${offer.can_edit ? `
            <button class="btn btn-edit" onclick="offerManagement.editOffer(${offer.offer_id})">
              ✏️ Sửa
            </button>
          ` : ''}
          
          ${offer.can_restore ? `
            <button class="btn btn-restore" onclick="offerManagement.restoreOffer(${offer.offer_id})">
              🔄 Khôi phục
            </button>
          ` : ''}
          
          ${offer.can_cancel ? `
            <button class="btn btn-cancel" onclick="offerManagement.cancelOffer(${offer.offer_id})">
              🗑️ Xóa vĩnh viễn
            </button>
          ` : ''}
        </div>
        
        ${offer.days_until_deletion > 0 && offer.days_until_deletion <= 3 && offer.status !== 'cancelled' ? `
          <div class="deletion-warning">
            ⚠️ Tin sẽ bị xóa sau ${offer.days_until_deletion} ngày
          </div>
        ` : ''}
      </div>
    `
  }

  async editOffer(offerId: number) {
    if (!this.userWallet) return

    try {
      // Get current offer details
      const response = await apiClient.request(`/offers/lifecycle/user/${this.userWallet}`)
      const offer = response.data.find((o: OfferWithStatus) => o.offer_id === offerId)
      
      if (!offer) {
        this.showStatus('❌ Không tìm thấy tin đăng', 'error')
        return
      }

      this.showEditOfferModal(offer)
    } catch (error) {
      console.error('Error loading offer for edit:', error)
      this.showStatus('❌ Lỗi khi tải thông tin tin đăng', 'error')
    }
  }

  private showEditOfferModal(offer: OfferWithStatus) {
    const modal = this.createModal('edit-offer-modal', 'Sửa tin đăng')
    
    const content = `
      <form id="edit-offer-form">
        <div class="form-group">
          <label for="edit-quantity">Số lượng (kWh):</label>
          <input type="number" id="edit-quantity" value="${offer.quantity}" min="1" step="1">
        </div>
        
        <div class="form-group">
          <label for="edit-price-eth">Giá (ETH/kWh):</label>
          <input type="number" id="edit-price-eth" value="${offer.price_per_kwh_eth}" min="0.000001" step="0.000001">
        </div>
        
        <div class="form-group">
          <label for="edit-price-vnd">Giá (VND/kWh):</label>
          <input type="number" id="edit-price-vnd" value="${offer.price_per_kwh_vnd}" min="1" step="1">
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-cancel" onclick="offerManagement.closeModals()">
            Hủy
          </button>
          <button type="submit" class="btn btn-primary">
            💾 Lưu thay đổi
          </button>
        </div>
      </form>
    `
    
    const modalBody = modal.querySelector('.modal-body')
    if (modalBody) {
      modalBody.innerHTML = content
    }
    
    document.body.appendChild(modal)
    
    // Handle form submission
    const form = document.getElementById('edit-offer-form') as HTMLFormElement
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.submitEditOffer(offer.offer_id)
    })
  }

  private async submitEditOffer(offerId: number) {
    if (!this.userWallet) return

    try {
      const quantity = (document.getElementById('edit-quantity') as HTMLInputElement).value
      const priceETH = (document.getElementById('edit-price-eth') as HTMLInputElement).value
      const priceVND = (document.getElementById('edit-price-vnd') as HTMLInputElement).value

      this.showStatus('💾 Đang lưu thay đổi...', 'info')

      const response = await apiClient.request('/offers/lifecycle/edit', {
        method: 'PUT',
        body: JSON.stringify({
          offerId: offerId,
          walletAddress: this.userWallet,
          quantity: parseFloat(quantity),
          pricePerKWhETH: priceETH,
          pricePerKWhVND: parseFloat(priceVND)
        })
      })

      if (response.success) {
        this.showStatus('✅ Tin đăng đã được cập nhật', 'success')
        this.closeModals()
        // Refresh the offers list
        setTimeout(() => this.showMyOffers(), 1000)
      } else {
        this.showStatus('❌ ' + response.message, 'error')
      }
    } catch (error) {
      console.error('Error editing offer:', error)
      this.showStatus('❌ Lỗi khi sửa tin đăng: ' + error.message, 'error')
    }
  }

  async restoreOffer(offerId: number) {
    if (!this.userWallet) return

    if (!confirm('Bạn có chắc muốn khôi phục tin đăng này? Tin sẽ có hiệu lực thêm 7 ngày.')) {
      return
    }

    try {
      this.showStatus('🔄 Đang khôi phục tin đăng...', 'info')

      const response = await apiClient.request('/offers/lifecycle/restore', {
        method: 'POST',
        body: JSON.stringify({
          offerId: offerId,
          walletAddress: this.userWallet
        })
      })

      if (response.success) {
        this.showStatus('✅ Tin đăng đã được khôi phục', 'success')
        // Refresh the offers list
        setTimeout(() => this.showMyOffers(), 1000)
      } else {
        this.showStatus('❌ ' + response.message, 'error')
      }
    } catch (error) {
      console.error('Error restoring offer:', error)
      this.showStatus('❌ Lỗi khi khôi phục tin đăng: ' + error.message, 'error')
    }
  }

  async cancelOffer(offerId: number) {
    const confirmation = prompt('⚠️ CẢNH BÁO: Tin đăng sẽ bị XÓA VĨNH VIỄN ngay lập tức!\n\nĐể xác nhận xóa tin đăng, vui lòng gõ "CANCEL" (viết hoa):')

    if (confirmation !== 'CANCEL') {
      this.showStatus('❌ Xác nhận không đúng. Vui lòng gõ "CANCEL" để xóa tin đăng.', 'warning')
      return
    }

    if (!this.userWallet) return

    try {
      this.showStatus('🗑️ Đang xóa tin đăng vĩnh viễn...', 'info')

      const response = await apiClient.request('/offers/lifecycle/cancel', {
        method: 'POST',
        body: JSON.stringify({
          offerId: offerId,
          walletAddress: this.userWallet,
          confirmationText: 'CANCEL'
        })
      })

      if (response.success) {
        this.showStatus('✅ Tin đăng đã được xóa vĩnh viễn', 'success')
        // Refresh the offers list
        setTimeout(() => this.showMyOffers(), 1000)
      } else {
        this.showStatus('❌ ' + response.message, 'error')
      }
    } catch (error) {
      console.error('Error cancelling offer:', error)
      this.showStatus('❌ Lỗi khi xóa tin đăng: ' + error.message, 'error')
    }
  }

  private createModal(id: string, title: string): HTMLElement {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal" id="${id}">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Content will be inserted here -->
        </div>
      </div>
    `
    return modal
  }

  private attachOfferActionListeners() {
    // Event listeners are attached via onclick attributes in createOfferCard
    // This method can be used for additional event handling if needed
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active'
      case 'expired': return 'status-expired'
      case 'sold': return 'status-sold'
      case 'cancelled': return 'status-cancelled'
      case 'deleted': return 'status-deleted'
      default: return 'status-unknown'
    }
  }

  private closeModals() {
    const modals = document.querySelectorAll('.modal-overlay')
    modals.forEach(modal => modal.remove())
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
const offerManagement = new OfferManagement()

// Export for use in other modules
export { offerManagement, OfferManagement }

// Make available globally for onclick handlers
;(window as any).offerManagement = offerManagement
