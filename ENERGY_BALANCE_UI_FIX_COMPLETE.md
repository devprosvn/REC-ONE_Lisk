# 🔧 Energy Balance UI Fix - Complete Solution

## 🐛 **Problem Identified**

User đã generate 120 kWh nhưng UI vẫn hiển thị 0 kWh và không thể bán energy do:

1. **Energy balance không được load từ backend**
2. **Thiếu refresh button để manual reload balance**
3. **Database RLS policies chặn operations**
4. **Backend .env configuration issues**

## ✅ **Solutions Implemented**

### **1. Added Refresh Balance Button**

#### **HTML Enhancement:**
```html
<!-- Energy Balance Header with Refresh Button -->
<div class="energy-balance-header">
  <h4>Your Energy Balance</h4>
  <button id="refresh-balance" class="btn btn-small">🔄 Refresh Balance</button>
</div>

<div class="energy-balance-info">
  <div class="balance-item">
    <span class="label">Total Generated:</span>
    <span id="total-generated" class="value">0 kWh</span>
  </div>
  <div class="balance-item highlight">
    <span class="label">Available to Sell:</span>
    <span id="max-can-sell" class="value">0 kWh</span>
  </div>
  <!-- ... other balance items ... -->
</div>
```

#### **CSS Styling:**
```css
.energy-balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.energy-balance-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}
```

### **2. Enhanced JavaScript Functions**

#### **Manual Refresh Balance Function:**
```javascript
async function refreshBalance() {
  console.log('🔄 Manual balance refresh triggered')
  if (!userAddress) {
    showStatus('Please connect your wallet first', 'warning')
    return
  }

  try {
    // Show loading state
    if (refreshBalanceBtn) {
      refreshBalanceBtn.textContent = '🔄 Refreshing...'
      refreshBalanceBtn.disabled = true
    }

    // Update energy balance from backend
    await updateEnergyBalance()
    
    // Also update contract balance
    await updateBalances()
    
    showStatus('✅ Energy balance refreshed successfully!', 'success')
  } catch (error) {
    console.error('❌ Balance refresh failed:', error)
    showStatus('❌ Failed to refresh balance. Please try again.', 'error')
  } finally {
    // Restore button state
    if (refreshBalanceBtn) {
      refreshBalanceBtn.textContent = '🔄 Refresh Balance'
      refreshBalanceBtn.disabled = false
    }
  }
}
```

#### **Enhanced updateEnergyBalance Function:**
```javascript
async function updateEnergyBalance() {
  if (!userAddress) {
    console.warn('No user address available for balance update')
    return
  }

  try {
    console.log('📊 Fetching energy balance for:', userAddress)
    const response = await apiClient.getUserEnergyBalance(userAddress)
    
    if (response.success) {
      userEnergyBalance = response.data
      console.log('✅ Energy balance received:', userEnergyBalance)
      
      // Update UI elements with visual feedback
      if (totalGeneratedSpan) {
        totalGeneratedSpan.textContent = `${userEnergyBalance.totalGenerated} kWh`
        totalGeneratedSpan.style.color = userEnergyBalance.totalGenerated > 0 ? '#28a745' : '#666'
      }
      if (maxCanSellSpan) {
        maxCanSellSpan.textContent = `${userEnergyBalance.maxCanSell} kWh`
        maxCanSellSpan.style.color = userEnergyBalance.maxCanSell > 0 ? '#1976d2' : '#666'
      }
      // ... update other UI elements ...
      
      console.log('✅ Energy balance UI updated successfully')
    } else {
      console.warn('❌ Failed to get energy balance:', response.message)
      showStatus(`Failed to load energy balance: ${response.message}`, 'warning')
    }
  } catch (error) {
    console.error('❌ Error updating energy balance:', error)
    showStatus('Failed to connect to backend. Please check your connection.', 'error')
  }
}
```

### **3. Auto-Refresh Integration**

#### **After Energy Generation:**
```javascript
// In generateEnergy function
energyAmountInput.value = ''

// Update both contract and backend balances
await updateBalances()

// Force refresh energy balance from backend
console.log('🔄 Force refreshing energy balance after generation...')
await updateEnergyBalance()

showStatus(`✅ Successfully generated ${quantity} kWh of energy! Balance updated.`, 'success')
```

#### **On Wallet Connection:**
```javascript
// Enhanced wallet connection to include energy balance
Promise.all([
  ensureCorrectNetwork(),
  initializeContract(),
  updateBalances(),
  updateEnergyBalance(),  // Added this
  loadOffers()
]).then(() => {
  console.log('✅ All wallet setup completed')
  startOffersAutoRefresh()
})
```

