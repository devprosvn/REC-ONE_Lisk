/**
 * Test Supabase Connection
 * Simple test to verify Supabase client is working
 */

import { supabase } from './supabase-client.js'

class SupabaseTest {
  constructor() {
    this.runTests()
  }

  async runTests() {
    console.log('🧪 Testing Supabase Connection...')
    
    // Test 1: Basic connection
    await this.testConnection()
    
    // Test 2: Auth functionality
    await this.testAuth()
    
    // Test 3: Database access
    await this.testDatabase()
  }

  async testConnection() {
    try {
      console.log('1. Testing basic connection...')
      
      // Simple query to test connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('❌ Connection test failed:', error.message)
        this.showTestResult('connection', false, error.message)
      } else {
        console.log('✅ Connection test passed')
        this.showTestResult('connection', true, 'Connected successfully')
      }
    } catch (error) {
      console.error('❌ Connection test error:', error)
      this.showTestResult('connection', false, error.message)
    }
  }

  async testAuth() {
    try {
      console.log('2. Testing auth functionality...')
      
      // Test getting current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Auth test failed:', error.message)
        this.showTestResult('auth', false, error.message)
      } else {
        console.log('✅ Auth test passed')
        this.showTestResult('auth', true, session ? 'User logged in' : 'No active session')
      }
    } catch (error) {
      console.error('❌ Auth test error:', error)
      this.showTestResult('auth', false, error.message)
    }
  }

  async testDatabase() {
    try {
      console.log('3. Testing database access...')
      
      // Test if profiles table exists
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      if (error) {
        if (error.message.includes('relation "profiles" does not exist')) {
          console.warn('⚠️ Profiles table does not exist - need to run schema setup')
          this.showTestResult('database', false, 'Profiles table missing - run schema setup')
        } else {
          console.error('❌ Database test failed:', error.message)
          this.showTestResult('database', false, error.message)
        }
      } else {
        console.log('✅ Database test passed')
        this.showTestResult('database', true, 'Profiles table accessible')
      }
    } catch (error) {
      console.error('❌ Database test error:', error)
      this.showTestResult('database', false, error.message)
    }
  }

  showTestResult(testName: string, success: boolean, message: string) {
    // Create or update test results display
    let testResults = document.getElementById('supabase-test-results')
    
    if (!testResults) {
      testResults = document.createElement('div')
      testResults.id = 'supabase-test-results'
      testResults.innerHTML = `
        <div style="
          position: fixed;
          top: 60px;
          left: 20px;
          background: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 998;
          min-width: 300px;
          max-width: 400px;
        ">
          <h4 style="margin: 0 0 10px 0; color: #1976d2;">🧪 Supabase Tests</h4>
          <div id="test-results-list"></div>
          <button onclick="this.closest('div').remove()" style="
            margin-top: 10px;
            padding: 5px 10px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Close</button>
        </div>
      `
      document.body.appendChild(testResults)
    }

    const resultsList = document.getElementById('test-results-list')
    if (resultsList) {
      const resultItem = document.createElement('div')
      resultItem.style.cssText = `
        padding: 8px;
        margin-bottom: 5px;
        border-radius: 4px;
        font-size: 13px;
        background: ${success ? '#e8f5e8' : '#ffeaea'};
        border-left: 3px solid ${success ? '#4CAF50' : '#f44336'};
      `
      
      resultItem.innerHTML = `
        <div style="font-weight: bold; color: ${success ? '#2e7d32' : '#c62828'};">
          ${success ? '✅' : '❌'} ${testName.charAt(0).toUpperCase() + testName.slice(1)} Test
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 2px;">
          ${message}
        </div>
      `
      
      resultsList.appendChild(resultItem)
    }
  }
}

// Auto-run tests when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for other scripts to load
  setTimeout(() => {
    new SupabaseTest()
  }, 2000)
})

export default SupabaseTest
