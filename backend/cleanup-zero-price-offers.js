#!/usr/bin/env node

import { supabase } from './src/config/supabase.js'
import { TABLES } from './src/config/supabase.js'

console.log('🧹 Cleaning Up Zero Price Offers')
console.log('=================================')

async function cleanupZeroPriceOffers() {
  try {
    console.log('🔍 Step 1: Finding offers with 0 ETH price...\n')

    // Find all offers with price_per_kwh_eth = 0
    const { data: zeroPriceOffers, error: fetchError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('*')
      .eq('price_per_kwh_eth', 0)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching zero price offers:', fetchError.message)
      return
    }

    if (!zeroPriceOffers || zeroPriceOffers.length === 0) {
      console.log('✅ No offers found with 0 ETH price')
      console.log('   Database is clean!')
      return
    }

    console.log(`📊 Found ${zeroPriceOffers.length} offers with 0 ETH price:`)
    console.log('=' .repeat(60))

    // Display details of zero price offers
    zeroPriceOffers.forEach((offer, index) => {
      console.log(`${index + 1}. Offer ID: ${offer.offer_id}`)
      console.log(`   Created: ${new Date(offer.created_at).toLocaleString()}`)
      console.log(`   Seller: ${offer.seller_wallet}`)
      console.log(`   Quantity: ${offer.quantity} kWh`)
      console.log(`   Price ETH: ${offer.price_per_kwh_eth} ETH/kWh`)
      console.log(`   Price VND: ${offer.price_per_kwh_vnd} VND/kWh`)
      console.log(`   Status: ${offer.status}`)
      console.log(`   Total Price ETH: ${offer.total_price_eth} ETH`)
      console.log(`   Total Price VND: ${offer.total_price_vnd} VND`)
      console.log('   ' + '-'.repeat(50))
    })

    console.log(`\n📋 Summary:`)
    console.log(`   Total offers to delete: ${zeroPriceOffers.length}`)
    
    // Group by status
    const statusCounts = {}
    zeroPriceOffers.forEach(offer => {
      statusCounts[offer.status] = (statusCounts[offer.status] || 0) + 1
    })
    
    console.log(`   Status breakdown:`)
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count} offers`)
    })

    // Group by seller
    const sellerCounts = {}
    zeroPriceOffers.forEach(offer => {
      const seller = offer.seller_wallet
      sellerCounts[seller] = (sellerCounts[seller] || 0) + 1
    })
    
    console.log(`   Seller breakdown:`)
    Object.entries(sellerCounts).forEach(([seller, count]) => {
      console.log(`     ${seller}: ${count} offers`)
    })

    console.log('\n🔧 Step 2: Deleting zero price offers...')
    
    // Delete all offers with 0 ETH price
    const { data: deletedOffers, error: deleteError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .delete()
      .eq('price_per_kwh_eth', 0)
      .select()

    if (deleteError) {
      console.error('❌ Error deleting zero price offers:', deleteError.message)
      return
    }

    console.log(`✅ Successfully deleted ${deletedOffers?.length || 0} offers with 0 ETH price`)

    if (deletedOffers && deletedOffers.length > 0) {
      console.log('\n📊 Deleted offers:')
      deletedOffers.forEach((offer, index) => {
        console.log(`   ${index + 1}. Offer ${offer.offer_id} (${offer.status}) - ${offer.seller_wallet}`)
      })
    }

    console.log('\n🔍 Step 3: Verifying cleanup...')
    
    // Verify no zero price offers remain
    const { data: remainingZeroOffers, error: verifyError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('offer_id')
      .eq('price_per_kwh_eth', 0)

    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError.message)
      return
    }

    if (!remainingZeroOffers || remainingZeroOffers.length === 0) {
      console.log('✅ Cleanup verified: No offers with 0 ETH price remain')
    } else {
      console.log(`⚠️ Warning: ${remainingZeroOffers.length} offers with 0 ETH price still exist`)
    }

    console.log('\n🔍 Step 4: Checking remaining offers...')
    
    // Get count of remaining offers
    const { data: allOffers, error: countError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('offer_id, price_per_kwh_eth, status')

    if (countError) {
      console.error('❌ Error counting remaining offers:', countError.message)
      return
    }

    console.log(`📊 Remaining offers in database: ${allOffers?.length || 0}`)
    
    if (allOffers && allOffers.length > 0) {
      // Show price range of remaining offers
      const prices = allOffers.map(offer => parseFloat(offer.price_per_kwh_eth)).filter(price => price > 0)
      if (prices.length > 0) {
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
        
        console.log(`   Price range: ${minPrice.toFixed(6)} - ${maxPrice.toFixed(6)} ETH/kWh`)
        console.log(`   Average price: ${avgPrice.toFixed(6)} ETH/kWh`)
      }

      // Show status breakdown of remaining offers
      const remainingStatusCounts = {}
      allOffers.forEach(offer => {
        remainingStatusCounts[offer.status] = (remainingStatusCounts[offer.status] || 0) + 1
      })
      
      console.log(`   Status breakdown:`)
      Object.entries(remainingStatusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count} offers`)
      })
    }

    console.log('\n🎉 Zero Price Offers Cleanup Complete')
    console.log('====================================')
    console.log(`✅ Deleted: ${deletedOffers?.length || 0} offers with 0 ETH price`)
    console.log(`✅ Remaining: ${allOffers?.length || 0} valid offers`)
    console.log('✅ Database cleaned successfully')

    console.log('\n📋 Next Steps')
    console.log('=============')
    console.log('1. ✅ Zero price offers removed')
    console.log('2. 🔄 Refresh frontend to see updated offers')
    console.log('3. 🧪 Test offer creation with valid prices')
    console.log('4. 📊 Monitor for any new zero price offers')

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run cleanup
console.log('🚀 Starting zero price offers cleanup...')
cleanupZeroPriceOffers()
  .then(() => {
    console.log('\n✅ Cleanup process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup process failed:', error.message)
    process.exit(1)
  })
