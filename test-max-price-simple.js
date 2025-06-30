#!/usr/bin/env node

console.log('🧪 Testing Max Price Validation')
console.log('===============================')

const API_BASE = 'http://localhost:3002/api/v1'

async function testMaxPrice() {
  try {
    const testWallet = '0x742d35cc6634c0532925a3b8d4c9db96590c6c87'

    // Test 1.0 ETH price
    console.log('Testing 1.0 ETH/kWh price...')
    
    const testData = {
      offerId: Date.now(),
      sellerWallet: testWallet,
      quantity: 10,
      pricePerKWhETH: 1.0,
      pricePerKWhVND: 2400,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }

    const response = await fetch(`${API_BASE}/energy/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })

    const result = await response.json()

    console.log(`Status: ${response.status}`)
    console.log(`Success: ${result.success}`)
    console.log(`Message: ${result.message}`)

    if (response.ok && result.success) {
      console.log('✅ 1.0 ETH/kWh price accepted')
    } else {
      console.log('❌ 1.0 ETH/kWh price rejected')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testMaxPrice()
