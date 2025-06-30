#!/usr/bin/env node

console.log('🔍 Debug Database Recording Error')
console.log('=================================')

const API_BASE = 'http://localhost:3002/api/v1'

async function debugDatabaseRecordingError() {
  console.log('🔍 Debugging exact database recording error...\n')

  try {
    const testWallet = '0x742d35cc6634c0532925a3b8d4c9db96590c6c87'

    // Test 1: Check current energy balance
    console.log('1. Checking current energy balance...')
    const balanceResponse = await fetch(`${API_BASE}/energy/balance/${testWallet}`)
    const balanceResult = await balanceResponse.json()
    
    if (balanceResult.success) {
      console.log('✅ Current energy balance:')
      console.log(`   Total Generated: ${balanceResult.data.totalGenerated} kWh`)
      console.log(`   Available Balance: ${balanceResult.data.availableBalance} kWh`)
      console.log(`   Pending Offers: ${balanceResult.data.pendingOffers} kWh`)
      console.log(`   Max Can Sell: ${balanceResult.data.maxCanSell} kWh`)
    } else {
      console.log('❌ Failed to get energy balance:', balanceResult.message)
    }

    // Test 2: Test offer validation
    console.log('\n2. Testing offer validation...')
    const testQuantity = 15 // Small amount to ensure we have enough
    
    const validationResponse = await fetch(`${API_BASE}/energy/validate-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: testWallet,
        quantity: testQuantity
      })
    })
    
    const validationResult = await validationResponse.json()
    
    if (validationResult.success) {
      console.log('✅ Offer validation result:')
      console.log(`   Can Create Offer: ${validationResult.data.canCreateOffer}`)
      console.log(`   Available Balance: ${validationResult.data.availableBalance} kWh`)
      
      if (!validationResult.data.canCreateOffer) {
        console.log('⚠️ Cannot create offer - insufficient balance')
        return
      }
    } else {
      console.log('❌ Offer validation failed:', validationResult.message)
      return
    }

    // Test 3: Test offer creation with detailed error logging
    console.log('\n3. Testing offer creation with detailed error logging...')
    
    const uniqueOfferId = Date.now()
    const offerData = {
      offerId: uniqueOfferId,
      sellerWallet: testWallet,
      quantity: testQuantity,
      pricePerKWhETH: '0.001',
      pricePerKWhVND: 2400,
      txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      blockNumber: Math.floor(Math.random() * 1000000)
    }
    
    console.log('📊 Attempting to create offer:')
    console.log(JSON.stringify(offerData, null, 2))
    
    try {
      const response = await fetch(`${API_BASE}/energy/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      })
      
      console.log(`📊 Response status: ${response.status}`)
      console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log(`📊 Raw response:`, responseText)
      
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.log('❌ Failed to parse response as JSON:', parseError.message)
        return
      }
      
      if (response.ok && result.success) {
        console.log('✅ Offer creation SUCCESS!')
        console.log('📊 Created offer:', result.data)
      } else {
        console.log('❌ Offer creation FAILED!')
        console.log(`📊 Status: ${response.status}`)
        console.log(`📊 Success: ${result.success}`)
        console.log(`📊 Message: ${result.message}`)
        console.log(`📊 Error: ${result.error}`)
        
        if (result.details) {
          console.log(`📊 Details:`, result.details)
        }
        
        if (result.stack) {
          console.log(`📊 Stack trace:`, result.stack)
        }
      }
    } catch (requestError) {
      console.log('❌ Request failed:', requestError.message)
    }

    // Test 4: Test with minimal data to isolate issue
    console.log('\n4. Testing with minimal required data...')
    
    const minimalData = {
      offerId: Date.now() + 1,
      sellerWallet: testWallet,
      quantity: 10,
      pricePerKWhETH: 0.001,
      pricePerKWhVND: 2400,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }
    
    console.log('📊 Testing minimal data:')
    console.log(JSON.stringify(minimalData, null, 2))
    
    try {
      const minimalResponse = await fetch(`${API_BASE}/energy/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalData)
      })
      
      const minimalResult = await minimalResponse.json()
      
      if (minimalResponse.ok && minimalResult.success) {
        console.log('✅ Minimal data creation SUCCESS!')
      } else {
        console.log('❌ Minimal data creation FAILED!')
        console.log(`📊 Status: ${minimalResponse.status}`)
        console.log(`📊 Error: ${minimalResult.message}`)
      }
    } catch (error) {
      console.log('❌ Minimal data request failed:', error.message)
    }

    // Test 5: Check backend logs by testing health endpoint
    console.log('\n5. Checking backend health...')
    
    try {
      const healthResponse = await fetch(`${API_BASE}`)
      const healthResult = await healthResponse.json()
      
      if (healthResponse.ok) {
        console.log('✅ Backend is healthy')
        console.log(`📊 Service: ${healthResult.name}`)
        console.log(`📊 Version: ${healthResult.version}`)
      } else {
        console.log('❌ Backend health check failed')
      }
    } catch (error) {
      console.log('❌ Backend health check error:', error.message)
    }

    // Test 6: Check if user exists in database
    console.log('\n6. Checking if user exists in database...')
    
    try {
      // Try to get user info
      const userCheckUrl = `${API_BASE}/energy/balance/${testWallet}`
      const userResponse = await fetch(userCheckUrl)
      const userResult = await userResponse.json()
      
      if (userResult.success) {
        console.log('✅ User exists in database')
        console.log(`📊 User has energy balance data`)
      } else {
        console.log('⚠️ User may not exist in database')
        console.log(`📊 This could cause foreign key constraint errors`)
      }
    } catch (error) {
      console.log('❌ User check failed:', error.message)
    }

    // Test Summary
    console.log('\n🎯 Database Recording Error Debug Summary')
    console.log('=========================================')
    console.log('Check the detailed logs above to identify:')
    console.log('1. Exact error message from backend')
    console.log('2. HTTP status code')
    console.log('3. Stack trace if available')
    console.log('4. Whether validation passes')
    console.log('5. Whether user exists in database')
    console.log('6. Whether backend is healthy')

    console.log('\n🔧 Common Database Recording Issues')
    console.log('===================================')
    console.log('1. Insufficient energy balance → Check validation')
    console.log('2. User not found → Foreign key constraint error')
    console.log('3. Invalid data format → Schema validation error')
    console.log('4. Database connection → Backend health issue')
    console.log('5. Unique constraint → Duplicate offer ID')
    console.log('6. RLS policies → Row level security blocking')

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  }
}

runDatabaseRecordingErrorDebug()

async function runDatabaseRecordingErrorDebug() {
  await debugDatabaseRecordingError()
}
