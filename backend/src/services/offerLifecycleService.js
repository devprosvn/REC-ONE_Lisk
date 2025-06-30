// REC-ONE Offer Lifecycle Management Service
import { supabase } from '../config/supabase.js'
import { TABLES } from '../config/supabase.js'

export class OfferLifecycleService {
  
  // Expire offers that are past their expiration date
  static async expireOldOffers() {
    try {
      const { data: expiredOffers, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({
          status: 'expired',
          is_expired: true,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .eq('is_expired', false)
        .select()

      if (error) throw error

      return {
        success: true,
        expiredCount: expiredOffers?.length || 0,
        expiredOffers
      }
    } catch (error) {
      console.error('Error expiring old offers:', error)
      throw error
    }
  }

  // Delete offers that are past their auto-delete date
  static async deleteOldOffers() {
    try {
      const { data: deletedOffers, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .lt('auto_delete_at', new Date().toISOString())
        .in('status', ['expired', 'cancelled'])
        .neq('status', 'deleted')
        .select()

      if (error) throw error

      return {
        success: true,
        deletedCount: deletedOffers?.length || 0,
        deletedOffers
      }
    } catch (error) {
      console.error('Error deleting old offers:', error)
      throw error
    }
  }

  // Restore an expired offer
  static async restoreOffer(offerId, userWallet) {
    try {
      // Check if offer exists and is expired
      const { data: offer, error: fetchError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('*')
        .eq('offer_id', parseInt(offerId))
        .eq('seller_wallet', userWallet.toLowerCase())
        .eq('status', 'expired')
        .eq('is_expired', true)
        .single()

      if (fetchError || !offer) {
        return {
          success: false,
          message: 'Offer not found or not eligible for restoration'
        }
      }

      // Calculate new expiration dates
      const now = new Date()
      const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      const newAutoDeleteAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days for restored

      // Restore the offer
      const { data: restoredOffer, error: updateError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({
          status: 'active',
          is_expired: false,
          is_restored: true,
          restored_at: now.toISOString(),
          restore_count: (offer.restore_count || 0) + 1,
          expires_at: newExpiresAt.toISOString(),
          auto_delete_at: newAutoDeleteAt.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('offer_id', parseInt(offerId))
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        message: 'Offer restored successfully',
        data: restoredOffer
      }
    } catch (error) {
      console.error('Error restoring offer:', error)
      throw error
    }
  }

  // Cancel an offer (requires "CANCEL" confirmation)
  static async cancelOffer(offerId, userWallet, confirmationText) {
    try {
      // Validate confirmation text
      if (confirmationText !== 'CANCEL') {
        return {
          success: false,
          message: 'Invalid confirmation. Please type "CANCEL" to confirm cancellation.'
        }
      }

      // Check if offer exists and user is owner
      const { data: offer, error: fetchError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('*')
        .eq('offer_id', parseInt(offerId))
        .eq('seller_wallet', userWallet.toLowerCase())
        .in('status', ['active', 'expired'])
        .single()

      if (fetchError || !offer) {
        return {
          success: false,
          message: 'Offer not found or you are not the owner'
        }
      }

      // Cancel = Delete immediately (no 3-day waiting period)
      const now = new Date()

      // Cancel and delete the offer immediately
      const { data: cancelledOffer, error: updateError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update({
          status: 'deleted',
          is_cancelled: true,
          cancelled_at: now.toISOString(),
          cancelled_by: userWallet.toLowerCase(),
          auto_delete_at: now.toISOString(), // Deleted immediately
          updated_at: now.toISOString()
        })
        .eq('offer_id', parseInt(offerId))
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        message: 'Offer cancelled successfully',
        data: cancelledOffer
      }
    } catch (error) {
      console.error('Error cancelling offer:', error)
      throw error
    }
  }

  // Edit an active offer
  static async editOffer(offerId, userWallet, updates) {
    try {
      const { quantity, pricePerKWhETH, pricePerKWhVND } = updates

      // Check if offer exists and is active
      const { data: offer, error: fetchError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('*')
        .eq('offer_id', parseInt(offerId))
        .eq('seller_wallet', userWallet.toLowerCase())
        .eq('status', 'active')
        .eq('is_expired', false)
        .single()

      if (fetchError || !offer) {
        return {
          success: false,
          message: 'Offer not found, not active, or you are not the owner'
        }
      }

      // Prepare update data
      const updateData = {
        last_edited_at: new Date().toISOString(),
        edit_count: (offer.edit_count || 0) + 1,
        updated_at: new Date().toISOString()
      }

      // Update quantity if provided
      if (quantity !== undefined) {
        updateData.quantity = parseFloat(quantity)
      }

      // Update prices if provided
      if (pricePerKWhETH !== undefined) {
        updateData.price_per_kwh_eth = parseFloat(pricePerKWhETH)
      }

      if (pricePerKWhVND !== undefined) {
        updateData.price_per_kwh_vnd = parseFloat(pricePerKWhVND)
      }

      // Recalculate total prices
      const finalQuantity = updateData.quantity || offer.quantity
      const finalPriceETH = updateData.price_per_kwh_eth || offer.price_per_kwh_eth
      const finalPriceVND = updateData.price_per_kwh_vnd || offer.price_per_kwh_vnd

      updateData.total_price_eth = finalQuantity * finalPriceETH
      updateData.total_price_vnd = finalQuantity * finalPriceVND

      // Update the offer
      const { data: editedOffer, error: updateError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .update(updateData)
        .eq('offer_id', parseInt(offerId))
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        message: 'Offer updated successfully',
        data: editedOffer
      }
    } catch (error) {
      console.error('Error editing offer:', error)
      throw error
    }
  }

  // Get user's offers with status information
  static async getUserOffersWithStatus(userWallet, limit = 50, offset = 0) {
    try {
      const { data: offers, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('*')
        .eq('seller_wallet', userWallet.toLowerCase())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Add status information and time calculations
      const offersWithStatus = offers?.map(offer => {
        const now = new Date()
        const expiresAt = new Date(offer.expires_at)
        const autoDeleteAt = new Date(offer.auto_delete_at)

        let statusVietnamese = 'Không xác định'
        let canRestore = false
        let canEdit = false
        let canCancel = false

        switch (offer.status) {
          case 'active':
            if (offer.is_expired || expiresAt < now) {
              statusVietnamese = 'Hết hạn'
              canRestore = true
            } else {
              statusVietnamese = 'Đang hoạt động'
              canEdit = true
              canCancel = true
            }
            break
          case 'expired':
            statusVietnamese = 'Hết hạn'
            canRestore = autoDeleteAt > now
            canCancel = true
            break
          case 'sold':
            statusVietnamese = 'Đã bán'
            break
          case 'cancelled':
            // Cancelled offers are now immediately deleted
            statusVietnamese = 'Đã xóa (đã hủy)'
            break
          case 'deleted':
            if (offer.is_cancelled) {
              statusVietnamese = 'Đã xóa (đã hủy)'
            } else {
              statusVietnamese = 'Đã xóa'
            }
            break
        }

        return {
          ...offer,
          status_vietnamese: statusVietnamese,
          days_until_expiry: expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0,
          days_until_deletion: autoDeleteAt > now ? Math.ceil((autoDeleteAt - now) / (1000 * 60 * 60 * 24)) : 0,
          can_restore: canRestore,
          can_edit: canEdit,
          can_cancel: canCancel
        }
      }) || []

      return {
        success: true,
        data: offersWithStatus,
        pagination: {
          limit,
          offset,
          count: offersWithStatus.length
        }
      }
    } catch (error) {
      console.error('Error getting user offers with status:', error)
      throw error
    }
  }

  // Get active offers (excluding expired/deleted)
  static async getActiveOffers(limit = 50, offset = 0) {
    try {
      const now = new Date().toISOString()

      const { data: offers, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select(`
          *,
          seller:users!seller_id(wallet_address, username, reputation_score)
        `)
        .eq('status', 'active')
        .eq('is_expired', false)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        success: true,
        data: offers || [],
        pagination: {
          limit,
          offset,
          count: offers?.length || 0
        }
      }
    } catch (error) {
      console.error('Error getting active offers:', error)
      throw error
    }
  }

  // Initialize expiration dates for existing offers
  static async initializeExpirationDates() {
    try {
      const { data: offers, error: fetchError } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('offer_id, created_at')
        .is('expires_at', null)

      if (fetchError) throw fetchError

      if (!offers || offers.length === 0) {
        return {
          success: true,
          message: 'No offers need initialization',
          updatedCount: 0
        }
      }

      // Update each offer with expiration dates
      const updates = offers.map(offer => {
        const createdAt = new Date(offer.created_at)
        const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
        const autoDeleteAt = new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days

        return supabase
          .from(TABLES.ENERGY_OFFERS)
          .update({
            expires_at: expiresAt.toISOString(),
            auto_delete_at: autoDeleteAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('offer_id', offer.offer_id)
      })

      await Promise.all(updates)

      return {
        success: true,
        message: 'Expiration dates initialized successfully',
        updatedCount: offers.length
      }
    } catch (error) {
      console.error('Error initializing expiration dates:', error)
      throw error
    }
  }
}
