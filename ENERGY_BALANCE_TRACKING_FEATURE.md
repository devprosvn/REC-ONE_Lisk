# ⚡ Energy Balance Tracking Feature

## 🎯 **Feature Overview**

Khi generate energy, hệ thống sẽ lưu trữ tổng giá trị energy đã generate và sử dụng làm giới hạn energy tối đa có thể bán được.

### **Core Concept:**
```
Available Energy Balance = Total Generated - Total Sold - Pending Offers
```

## 🗄️ **Database Schema Updates**

### **1. Users Table Enhancement**
```sql
-- Added new column
ALTER TABLE users 
ADD COLUMN available_energy_balance DECIMAL DEFAULT 0;
```

### **2. Updated User Stats Function**
```sql
CREATE OR REPLACE FUNCTION update_user_energy_stats(
  user_wallet TEXT,
  stat_type TEXT,
  quantity_val DECIMAL,
  earnings_val DECIMAL DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  IF stat_type = 'generated' THEN
    UPDATE users SET 
      total_energy_generated = total_energy_generated + quantity_val,
      available_energy_balance = available_energy_balance + quantity_val,
      updated_at = NOW()
    WHERE wallet_address = user_wallet;
  ELSIF stat_type = 'sold' THEN
    UPDATE users SET 
      total_energy_sold = total_energy_sold + quantity_val,
      available_energy_balance = available_energy_balance - quantity_val,
      total_earnings_vnd = total_earnings_vnd + earnings_val,
      updated_at = NOW()
    WHERE wallet_address = user_wallet;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### **3. Balance Validation Functions**
```sql
-- Get available energy balance
CREATE OR REPLACE FUNCTION get_available_energy_balance(user_wallet TEXT)
RETURNS DECIMAL AS $$
BEGIN
  SELECT available_energy_balance FROM users WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;

