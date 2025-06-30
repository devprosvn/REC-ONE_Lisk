#!/usr/bin/env node

import { supabase } from './src/config/supabase.js'
import { TABLES } from './src/config/supabase.js'

console.log('🛡️ Zero Price Offers Prevention Check')
console.log('====================================')

async function preventZeroPriceOffers() {
  try {
    console.log('🔍 Checking for any zero or negative price offers...\n')

    // Check for offers with price <= 0
    const { data: invalidOffers, error: fetchError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('*')
      .or('price_per_kwh_eth.lte.0,total_price_eth.lte.0')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching invalid price offers:', fetchError.message)
      return
    }

    if (!invalidOffers || invalidOffers.length === 0) {
      console.log('✅ No invalid price offers found')
      console.log('   All offers have valid prices > 0')
    } else {
      console.log(`⚠️ Found ${invalidOffers.length} offers with invalid prices:`)
      console.log('=' .repeat(60))

      invalidOffers.forEach((offer, index) => {
        console.log(`${index + 1}. Offer ID: ${offer.offer_id}`)
        console.log(`   Price per kWh: ${offer.price_per_kwh_eth} ETH`)
        console.log(`   Total price: ${offer.total_price_eth} ETH`)
        console.log(`   Quantity: ${offer.quantity} kWh`)
        console.log(`   Status: ${offer.status}`)
        console.log(`   Created: ${new Date(offer.created_at).toLocaleString()}`)
        console.log('   ' + '-'.repeat(50))
      })

      // Ask if user wants to delete these
      console.log('\n🗑️ These offers should be deleted as they have invalid prices.')
      console.log('   Run the cleanup script to remove them.')
    }

    console.log('\n📊 Database Statistics:')
    
    // Get all offers statistics
    const { data: allOffers, error: statsError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('price_per_kwh_eth, total_price_eth, status, quantity')

    if (statsError) {
      console.error('❌ Error getting statistics:', statsError.message)
      return
    }

    if (allOffers && allOffers.length > 0) {
      console.log(`   Total offers: ${allOffers.length}`)
      
      // Valid offers (price > 0)
      const validOffers = allOffers.filter(offer => 
        parseFloat(offer.price_per_kwh_eth) > 0 && 
        parseFloat(offer.total_price_eth) > 0
      )
      
      console.log(`   Valid offers: ${validOffers.length}`)
      console.log(`   Invalid offers: ${allOffers.length - validOffers.length}`)
      
      if (validOffers.length > 0) {
        const prices = validOffers.map(offer => parseFloat(offer.price_per_kwh_eth))
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
        
        console.log(`   Price range: ${minPrice.toFixed(6)} - ${maxPrice.toFixed(6)} ETH/kWh`)
        console.log(`   Average price: ${avgPrice.toFixed(6)} ETH/kWh`)
        
        // Total value
        const totalValue = validOffers.reduce((sum, offer) => 
          sum + parseFloat(offer.total_price_eth), 0
        )
        console.log(`   Total market value: ${totalValue.toFixed(6)} ETH`)
        
        // Total energy
        const totalEnergy = validOffers.reduce((sum, offer) => 
          sum + parseFloat(offer.quantity), 0
        )
        console.log(`   Total energy: ${totalEnergy} kWh`)
      }

      // Status breakdown
      const statusCounts = {}
      allOffers.forEach(offer => {
        statusCounts[offer.status] = (statusCounts[offer.status] || 0) + 1
      })
      
      console.log(`   Status breakdown:`)
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count} offers`)
      })
    } else {
      console.log('   No offers in database')
    }

    console.log('\n🛡️ Prevention Recommendations:')
    console.log('==============================')
    console.log('1. ✅ Frontend validation: Ensure price > 0 before submission')
    console.log('2. ✅ Backend validation: Reject offers with price <= 0')
    console.log('3. ✅ Database constraints: Add CHECK constraint for price > 0')
    console.log('4. ✅ Regular monitoring: Run this script periodically')
    console.log('5. ✅ User education: Clear pricing guidelines')

    console.log('\n📋 Validation Rules to Implement:')
    console.log('=================================')
    console.log('Frontend (TypeScript):')
    console.log('  - Min price: 0.000001 ETH/kWh')
    console.log('  - Max price: 1.0 ETH/kWh (reasonable limit)')
    console.log('  - Input validation: Real-time feedback')
    console.log('')
    console.log('Backend (Node.js):')
    console.log('  - Joi validation: price > 0')
    console.log('  - Business logic: Reasonable price ranges')
    console.log('  - Error messages: Clear feedback')
    console.log('')
    console.log('Database (PostgreSQL):')
    console.log('  - CHECK constraint: price_per_kwh_eth > 0')
    console.log('  - CHECK constraint: total_price_eth > 0')
    console.log('  - Triggers: Auto-calculate total prices')

  } catch (error) {
    console.error('❌ Prevention check failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run prevention check
console.log('🚀 Starting zero price prevention check...')
preventZeroPriceOffers()
  .then(() => {
    console.log('\n✅ Prevention check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Prevention check failed:', error.message)
    process.exit(1)
  })
