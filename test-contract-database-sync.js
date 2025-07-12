#!/usr/bin/env node

console.log('🧪 Testing Contract-Database Sync')
console.log('=================================')

const { ethers } = require('ethers')

const API_BASE = 'http://localhost:3002/api/v1'
const RPC_URL = 'https://rpc.sepolia-api.lisk.com'
const CONTRACT_ADDRESS = '0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7'

// Contract ABI (correct based on documentation)
const CONTRACT_ABI = [
  "function getActiveOffers() external view returns (uint256[])",
  "function getOffer(uint256 _offerId) external view returns (tuple(uint256 id, address seller, uint256 quantity, uint256 price, bool isActive, uint256 timestamp))",
  "function getTotalOffers() external view returns (uint256)",
  "function getActiveOffersCount() external view returns (uint256)"
]

async function testContractDatabaseSync() {
  console.log('🔗 Testing contract and database synchronization...\n')

  let dbResult, activeOfferIds, contractOffers

  try {
    // Test 1: Get offers from database
    console.log('1. Getting offers from database...')
    const dbResponse = await fetch(`${API_BASE}/energy/offers`)
    dbResult = await dbResponse.json()
    
    if (dbResult.success) {
      console.log(`✅ Database offers: ${dbResult.data.length}`)
      console.log('📊 Database offers:')
      dbResult.data.forEach((offer, index) => {
        console.log(`   ${index + 1}. ID: ${offer.offer_id}, Quantity: ${offer.quantity} kWh, Status: ${offer.status}`)
      })
    } else {
      console.log('❌ Failed to get database offers:', dbResult.message)
      return
    }

    // Test 2: Get offers from blockchain contract
    console.log('\n2. Getting offers from blockchain contract...')
    
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      
      // Get offer count
      const totalOffers = await contract.getTotalOffers()
      const activeOffersCount = await contract.getActiveOffersCount()
      console.log(`✅ Contract total offers: ${totalOffers.toString()}`)
      console.log(`✅ Contract active offers count: ${activeOffersCount.toString()}`)

      // Get active offer IDs
      activeOfferIds = await contract.getActiveOffers()
      console.log(`✅ Contract active offer IDs: [${activeOfferIds.map(id => id.toString()).join(', ')}]`)

      // Get details for each active offer
      contractOffers = []
      for (const offerId of activeOfferIds) {
        try {
          const offer = await contract.getOffer(offerId)
          contractOffers.push({
            id: offer.id,
            seller: offer.seller,
            quantity: offer.quantity,
            price: offer.price,
            isActive: offer.isActive,
            timestamp: offer.timestamp
          })
        } catch (error) {
          console.log(`   ⚠️ Failed to get offer ${offerId}: ${error.message}`)
        }
      }

      console.log('📊 Contract offers details:')
      contractOffers.forEach((offer, index) => {
        console.log(`   ${index + 1}. ID: ${offer.id.toString()}, Seller: ${offer.seller}, Quantity: ${offer.quantity.toString()}, Price: ${ethers.formatEther(offer.price)} ETH, Active: ${offer.isActive}`)
      })
      
    } catch (contractError) {
      console.log('❌ Failed to get contract offers:', contractError.message)
      return
    }

    // Test 3: Compare database vs contract offers
    console.log('\n3. Comparing database vs contract offers...')

    const dbOfferIds = dbResult.data.map(offer => parseInt(offer.offer_id))
    const contractOfferIds = activeOfferIds.map(id => parseInt(id.toString()))
    
    console.log('📊 Comparison:')
    console.log(`   Database offer IDs: [${dbOfferIds.join(', ')}]`)
    console.log(`   Contract offer IDs: [${contractOfferIds.join(', ')}]`)
    
    // Find mismatches
    const dbOnly = dbOfferIds.filter(id => !contractOfferIds.includes(id))
    const contractOnly = contractOfferIds.filter(id => !dbOfferIds.includes(id))
    const matching = dbOfferIds.filter(id => contractOfferIds.includes(id))
    
    console.log(`\n📊 Sync Analysis:`)
    console.log(`   ✅ Matching offers: ${matching.length} [${matching.join(', ')}]`)
    console.log(`   ⚠️ Database only: ${dbOnly.length} [${dbOnly.join(', ')}]`)
    console.log(`   ⚠️ Contract only: ${contractOnly.length} [${contractOnly.join(', ')}]`)
    
    if (dbOnly.length > 0) {
      console.log('\n🚨 PROBLEM IDENTIFIED:')
      console.log('   Database contains offers that don\'t exist on blockchain!')
      console.log('   These offers cannot be purchased because contract doesn\'t know about them.')
      console.log('   This happens when:')
      console.log('   - Test data was inserted directly into database')
      console.log('   - Offers were created but transaction failed')
      console.log('   - Database and contract are out of sync')
    }

    // Test 4: Test specific offer existence on contract
    console.log('\n4. Testing specific offer existence on contract...')
    
    for (const dbOffer of dbResult.data.slice(0, 3)) { // Test first 3 offers
      try {
        const contractOffer = await contract.getOffer(dbOffer.offer_id)
        
        if (contractOffer.active) {
          console.log(`   ✅ Offer ${dbOffer.offer_id}: Exists on contract`)
        } else {
          console.log(`   ⚠️ Offer ${dbOffer.offer_id}: Exists but inactive on contract`)
        }
      } catch (error) {
        console.log(`   ❌ Offer ${dbOffer.offer_id}: Does NOT exist on contract`)
      }
    }

    // Test 5: Recommend solutions
    console.log('\n5. Recommended solutions...')
    
    if (dbOnly.length > 0) {
      console.log('🔧 Solutions for database-only offers:')
      console.log('   Option 1: Delete test offers from database')
      console.log('   Option 2: Create real offers through frontend')
      console.log('   Option 3: Mark database-only offers as "test" status')
      console.log('   Option 4: Filter out non-contract offers in frontend')
    }
    
    if (contractOnly.length > 0) {
      console.log('🔧 Solutions for contract-only offers:')
      console.log('   Option 1: Record missing offers in database')
      console.log('   Option 2: Sync contract events to database')
    }
    
    if (matching.length > 0) {
      console.log(`✅ ${matching.length} offers are properly synced and can be purchased`)
    }

    // Test Summary
    console.log('\n🎉 Contract-Database Sync Test Summary')
    console.log('=====================================')
    console.log(`✅ Database offers: ${dbResult.data.length}`)
    console.log(`✅ Contract offers: ${activeOfferIds.length}`)
    console.log(`✅ Synced offers: ${matching.length}`)
    console.log(`⚠️ Database-only offers: ${dbOnly.length}`)
    console.log(`⚠️ Contract-only offers: ${contractOnly.length}`)

    if (dbOnly.length === 0 && contractOnly.length === 0) {
      console.log('🎉 Perfect sync! All offers can be purchased.')
    } else {
      console.log('⚠️ Sync issues detected. Some offers may not be purchasable.')
    }

    console.log('\n🔧 Next Steps')
    console.log('=============')
    console.log('1. Clean up test data in database')
    console.log('2. Create real offers through frontend')
    console.log('3. Verify offers exist on both database and contract')
    console.log('4. Test purchase functionality with synced offers')

  } catch (error) {
    console.error('❌ Contract-database sync test failed:', error.message)
  }
}

runContractDatabaseSyncTest()

async function runContractDatabaseSyncTest() {
  await testContractDatabaseSync()
}