-- Validate energy offer against available balance
CREATE OR REPLACE FUNCTION validate_energy_offer(
  user_wallet TEXT,
  offer_quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  available_balance DECIMAL;
  pending_offers DECIMAL;
BEGIN
  -- Get current available balance
  SELECT available_energy_balance INTO available_balance 
  FROM users WHERE wallet_address = user_wallet;
  
  -- Get total quantity in pending offers
  SELECT COALESCE(SUM(quantity), 0) INTO pending_offers
  FROM energy_offers 
  WHERE seller_wallet = user_wallet AND status = 'active';
  
  -- Check if user has enough available energy
  RETURN COALESCE(available_balance, 0) >= (pending_offers + offer_quantity);
END;
$$ LANGUAGE plpgsql;
```

## 🔧 **Backend API Implementation**

### **1. New API Endpoints**

#### **GET /api/v1/energy/balance/:walletAddress**
```javascript
// Get user's energy balance summary
{
  "success": true,
  "data": {
    "totalGenerated": 150,
    "totalSold": 50,
    "availableBalance": 100,
    "pendingOffers": 25,
    "maxCanSell": 75
  },
  "message": "Available energy: 75 kWh (Generated: 150, Sold: 50, Pending: 25)"
}
```

#### **POST /api/v1/energy/validate-offer**
```javascript
// Validate if user can create offer
{
  "walletAddress": "0x...",
  "quantity": 50
}

// Response:
{
  "success": true,
  "data": {
    "canCreateOffer": true,
    "requestedQuantity": 50,
    "availableBalance": 75,
    "energyBalance": { ... }
  },
  "message": "✅ You can create this offer (50 kWh available: 75 kWh)"
}
```

### **2. Enhanced Energy Service**
```javascript
class EnergyService {
  // Validate energy balance before creating offer
  static async validateEnergyBalance(walletAddress, offerQuantity) {
    const { data, error } = await supabase.rpc('validate_energy_offer', {
      user_wallet: walletAddress.toLowerCase(),
      offer_quantity: parseFloat(offerQuantity)
    })
    return data === true
  }

  // Get user's energy balance summary
  static async getUserEnergyBalance(walletAddress) {
    const { data: user } = await supabase
      .from('users')
      .select('total_energy_generated, total_energy_sold, available_energy_balance')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    const { data: pendingOffers } = await supabase
      .from('energy_offers')
      .select('quantity')
      .eq('seller_wallet', walletAddress.toLowerCase())
      .eq('status', 'active')

    const pendingQuantity = pendingOffers?.reduce((sum, offer) => 
      sum + parseFloat(offer.quantity), 0) || 0

    return {
      totalGenerated: parseFloat(user.total_energy_generated) || 0,
      totalSold: parseFloat(user.total_energy_sold) || 0,
      availableBalance: parseFloat(user.available_energy_balance) || 0,
      pendingOffers: pendingQuantity,
      maxCanSell: Math.max(0, (parseFloat(user.available_energy_balance) || 0) - pendingQuantity)
    }
  }

  // Enhanced offer creation with balance validation
  static async recordEnergyOffer(data) {
    // Validate energy balance before creating offer
    const isValid = await this.validateEnergyBalance(data.sellerWallet, data.quantity)
    if (!isValid) {
      throw new Error('Insufficient energy balance. You can only sell energy that you have generated.')
    }
    
    // Proceed with offer creation...
  }
}
```

## 🌐 **Frontend Implementation**

### **1. Enhanced UI Elements**

#### **Energy Balance Display**
```html
<!-- Energy Balance Info -->
<div class="energy-balance-info">
  <div class="balance-item">
    <span class="label">Total Generated:</span>
    <span id="total-generated" class="value">0 kWh</span>
  </div>
  <div class="balance-item">
    <span class="label">Total Sold:</span>
    <span id="total-sold" class="value">0 kWh</span>
  </div>
  <div class="balance-item">
    <span class="label">Pending Offers:</span>
    <span id="pending-offers" class="value">0 kWh</span>
  </div>
  <div class="balance-item highlight">
    <span class="label">Available to Sell:</span>
    <span id="max-can-sell" class="value">0 kWh</span>
  </div>
</div>
```

#### **Offer Creation with Validation**
```html
<div class="quantity-input-group">
  <input type="number" id="offer-quantity" placeholder="Quantity (kWh)" min="1" step="1">
  <small class="input-hint">Maximum: <span id="max-quantity-hint">0</span> kWh</small>
</div>
<div id="offer-validation" class="offer-validation" style="display: none;"></div>
```

### **2. JavaScript Implementation**

#### **Energy Balance Management**
```javascript
let userEnergyBalance = null

// Update energy balance from backend
async function updateEnergyBalance() {
  if (!userAddress) return

  const response = await apiClient.getUserEnergyBalance(userAddress)
  if (response.success) {
    userEnergyBalance = response.data
    
    // Update UI elements
    totalGeneratedSpan.textContent = `${userEnergyBalance.totalGenerated} kWh`
    totalSoldSpan.textContent = `${userEnergyBalance.totalSold} kWh`
    pendingOffersSpan.textContent = `${userEnergyBalance.pendingOffers} kWh`
    maxCanSellSpan.textContent = `${userEnergyBalance.maxCanSell} kWh`
    maxQuantityHintSpan.textContent = userEnergyBalance.maxCanSell.toString()
    availableEnergySpan.textContent = `${userEnergyBalance.maxCanSell} kWh`
  }
}
```

#### **Real-time Offer Validation**
```javascript
// Validate offer quantity against available energy balance
async function validateOfferQuantity(quantity) {
  if (!userEnergyBalance) {
    await updateEnergyBalance()
  }

  if (quantity > userEnergyBalance.maxCanSell) {
    return { 
      valid: false, 
      message: `Insufficient energy balance. You can sell maximum ${userEnergyBalance.maxCanSell} kWh` 
    }
  }

  return { 
    valid: true, 
    message: `✅ You can create this offer (${quantity} kWh available: ${userEnergyBalance.maxCanSell} kWh)` 
  }
}

// Real-time validation on input
offerQuantityInput.addEventListener('input', async () => {
  const quantity = parseInt(offerQuantityInput.value)
  if (quantity && quantity > 0) {
    const validation = await validateOfferQuantity(quantity)
    showOfferValidation(validation.message, validation.valid ? 'success' : 'error')
  }
})
```

#### **Enhanced Create Offer Function**
```javascript
async function createOffer() {
  // Validate energy balance
  const quantity = parseInt(offerQuantityInput.value)
  const balanceValidation = await validateOfferQuantity(quantity)
  if (!balanceValidation.valid) {
    showOfferValidation(balanceValidation.message, 'error')
    showStatus(`Energy balance error: ${balanceValidation.message}`, 'warning')
    return
  }

  // Proceed with offer creation...
}
```

## 🎯 **User Experience Flow**

### **1. Energy Generation**
```
User generates 100 kWh → Database updates:
- total_energy_generated: +100
- available_energy_balance: +100
- UI shows: "Available to Sell: 100 kWh"
```

### **2. Creating Energy Offer**
```
User tries to sell 150 kWh → Validation:
- Check: 150 > 100 (available)
- Result: ❌ "Insufficient energy balance. You can sell maximum 100 kWh"

User tries to sell 50 kWh → Validation:
- Check: 50 ≤ 100 (available)
- Result: ✅ "You can create this offer"
- Offer created → Pending offers: 50 kWh
- Available to sell: 50 kWh (100 - 50 pending)
```

### **3. Offer Completion**
```
Offer sold → Database updates:
- total_energy_sold: +50
- available_energy_balance: -50
- Pending offers: -50
- Available to sell: 50 kWh
```

## 🔧 **Implementation Steps**

### **1. Database Migration**
```bash
# Run in Supabase SQL Editor
# https://supabase.com/dashboard/project/jzzljxhqrbxeiqozptek/sql
cat backend/energy-balance-migration.sql
```

### **2. Backend Restart**
```bash
cd backend
npm run dev
```

### **3. Frontend Testing**
```bash
# Open browser
http://localhost:5173

# Test flow:
1. Connect wallet
2. Generate energy → Check balance increases
3. Try to create offer > available balance → Should fail
4. Create valid offer → Should succeed
```

## 📊 **Validation Rules**

### **Energy Balance Constraints:**
- ✅ Can only sell energy that has been generated
- ✅ Cannot create offers exceeding available balance
- ✅ Pending offers reduce available balance
- ✅ Sold energy permanently reduces available balance
- ✅ Real-time validation prevents invalid offers

### **Error Messages:**
- `"Insufficient energy balance. You can sell maximum X kWh"`
- `"Generated: X, Sold: Y, Pending: Z"`
- `"Please generate more energy before creating offers"`

## 🎉 **Benefits**

### **For Users:**
- ✅ Clear understanding of available energy
- ✅ Prevents overselling energy
- ✅ Real-time feedback on offer validity
- ✅ Transparent energy balance tracking

### **For Platform:**
- ✅ Prevents invalid marketplace offers
- ✅ Maintains energy conservation laws
- ✅ Accurate energy accounting
- ✅ Better user experience with validation

### **For Ecosystem:**
- ✅ Ensures energy marketplace integrity
- ✅ Builds trust through transparent tracking
- ✅ Prevents energy "double spending"
- ✅ Scalable energy balance management

---

**🎯 Energy balance tracking ensures users can only sell energy they have actually generated, maintaining marketplace integrity and preventing overselling.**
