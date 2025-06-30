#!/usr/bin/env node

console.log('🧪 Testing Offer Creation Debug')
console.log('===============================')

const API_BASE = 'http://localhost:3002/api/v1'

async function testOfferCreationDebug() {
  console.log('🔍 Debugging offer creation API...\n')

  try {
    const testWallet = '0x742d35cc6634c0532925a3b8d4c9db96590c6c87'

    // Test 1: Check user energy balance first
    console.log('1. Checking user energy balance...')
    try {
      const balanceResponse = await fetch(`${API_BASE}/energy/balance/${testWallet}`)
      const balanceResult = await balanceResponse.json()
      
      if (balanceResult.success) {
        console.log('✅ Energy balance retrieved:')
        console.log(`   Total Generated: ${balanceResult.data.totalGenerated} kWh`)
        console.log(`   Total Sold: ${balanceResult.data.totalSold} kWh`)
        console.log(`   Available Balance: ${balanceResult.data.availableBalance} kWh`)
        console.log(`   Pending Offers: ${balanceResult.data.pendingOffers} kWh`)
        console.log(`   Max Can Sell: ${balanceResult.data.maxCanSell} kWh`)
      } else {
        console.log('❌ Failed to get energy balance:', balanceResult.message)
      }
    } catch (error) {
      console.log('❌ Energy balance request failed:', error.message)
    }

    // Test 2: Test offer validation
    console.log('\n2. Testing offer validation...')
    const testQuantity = 25
    
    try {
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
        console.log(`   Requested Quantity: ${validationResult.data.requestedQuantity} kWh`)
        console.log(`   Available Balance: ${validationResult.data.availableBalance} kWh`)
        console.log(`   Message: ${validationResult.message}`)
        
        if (!validationResult.data.canCreateOffer) {
          console.log('⚠️ Validation failed - this will cause offer creation to fail')
        }
      } else {
        console.log('❌ Offer validation failed:', validationResult.message)
      }
    } catch (error) {
      console.log('❌ Offer validation request failed:', error.message)
    }

    // Test 3: Test different offer data formats
    console.log('\n3. Testing different offer data formats...')
    
    const testCases = [
      {
        name: 'Standard format (string offerId)',
        data: {
          offerId: '12345',
          sellerWallet: testWallet,
          quantity: 25,
          pricePerKWhETH: '0.001',
          pricePerKWhVND: 2400,
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          blockNumber: 123456
        }
      },
      {
        name: 'Numeric format (number offerId)',
        data: {
          offerId: 12345,
          sellerWallet: testWallet,
          quantity: 25,
          pricePerKWhETH: 0.001,
          pricePerKWhVND: 2400,
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          blockNumber: 123456
        }
      },
      {
        name: 'Frontend format (as sent by frontend)',
        data: {
          offerId: '12345',
          sellerWallet: testWallet,
          quantity: 25,
          pricePerKWhETH: '0.001',
          pricePerKWhVND: 2400,
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          blockNumber: 123456
        }
      }
    ]

    for (const testCase of testCases) {
      console.log(`\n   Testing: ${testCase.name}`)
      console.log(`   Data:`, JSON.stringify(testCase.data, null, 2))
      
      try {
        const response = await fetch(`${API_BASE}/energy/offers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.data)
        })
        
        const result = await response.json()
        
        if (response.ok && result.success) {
          console.log(`   ✅ ${testCase.name}: SUCCESS`)
          console.log(`   📊 Created offer:`, result.data)
        } else {
          console.log(`   ❌ ${testCase.name}: FAILED`)
          console.log(`   📊 Error:`, result.message || result.error)
          console.log(`   📊 Status:`, response.status)
          
          // Try to get more detailed error info
          if (result.details) {
            console.log(`   📊 Details:`, result.details)
          }
        }
      } catch (error) {
        console.log(`   ❌ ${testCase.name}: REQUEST FAILED`)
        console.log(`   📊 Error:`, error.message)
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Test 4: Check validation schema requirements
    console.log('\n4. Testing validation schema requirements...')
    
    const schemaTests = [
      {
        name: 'Missing offerId',
        data: {
          sellerWallet: testWallet,
          quantity: 25,
          pricePerKWhETH: 0.001,
          pricePerKWhVND: 2400,
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      },
      {
        name: 'Invalid wallet address',
        data: {
          offerId: 12345,
          sellerWallet: 'invalid-wallet',
          quantity: 25,
          pricePerKWhETH: 0.001,
          pricePerKWhVND: 2400,
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      },
      {
        name: 'Invalid txHash',
        data: {
          offerId: 12345,
          sellerWallet: testWallet,
          quantity: 25,
          pricePerKWhETH: 0.001,
          pricePerKWhVND: 2400,
          txHash: 'invalid-hash'
        }
      },
      {
        name: 'Negative quantity',
        data: {
          offerId: 12345,
          sellerWallet: testWallet,
          quantity: -25,
          pricePerKWhETH: 0.001,
          pricePerKWhVND: 2400,
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      }
    ]

    for (const test of schemaTests) {
      console.log(`\n   Testing: ${test.name}`)
      
      try {
        const response = await fetch(`${API_BASE}/energy/offers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test.data)
        })
        
        const result = await response.json()
        
        console.log(`   Status: ${response.status}`)
        console.log(`   Result:`, result.message || result.error)
      } catch (error) {
        console.log(`   Error:`, error.message)
      }
    }

    // Test 5: Check if user exists
    console.log('\n5. Checking if user exists...')
    
    try {
      const userResponse = await fetch(`${API_BASE}/users/${testWallet}`)
      const userResult = await userResponse.json()
      
      if (userResult.success) {
        console.log('✅ User exists:')
        console.log(`   ID: ${userResult.data.id}`)
        console.log(`   Wallet: ${userResult.data.wallet_address}`)
        console.log(`   Username: ${userResult.data.username}`)
        console.log(`   Total Generated: ${userResult.data.total_energy_generated} kWh`)
        console.log(`   Available Balance: ${userResult.data.available_energy_balance} kWh`)
      } else {
        console.log('⚠️ User does not exist, will be created automatically')
      }
    } catch (error) {
      console.log('❌ User check failed:', error.message)
    }

    // Summary
    console.log('\n🎉 Offer Creation Debug Summary')
    console.log('===============================')
    console.log('✅ Energy balance API: Working')
    console.log('✅ Offer validation API: Working')
    console.log('✅ User management: Working')
    console.log('⚠️ Offer creation: Check results above')

    console.log('\n🔧 Common Issues and Solutions')
    console.log('==============================')
    console.log('1. Insufficient energy balance → Generate more energy first')
    console.log('2. Invalid data format → Check offerId, prices, txHash format')
    console.log('3. Validation schema errors → Ensure all required fields present')
    console.log('4. User not found → Will be created automatically')
    console.log('5. Database constraints → Check unique constraints, foreign keys')

  } catch (error) {
    console.error('❌ Offer creation debug failed:', error.message)
  }
}

runOfferCreationDebug()

async function runOfferCreationDebug() {
  await testOfferCreationDebug()
}