### **4. Event Listener Setup**
```javascript
// Added refresh balance button listener
refreshBalanceBtn.addEventListener('click', refreshBalance)
```

## 🔧 **Critical Fixes Still Needed**

### **1. Database RLS Policies**
**Status**: ⚠️ **MUST BE FIXED**

**Problem**: Row Level Security chặn database operations
```
❌ new row violates row-level security policy for table "users"
❌ new row violates row-level security policy for table "energy_generation"
```

**Solution**: Run SQL script trong Supabase SQL Editor
```sql
-- Go to: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek/sql
-- Run: backend/fix-rls-policies.sql

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE energy_generation DISABLE ROW LEVEL SECURITY;
ALTER TABLE energy_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
```

### **2. Backend Environment Configuration**
**Status**: ⚠️ **NEEDS VERIFICATION**

**Check**: Verify `.env` file trong backend folder
```env
# backend/.env
SUPABASE_URL=https://jzzljxhqrbxeiqozptek.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3002
NODE_ENV=development
```

## 🎯 **Testing Instructions**

### **Step 1: Fix Database Issues**
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek/sql
2. Run: `backend/fix-rls-policies.sql`
3. Verify no errors in execution

### **Step 2: Verify Backend Configuration**
```bash
cd backend
# Check if .env file exists and has correct values
cat .env

# Restart backend server
npm run dev
```

### **Step 3: Test Energy Generation**
```bash
# Test backend API
node test-energy-balance-ui-fix.js

# Expected result:
# ✅ Energy generation recorded successfully!
# ✅ Energy balance shows updated values
```

### **Step 4: Test Frontend UI**
1. Open: http://localhost:5173
2. Connect MetaMask wallet
3. Check if balance loads from backend
4. Click "🔄 Refresh Balance" button
5. Generate energy and verify auto-update
6. Try creating offers with updated balance

## 📊 **Expected Behavior After Fix**

### **✅ UI Features Working:**
- **Refresh Balance Button**: Manual refresh energy balance
- **Auto-Update**: Balance updates after energy generation
- **Visual Feedback**: Colors change based on balance values
- **Real-time Validation**: Offer creation respects available balance
- **Error Handling**: Clear error messages for connection issues

### **✅ Data Flow:**
```
1. User connects wallet → Load balance from backend
2. User generates energy → Auto-refresh balance
3. User clicks refresh → Manual balance update
4. User creates offer → Validate against current balance
5. Balance changes → UI updates with visual feedback
```

### **✅ API Integration:**
```
GET /api/v1/energy/balance/:wallet → Returns current balance
POST /api/v1/energy/generation → Records generation + updates balance
POST /api/v1/energy/validate-offer → Validates against available balance
```

## 🚨 **Troubleshooting Guide**

### **Issue 1: Balance still shows 0**
**Solutions:**
1. Check browser console for errors
2. Verify backend running on port 3002
3. Check Supabase database for records
4. Try manual refresh button
5. Disconnect and reconnect wallet

### **Issue 2: "Database error" on generation**
**Solutions:**
1. Run RLS fix SQL script in Supabase
2. Check backend .env configuration
3. Verify Supabase credentials
4. Restart backend server

### **Issue 3: Refresh button not working**
**Solutions:**
1. Check browser console for JavaScript errors
2. Verify API endpoints are accessible
3. Check network connectivity
4. Try hard refresh (Ctrl+F5)

### **Issue 4: Balance not updating after generation**
**Solutions:**
1. Check if energy generation API call succeeds
2. Verify updateEnergyBalance function is called
3. Check backend logs for errors
4. Try manual refresh button

## 🎉 **Success Indicators**

### **✅ Backend Working:**
- Energy balance API returns correct data
- Energy generation API succeeds
- Database functions execute without RLS errors
- User stats update correctly

### **✅ Frontend Working:**
- Refresh balance button appears and works
- Energy balance displays correct values from backend
- Balance auto-updates after energy generation
- Offer validation uses correct balance limits
- Visual feedback shows when balance > 0

### **✅ User Experience:**
- Can see actual generated energy amount
- Can create offers up to available balance
- Gets immediate feedback on balance changes
- Can manually refresh if needed
- Clear error messages when issues occur

## 🔮 **Next Steps**

1. **Fix Database Issues**: Run RLS SQL script
2. **Test Complete Flow**: Generate → Refresh → Create Offer
3. **Verify Data Persistence**: Check Supabase dashboard
4. **Performance Optimization**: Add caching for balance data
5. **Error Recovery**: Add retry mechanisms for failed API calls

---

**🎯 After implementing these fixes, users should be able to see their actual energy balance (120 kWh) and create offers successfully!**
