// REC-ONE Scheduled Tasks Service
// Handles automatic offer expiration and deletion

import cron from 'node-cron'
import { OfferLifecycleService } from './offerLifecycleService.js'

class ScheduledTasksService {
  static isRunning = false

  static start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduled tasks already running')
      return
    }

    console.log('🕐 Starting scheduled tasks for offer lifecycle management...')

    // Run every hour to check for expired offers
    cron.schedule('0 * * * *', async () => {
      console.log('🕐 Running hourly offer expiration check...')
      try {
        const expiredResult = await OfferLifecycleService.expireOldOffers()
        if (expiredResult.expiredCount > 0) {
          console.log(`⏰ Expired ${expiredResult.expiredCount} offers`)
        }
      } catch (error) {
        console.error('❌ Error in hourly expiration check:', error.message)
      }
    })

    // Run every 6 hours to check for offers to delete (only expired offers, cancelled are deleted immediately)
    cron.schedule('0 */6 * * *', async () => {
      console.log('🕐 Running 6-hourly offer deletion check...')
      try {
        const deletedResult = await OfferLifecycleService.deleteOldOffers()
        if (deletedResult.deletedCount > 0) {
          console.log(`🗑️ Deleted ${deletedResult.deletedCount} expired offers (cancelled offers are deleted immediately)`)
        }
      } catch (error) {
        console.error('❌ Error in 6-hourly deletion check:', error.message)
      }
    })

    // Run daily at midnight to log statistics
    cron.schedule('0 0 * * *', async () => {
      console.log('🕐 Running daily offer statistics...')
      try {
        // Get offer statistics
        const stats = await this.getOfferStatistics()
        console.log('📊 Daily Offer Statistics:')
        console.log(`   Active offers: ${stats.active}`)
        console.log(`   Expired offers: ${stats.expired}`)
        console.log(`   Sold offers: ${stats.sold}`)
        console.log(`   Cancelled offers: ${stats.cancelled}`)
        console.log(`   Total offers: ${stats.total}`)
      } catch (error) {
        console.error('❌ Error in daily statistics:', error.message)
      }
    })

    this.isRunning = true
    console.log('✅ Scheduled tasks started successfully')
    console.log('   - Hourly: Expire old offers')
    console.log('   - 6-hourly: Delete old offers')
    console.log('   - Daily: Log statistics')
  }

  static stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduled tasks not running')
      return
    }

    // Note: node-cron doesn't provide a direct way to stop all tasks
    // In a production environment, you'd want to keep references to tasks
    console.log('🛑 Stopping scheduled tasks...')
    this.isRunning = false
  }

  static async getOfferStatistics() {
    try {
      const { supabase } = await import('../config/supabase.js')
      const { TABLES } = await import('../config/supabase.js')

      const { data: offers, error } = await supabase
        .from(TABLES.ENERGY_OFFERS)
        .select('status')

      if (error) throw error

      const stats = {
        total: offers?.length || 0,
        active: 0,
        expired: 0,
        sold: 0,
        cancelled: 0,
        deleted: 0
      }

      offers?.forEach(offer => {
        switch (offer.status) {
          case 'active':
            stats.active++
            break
          case 'expired':
            stats.expired++
            break
          case 'sold':
            stats.sold++
            break
          case 'cancelled':
            stats.cancelled++
            break
          case 'deleted':
            stats.deleted++
            break
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting offer statistics:', error)
      return {
        total: 0,
        active: 0,
        expired: 0,
        sold: 0,
        cancelled: 0,
        deleted: 0
      }
    }
  }

  // Manual trigger for testing
  static async runExpirationCheck() {
    console.log('🔧 Manual expiration check triggered...')
    try {
      const expiredResult = await OfferLifecycleService.expireOldOffers()
      const deletedResult = await OfferLifecycleService.deleteOldOffers()
      
      return {
        success: true,
        expired: expiredResult.expiredCount,
        deleted: deletedResult.deletedCount,
        message: `Expired ${expiredResult.expiredCount} offers, deleted ${deletedResult.deletedCount} offers`
      }
    } catch (error) {
      console.error('Error in manual expiration check:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  // Initialize expiration dates for existing offers (run once)
  static async initializeExistingOffers() {
    console.log('🔧 Initializing expiration dates for existing offers...')
    try {
      const result = await OfferLifecycleService.initializeExpirationDates()
      console.log(`✅ Initialized ${result.updatedCount} offers with expiration dates`)
      return result
    } catch (error) {
      console.error('Error initializing existing offers:', error)
      throw error
    }
  }
}

export { ScheduledTasksService }
