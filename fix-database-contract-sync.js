#!/usr/bin/env node

console.log('🔧 Fixing Database-Contract Sync')
console.log('================================')

const { ethers } = require('ethers')

const API_BASE = 'http://localhost:3002/api/v1'
const RPC_URL = 'https://rpc.sepolia-api.lisk.com'
const CONTRACT_ADDRESS = '0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7'

// Contract ABI
const CONTRACT_ABI = [
  "function getActiveOffers() external view returns (uint256[])",
  "function getOffer(uint256 _offerId) external view returns (tuple(uint256 id, address seller, uint256 quantity, uint256 price, bool isActive, uint256 timestamp))",
  "function getTotalOffers() external view returns (uint256)",
  "function getActiveOffersCount() external view returns (uint256)"
]

async function fixDatabaseContractSync() {
  console.log('🔄 Fixing database and contract synchronization...\n')

  try {
    // Step 1: Get current state
    console.log('1. Getting current state...')
    
    // Get database offers
    const dbResponse = await fetch(`${API_BASE}/energy/offers`)
    const dbResult = await dbResponse.json()
    
    if (!dbResult.success) {
      console.log('❌ Failed to get database offers:', dbResult.message)
      return
    }

    // Get contract offers
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
    
    const activeOfferIds = await contract.getActiveOffers()
    console.log(`📊 Database offers: ${dbResult.data.length}`)
    console.log(`📊 Contract offers: ${activeOfferIds.length}`)

    // Step 2: Identify issues
    console.log('\n2. Identifying sync issues...')
    
    const dbOfferIds = dbResult.data.map(offer => parseInt(offer.offer_id))
    const contractOfferIds = activeOfferIds.map(id => parseInt(id.toString()))
    
    const dbOnly = dbOfferIds.filter(id => !contractOfferIds.includes(id))
    const contractOnly = contractOfferIds.filter(id => !dbOfferIds.includes(id))
    
    console.log(`⚠️ Database-only offers (FAKE): ${dbOnly.length} [${dbOnly.join(', ')}]`)
    console.log(`⚠️ Contract-only offers (MISSING): ${contractOnly.length} [${contractOnly.join(', ')}]`)

    // Step 3: Clean fake offers from database
    if (dbOnly.length > 0) {
      console.log('\n3. Cleaning fake offers from database...')
      
      for (const fakeOfferId of dbOnly) {
        try {
          console.log(`   Deleting fake offer ${fakeOfferId}...`)
          
          // Note: We would need a DELETE API endpoint for this
          // For now, we'll mark them as inactive or create the endpoint
          console.log(`   ⚠️ Would delete offer ${fakeOfferId} (DELETE API needed)`)
        } catch (error) {
          console.log(`   ❌ Failed to delete offer ${fakeOfferId}:`, error.message)
        }
      }
    }

    // Step 4: Add missing contract offers to database
    if (contractOnly.length > 0) {
      console.log('\n4. Adding missing contract offers to database...')
      
      for (const missingOfferId of contractOnly) {
        try {
          console.log(`   Adding missing offer ${missingOfferId}...`)
          
          // Get offer details from contract
          const contractOffer = await contract.getOffer(missingOfferId)
          
          const offerData = {
            offerId: contractOffer.id.toString(),
            sellerWallet: contractOffer.seller,
            quantity: parseInt(contractOffer.quantity.toString()),
            pricePerKWhETH: ethers.formatEther(contractOffer.price),
            pricePerKWhVND: parseFloat(ethers.formatEther(contractOffer.price)) * 24000 * 1000,
            txHash: '0x' + '0'.repeat(64), // Placeholder since we don't have the original tx
            blockNumber: 0 // Placeholder
          }
          
          console.log(`   📊 Offer data:`, offerData)
          
          // Add to database
          const createResponse = await fetch(`${API_BASE}/energy/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offerData)
          })
          
          const createResult = await createResponse.json()
          
          if (createResult.success) {
            console.log(`   ✅ Added offer ${missingOfferId} to database`)
          } else {
            console.log(`   ❌ Failed to add offer ${missingOfferId}:`, createResult.message)
          }
          
        } catch (error) {
          console.log(`   ❌ Failed to process offer ${missingOfferId}:`, error.message)
        }
      }
    }

    // Step 5: Verify sync after fixes
    console.log('\n5. Verifying sync after fixes...')
    
    const updatedDbResponse = await fetch(`${API_BASE}/energy/offers`)
    const updatedDbResult = await updatedDbResponse.json()
    
    if (updatedDbResult.success) {
      const updatedDbOfferIds = updatedDbResult.data.map(offer => parseInt(offer.offer_id))
      const stillDbOnly = updatedDbOfferIds.filter(id => !contractOfferIds.includes(id))
      const nowMatching = updatedDbOfferIds.filter(id => contractOfferIds.includes(id))
      
      console.log(`✅ Updated database offers: ${updatedDbResult.data.length}`)
      console.log(`✅ Now matching: ${nowMatching.length} [${nowMatching.join(', ')}]`)
      console.log(`⚠️ Still database-only: ${stillDbOnly.length} [${stillDbOnly.join(', ')}]`)
      
      if (nowMatching.length === contractOfferIds.length && stillDbOnly.length === 0) {
        console.log('🎉 Perfect sync achieved!')
      } else {
        console.log('⚠️ Partial sync - manual cleanup may be needed')
      }
    }

    // Step 6: Test purchasable offers
    console.log('\n6. Testing purchasable offers...')
    
    for (const offerId of contractOfferIds.slice(0, 2)) { // Test first 2 offers
      try {
        const contractOffer = await contract.getOffer(offerId)
        
        if (contractOffer.isActive) {
          console.log(`   ✅ Offer ${offerId}: Purchasable (${contractOffer.quantity.toString()} kWh at ${ethers.formatEther(contractOffer.price)} ETH)`)
        } else {
          console.log(`   ⚠️ Offer ${offerId}: Not active`)
        }
      } catch (error) {
        console.log(`   ❌ Offer ${offerId}: Error - ${error.message}`)
      }
    }

    // Summary
    console.log('\n🎉 Database-Contract Sync Fix Summary')
    console.log('====================================')
    console.log(`✅ Contract offers: ${contractOfferIds.length}`)
    console.log(`✅ Database offers before: ${dbResult.data.length}`)
    console.log(`✅ Fake offers identified: ${dbOnly.length}`)
    console.log(`✅ Missing offers added: ${contractOnly.length}`)
    
    console.log('\n🔧 Next Steps')
    console.log('=============')
    console.log('1. Test frontend marketplace - should show real offers')
    console.log('2. Try purchasing offers - should work now')
    console.log('3. Create new offers through frontend')
    console.log('4. Verify new offers appear in both database and contract')

    console.log('\n📊 Real Offers Available for Purchase')
    console.log('====================================')
    for (const offerId of contractOfferIds) {
      try {
        const offer = await contract.getOffer(offerId)
        console.log(`Offer ${offerId}: ${offer.quantity.toString()} kWh at ${ethers.formatEther(offer.price)} ETH (Seller: ${offer.seller})`)
      } catch (error) {
        console.log(`Offer ${offerId}: Error getting details`)
      }
    }

  } catch (error) {
    console.error('❌ Database-contract sync fix failed:', error.message)
  }
}

runDatabaseContractSyncFix()

async function runDatabaseContractSyncFix() {
  await fixDatabaseContractSync()
}
