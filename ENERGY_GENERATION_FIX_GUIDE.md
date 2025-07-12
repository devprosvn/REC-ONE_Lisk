# 🔧 Energy Generation Fix Guide

## 🐛 **Problem Identified**

Energy generation không được ghi nhận vào database do các vấn đề sau:

1. **Missing Supabase Dependencies** - Chưa cài đặt `@supabase/supabase-js`
2. **Row Level Security (RLS)** - Supabase RLS policies chặn database operations
3. **Outdated UserService** - Function `updateUserEnergyStats` chưa sử dụng database functions mới
4. **Backend Routes Not Loaded** - New API endpoints chưa được load

## ✅ **Solutions Implemented**

### **1. Installed Supabase Dependencies**
```bash
# Backend
cd backend
npm install @supabase/supabase-js

# Frontend  
cd frontend
npm install @supabase/supabase-js
```

### **2. Fixed UserService to Use Database Functions**
```javascript
// OLD: Manual SQL updates
static async updateUserEnergyStats(walletAddress, type, quantity, amount_vnd = 0) {
  const updates = { updated_at: new Date().toISOString() }
  switch (type) {
    case 'generated':
      updates.total_energy_generated = supabase.rpc('increment', { ... })
      // Complex manual updates
  }
}

// NEW: Use database function
static async updateUserEnergyStats(walletAddress, type, quantity, amount_vnd = 0) {
  console.log(`📊 Updating user energy stats: ${walletAddress}, ${type}, ${quantity}`)
  
  const { data, error } = await supabase.rpc('update_user_energy_stats', {
    user_wallet: walletAddress.toLowerCase(),
    stat_type: type,
    quantity_val: parseFloat(quantity),
    earnings_val: parseFloat(amount_vnd)
  })

  if (error) {
    console.error('Database function error:', error)
    throw error
  }

  console.log('✅ User energy stats updated successfully')
  return data
}
```

### **3. Enhanced Energy Generation Validation**
```javascript
// Fixed validation schema to accept string or number for gasUsed/gasPrice
const energyGenerationSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  quantity: Joi.number().positive().required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  blockNumber: Joi.number().integer().positive().optional(),
  gasUsed: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).optional(),
  gasPrice: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).optional()
})
```

### **4. Fixed Row Level Security (RLS)**

#### **Problem:**
```
❌ new row violates row-level security policy for table "users"
❌ new row violates row-level security policy for table "energy_generation"
```

#### **Solution:**
```sql
-- Disable RLS for development (run in Supabase SQL Editor)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE energy_generation DISABLE ROW LEVEL SECURITY;
ALTER TABLE energy_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
```

## 🔧 **Manual Steps Required**

### **Step 1: Run SQL Fixes in Supabase**
1. Go to: https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek/sql
2. Run: `backend/fix-rls-policies.sql`
3. Verify no errors in execution

### **Step 2: Restart Backend Server**
```bash
cd backend
npm run dev
```

### **Step 3: Test Energy Generation**
```bash
# Test API endpoints
node test-energy-generation-fix.js

# Expected output:
# ✅ Energy generation recorded successfully!
# ✅ Energy balance retrieved successfully!
# ✅ Offer validation working!
```

### **Step 4: Test in Frontend**
1. Open: http://localhost:5173
2. Connect MetaMask wallet
3. Click "Generate Energy"
4. Check if balance updates in UI
5. Verify data in Supabase dashboard

## 📊 **Database Schema Verification**

### **Required Tables:**
- ✅ `users` - with `available_energy_balance` column
- ✅ `energy_generation` - for generation records
- ✅ `energy_offers` - for marketplace offers

### **Required Functions:**
- ✅ `update_user_energy_stats(user_wallet, stat_type, quantity_val, earnings_val)`
- ✅ `get_available_energy_balance(user_wallet)`
- ✅ `validate_energy_offer(user_wallet, offer_quantity)`

### **RLS Status:**
- ✅ All tables should have RLS **DISABLED** for development
- 🔄 Enable RLS with proper policies for production

## 🎯 **Expected Behavior After Fix**

### **Energy Generation Flow:**
```
1. User clicks "Generate Energy" in frontend
2. Smart contract transaction executes
3. Frontend calls API: POST /api/v1/energy/generation
4. Backend validates input
5. EnergyService.recordEnergyGeneration() called
6. Record inserted into energy_generation table
7. UserService.updateUserEnergyStats() called
8. Database function update_user_energy_stats() executed
9. User stats updated:
   - total_energy_generated += quantity
   - available_energy_balance += quantity
10. Frontend updates UI with new balance
```

### **API Responses:**
```javascript
// Energy Generation
POST /api/v1/energy/generation
{
  "success": true,
  "message": "Energy generation recorded successfully",
  "data": { generation_record }
}

// Energy Balance
GET /api/v1/energy/balance/:walletAddress
{
  "success": true,
  "data": {
    "totalGenerated": 150,
    "totalSold": 0,
    "availableBalance": 150,
    "pendingOffers": 0,
    "maxCanSell": 150
  },
  "message": "Available energy: 150 kWh (Generated: 150, Sold: 0, Pending: 0)"
}
```

## 🧪 **Testing Checklist**

### **Backend Tests:**
- [ ] `node test-database-connection.js` - Database functions working
- [ ] `node test-energy-generation-fix.js` - API endpoints working
- [ ] Check Supabase dashboard for new records

### **Frontend Tests:**
- [ ] Connect wallet successfully
- [ ] Generate energy → Balance increases
- [ ] UI shows updated energy balance
- [ ] Available to sell increases
- [ ] Can create offers up to available balance
- [ ] Real-time validation works

### **Database Verification:**
- [ ] Check `energy_generation` table for new records
- [ ] Check `users` table for updated balances
- [ ] Verify `available_energy_balance` column exists
- [ ] Test database functions manually

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Route not found"**
**Solution:** Restart backend server to load new routes

### **Issue 2: "Database error"**
**Solution:** Run RLS fix SQL script in Supabase

### **Issue 3: "Validation error"**
**Solution:** Check txHash format (must be 64 hex characters)

### **Issue 4: "Function not found"**
**Solution:** Run database migration SQL scripts

### **Issue 5: "Balance not updating"**
**Solution:** Check if `update_user_energy_stats` function exists

## 🎉 **Success Indicators**

### **✅ Backend Working:**
- Energy generation API returns success
- Energy balance API returns correct data
- Database functions execute without errors
- User stats update correctly

### **✅ Frontend Working:**
- Energy balance UI updates after generation
- Real-time validation shows correct limits
- Offer creation respects energy balance
- No console errors

### **✅ Database Working:**
- New records appear in `energy_generation` table
- User balances update in `users` table
- Database functions return expected results
- RLS policies allow operations

## 🔮 **Next Steps After Fix**

1. **Test Complete Flow:**
   - Generate energy → Create offer → Sell energy
   - Verify balance decreases correctly

2. **Add Error Handling:**
   - Better error messages for users
   - Retry mechanisms for failed operations

3. **Production Preparation:**
   - Enable RLS with proper policies
   - Add rate limiting
   - Implement proper logging

4. **Performance Optimization:**
   - Cache energy balances
   - Batch database operations
   - Optimize database queries

---

**🎯 After following this guide, energy generation should work correctly with proper database persistence and balance tracking!**
