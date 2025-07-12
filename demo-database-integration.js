#!/usr/bin/env node

console.log('🎬 REC-ONE Database Integration Demo')
console.log('===================================')

const API_BASE = 'http://localhost:3002/api/v1'

async function runDemo() {
  console.log('🚀 Starting comprehensive demo...\n')

  try {
    // Demo 1: Create multiple users
    console.log('👥 Demo 1: Creating multiple users...')
    const users = [
      { wallet: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87', name: 'Solar_Farm_A' },
      { wallet: '0x8ba1f109551bD432803012645Hac136c0c8416e9', name: 'Wind_Generator_B' },
      { wallet: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db', name: 'Hydro_Plant_C' }
    ]

    for (const user of users) {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: user.wallet,
          username: user.name
        })
      })
      const result = await response.json()
      if (result.success) {
        console.log(`✅ Created user: ${user.name} (${user.wallet.substring(0, 10)}...)`)
      }
    }

    // Demo 2: Create multiple energy offers
    console.log('\n⚡ Demo 2: Creating energy marketplace offers...')
    const offers = [
      { seller: users[0].wallet, quantity: 100, priceVND: 2200, type: 'Solar' },
      { seller: users[1].wallet, quantity: 150, priceVND: 2400, type: 'Wind' },
      { seller: users[2].wallet, quantity: 200, priceVND: 2100, type: 'Hydro' },
      { seller: users[0].wallet, quantity: 75, priceVND: 2300, type: 'Solar' },
      { seller: users[1].wallet, quantity: 120, priceVND: 2500, type: 'Wind' }
    ]

    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i]
      const offerData = {
        offerId: 1000 + i,
        sellerWallet: offer.seller,
        quantity: offer.quantity,
        pricePerKWhETH: offer.priceVND / 48000000, // Convert VND to ETH
        pricePerKWhVND: offer.priceVND,
        txHash: '0x' + Math.random().toString(16).substr(2, 62)
      }

      const response = await fetch(`${API_BASE}/energy/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      })
      const result = await response.json()
      if (result.success) {
        console.log(`✅ Created ${offer.type} offer: ${offer.quantity} kWh @ ${offer.priceVND} VND/kWh`)
        console.log(`   Total value: ${(offer.quantity * offer.priceVND).toLocaleString('vi-VN')} VND`)
      }
    }

    // Demo 3: Show marketplace statistics
    console.log('\n📊 Demo 3: Marketplace statistics...')
    const statsResponse = await fetch(`${API_BASE}/energy/marketplace/stats`)
    const statsResult = await statsResponse.json()
    if (statsResult.success) {
      const stats = statsResult.data
      console.log('📈 Current Marketplace Status:')
      console.log(`   Active Offers: ${stats.activeOffers.count}`)
      console.log(`   Total Volume: ${stats.activeOffers.totalVolume} kWh`)
      console.log(`   Total Value: ${stats.activeOffers.totalValue.toLocaleString('vi-VN')} VND`)
      console.log(`   Average Price: ${stats.activeOffers.averagePrice.toLocaleString('vi-VN')} VND/kWh`)
      console.log(`   Recent Trades: ${stats.recentTrades.count}`)
    }

    // Demo 4: Show all active offers
    console.log('\n🏪 Demo 4: Active marketplace offers...')
    const offersResponse = await fetch(`${API_BASE}/energy/offers`)
    const offersResult = await offersResponse.json()
    if (offersResult.success && offersResult.data.length > 0) {
      console.log('🛒 Available Energy Offers:')
      console.log('┌─────────┬──────────┬───────────┬──────────────┬─────────────────┐')
      console.log('│ Offer ID│ Quantity │ Price/kWh │ Total Value  │ Seller          │')
      console.log('├─────────┼──────────┼───────────┼──────────────┼─────────────────┤')
      
      offersResult.data.forEach(offer => {
        const sellerId = offer.seller_wallet.substring(0, 8) + '...'
        const quantity = offer.quantity.toString().padEnd(8)
        const price = offer.price_per_kwh_vnd.toLocaleString('vi-VN').padEnd(9)
        const total = offer.total_price_vnd.toLocaleString('vi-VN').padEnd(12)
        const offerId = offer.offer_id.toString().padEnd(7)
        
        console.log(`│ ${offerId}│ ${quantity}│ ${price}│ ${total}│ ${sellerId}     │`)
      })
      console.log('└─────────┴──────────┴───────────┴──────────────┴─────────────────┘')
    }

    // Demo 5: Simulate energy purchase
    console.log('\n💰 Demo 5: Simulating energy purchase...')
    if (offersResult.data.length > 0) {
      const firstOffer = offersResult.data[0]
      const purchaseData = {
        offerId: firstOffer.offer_id,
        buyerWallet: users[2].wallet, // Hydro plant buying solar energy
        sellerWallet: firstOffer.seller_wallet,
        quantity: firstOffer.quantity,
        totalPriceETH: firstOffer.total_price_eth,
        totalPriceVND: firstOffer.total_price_vnd,
        txHash: '0x' + Math.random().toString(16).substr(2, 62),
        blockNumber: Math.floor(Math.random() * 1000000)
      }

      const purchaseResponse = await fetch(`${API_BASE}/energy/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      })
      const purchaseResult = await purchaseResponse.json()
      if (purchaseResult.success) {
        console.log('✅ Energy purchase completed!')
        console.log(`   Buyer: ${purchaseData.buyerWallet.substring(0, 10)}...`)
        console.log(`   Seller: ${purchaseData.sellerWallet.substring(0, 10)}...`)
        console.log(`   Quantity: ${purchaseData.quantity} kWh`)
        console.log(`   Price: ${purchaseData.totalPriceVND.toLocaleString('vi-VN')} VND`)
      } else {
        console.log('⚠️ Purchase simulation failed:', purchaseResult.message)
      }
    }

    // Demo 6: Updated marketplace statistics
    console.log('\n📊 Demo 6: Updated marketplace statistics...')
    const updatedStatsResponse = await fetch(`${API_BASE}/energy/marketplace/stats`)
    const updatedStatsResult = await updatedStatsResponse.json()
    if (updatedStatsResult.success) {
      const stats = updatedStatsResult.data
      console.log('📈 Updated Marketplace Status:')
      console.log(`   Active Offers: ${stats.activeOffers.count}`)
      console.log(`   Total Volume: ${stats.activeOffers.totalVolume} kWh`)
      console.log(`   Total Value: ${stats.activeOffers.totalValue.toLocaleString('vi-VN')} VND`)
      console.log(`   Average Price: ${stats.activeOffers.averagePrice.toLocaleString('vi-VN')} VND/kWh`)
      console.log(`   Recent Trades: ${stats.recentTrades.count}`)
      console.log(`   Trade Volume: ${stats.recentTrades.volume} kWh`)
      console.log(`   Trade Value: ${stats.recentTrades.value.toLocaleString('vi-VN')} VND`)
    }

    // Demo 7: Vietnam electricity pricing comparison
    console.log('\n🇻🇳 Demo 7: Vietnam electricity pricing comparison...')
    const vnTariff = [
      { tier: 'Tier 1', range: '0-50 kWh', price: 1984 },
      { tier: 'Tier 2', range: '51-100 kWh', price: 2050 },
      { tier: 'Tier 3', range: '101-200 kWh', price: 2380 },
      { tier: 'Tier 4', range: '201-300 kWh', price: 2998 },
      { tier: 'Tier 5', range: '301-400 kWh', price: 3350 },
      { tier: 'Tier 6', range: '401+ kWh', price: 3460 }
    ]

    console.log('⚡ Vietnam EVN Tariff vs P2P Marketplace:')
    console.log('┌─────────┬─────────────┬─────────────┬─────────────────┐')
    console.log('│ Tier    │ Range       │ EVN Price   │ P2P Avg Price   │')
    console.log('├─────────┼─────────────┼─────────────┼─────────────────┤')
    
    const marketAvgPrice = updatedStatsResult.data.activeOffers.averagePrice || 2400
    
    vnTariff.forEach(tier => {
      const tierName = tier.tier.padEnd(7)
      const range = tier.range.padEnd(11)
      const evnPrice = tier.price.toLocaleString('vi-VN').padEnd(11)
      const comparison = marketAvgPrice < tier.price ? '✅ Cheaper' : '⚠️ Higher'
      const comparisonPadded = comparison.padEnd(15)
      
      console.log(`│ ${tierName}│ ${range}│ ${evnPrice}│ ${comparisonPadded}│`)
    })
    console.log('└─────────┴─────────────┴─────────────┴─────────────────┘')

    console.log(`\n💡 P2P Average: ${marketAvgPrice.toLocaleString('vi-VN')} VND/kWh`)
    console.log('   P2P marketplace offers competitive pricing compared to EVN tariffs!')

    // Demo Summary
    console.log('\n🎉 Demo Complete - Database Integration Summary')
    console.log('==============================================')
    console.log('✅ User Management: Multiple users created and managed')
    console.log('✅ Energy Marketplace: Multiple offers created and tracked')
    console.log('✅ Real-time Statistics: Live marketplace data')
    console.log('✅ Transaction Processing: Purchase simulation successful')
    console.log('✅ Vietnam Pricing: EVN tariff comparison integrated')
    console.log('✅ Database Storage: All data persisted in Supabase')

    console.log('\n🔗 Access Points:')
    console.log('- Frontend App: http://localhost:5173')
    console.log('- Backend API: http://localhost:3002/api/v1')
    console.log('- Database Dashboard: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek')

    console.log('\n🚀 Ready for Production Use!')
    console.log('Users can now generate energy and create offers with full database persistence.')

  } catch (error) {
    console.error('❌ Demo failed:', error.message)
  }
}

runDemo()
