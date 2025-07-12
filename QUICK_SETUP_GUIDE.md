# 🚀 Quick Setup Guide - User Profiles

## 🎯 **Current Status**

✅ **Frontend**: Running at http://localhost:5173
✅ **Code**: All user profile components implemented
❌ **Database**: Supabase schema needs to be applied

---

## 🔧 **Quick Fix for Sign Up Error**

### **Issue**: `❌ Sign up failed: Cannot read properties of null (reading 'split')`

### **Root Cause**: 
1. Supabase database schema not applied yet
2. `profiles` table doesn't exist
3. Auth triggers not set up

### **Solution**: Apply database schema

---

## 📊 **Step 1: Apply Database Schema**

### **Option A: Via Supabase Dashboard (Recommended)**

1. **Open Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek
   ```

2. **Go to SQL Editor**:
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste Schema**:
   ```sql
   -- Copy entire content from: backend/user-profiles-schema.sql
   ```

4. **Run the Query**:
   - Click "Run" button
   - Wait for completion

### **Option B: Via Command Line**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Apply schema
supabase db push --project-ref jzzljxhqrbxeiqozptek
```

---

## 🧪 **Step 2: Test the Fix**

### **After applying schema, test:**

1. **Refresh the page**: http://localhost:5173

2. **Look for Supabase Test Results** (top-left):
   ```
   🧪 Supabase Tests
   ✅ Connection Test - Connected successfully
   ✅ Auth Test - No active session  
   ✅ Database Test - Profiles table accessible
   ```

3. **Try Sign Up**:
   - Click "🔐 Sign In" button
   - Switch to "Sign Up" tab
   - Enter: test@example.com / password123
   - Should see: "✅ Account created! Check your email for verification."

---

## 🎭 **Alternative: Use Offline Demo**

### **If you want to see the features without database setup:**

1. **Wait for Demo Mode**: After 3 seconds, offline demo activates automatically

2. **Demo Features**:
   - 🎮 Demo controls (bottom-right)
   - 👤 User profile switching
   - 👥 Enhanced marketplace
   - 📊 Friendly trade history

3. **Demo Users**:
   - 🌞 Solar Farm Owner (verified, 95 reputation)
   - 💨 Wind Energy Co (verified, 88 reputation)  
   - 💧 Hydro Power Station (unverified, 72 reputation)

---

## 📋 **Database Schema Summary**

### **Tables Created**:
```sql
✅ profiles - User profiles with Supabase Auth integration
✅ trades - User-friendly transaction history
✅ indexer_state - Blockchain sync tracking
✅ user_stats - Aggregated user statistics (view)
✅ user_trade_history - Named trade history (view)
```

### **Key Features**:
```sql
✅ Row Level Security (RLS) policies
✅ Auto-create profile on user signup
✅ Update statistics on trade completion
✅ Real-time subscriptions ready
✅ JWT token authentication
```

---

## 🔍 **Troubleshooting**

### **Issue: "relation 'profiles' does not exist"**
- **Solution**: Apply database schema (Step 1)

### **Issue: "Invalid JWT token"**
- **Solution**: Check API key in `frontend/src/supabase-client.ts`

### **Issue: "Sign up still fails"**
- **Check**: Browser console for detailed error
- **Verify**: Database schema applied correctly
- **Test**: Try with different email address

### **Issue: "Demo mode doesn't appear"**
- **Wait**: 3 seconds for backend connection timeout
- **Check**: Browser console for demo logs

---

## 🎉 **Expected Results After Setup**

### **✅ Working Sign Up Flow**:
```
1. Click "🔐 Sign In" → "Sign Up" tab
2. Enter email/password → "✅ Account created!"
3. Check email for verification link
4. Sign in → Profile button appears
5. Click profile → Rich profile management
```

### **✅ Enhanced UX Features**:
```
👤 User profiles with names and avatars
✅ Verification badges and reputation scores
📍 Location and energy producer information
🔗 Wallet linking to profiles
📊 User statistics and trade history
```

---

## 🚀 **Next Steps After Setup**

1. **Test Authentication**: Sign up → verify email → sign in
2. **Test Profile Management**: Update profile info
3. **Test Wallet Linking**: Connect MetaMask
4. **Test Enhanced Marketplace**: See user names instead of addresses
5. **Start Backend**: For full transaction indexing

---

**🎯 GOAL: Transform from wallet addresses to professional user marketplace!**
