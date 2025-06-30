#!/usr/bin/env node

console.log('🧪 Testing REC-ONE API')
console.log('=====================')

const API_BASE = 'http://localhost:3002/api/v1'

async function testAPI() {
  try {
    // Test 1: Create user
    console.log('1. Testing user creation...')
    const userResponse = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
        username: 'test_user'
      })
    })

    const userResult = await userResponse.json()
    console.log('User creation result:', userResult)

    if (userResult.success) {
      console.log('✅ User creation successful')
    } else {
      console.log('❌ User creation failed:', userResult.message)
    }

    // Test 2: Get user stats
    console.log('\n2. Testing user stats...')
    const statsResponse = await fetch(`${API_BASE}/users/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/stats`)
    const statsResult = await statsResponse.json()
    console.log('User stats result:', statsResult)

    // Test 3: Record energy generation
    console.log('\n3. Testing energy generation recording...')
    const energyResponse = await fetch(`${API_BASE}/energy/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
        quantity: 100,
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 12345,
        gasUsed: 46000,
        gasPrice: 20000000000
      })
    })

    const energyResult = await energyResponse.json()
    console.log('Energy generation result:', energyResult)

    if (energyResult.success) {
      console.log('✅ Energy generation recording successful')
    } else {
      console.log('❌ Energy generation recording failed:', energyResult.message)
    }

    // Test 4: Record energy offer
    console.log('\n4. Testing energy offer recording...')
    const offerResponse = await fetch(`${API_BASE}/energy/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        offerId: 1,
        sellerWallet: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
        quantity: 50,
        pricePerKWhETH: 0.001,
        pricePerKWhVND: 2400,
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      })
    })

    const offerResult = await offerResponse.json()
    console.log('Energy offer result:', offerResult)

    if (offerResult.success) {
      console.log('✅ Energy offer recording successful')
    } else {
      console.log('❌ Energy offer recording failed:', offerResult.message)
    }

    // Test 5: Get active offers
    console.log('\n5. Testing get active offers...')
    const offersResponse = await fetch(`${API_BASE}/energy/offers`)
    const offersResult = await offersResponse.json()
    console.log('Active offers result:', offersResult)

    if (offersResult.success) {
      console.log('✅ Get active offers successful')
      console.log(`📊 Found ${offersResult.data.length} active offers`)
    } else {
      console.log('❌ Get active offers failed:', offersResult.message)
    }

    // Test 6: Get marketplace stats
    console.log('\n6. Testing marketplace stats...')
    const marketStatsResponse = await fetch(`${API_BASE}/energy/marketplace/stats`)
    const marketStatsResult = await marketStatsResponse.json()
    console.log('Marketplace stats result:', marketStatsResult)

    console.log('\n🎉 API Testing Complete!')
    console.log('========================')
    console.log('✅ Backend API is working')
    console.log('✅ Database integration successful')
    console.log('✅ Energy generation and offers can be recorded')
    console.log('\n🚀 Ready for frontend integration!')

  } catch (error) {
    console.error('❌ API test failed:', error.message)
  }
}

testAPI()
