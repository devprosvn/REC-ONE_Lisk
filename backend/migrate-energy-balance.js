#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateEnergyBalance() {
  console.log('🔄 Migrating energy balance schema...')

  try {
    // 1. Add available_energy_balance column if it doesn't exist
    console.log('1. Adding available_energy_balance column...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS available_energy_balance DECIMAL DEFAULT 0;
      `
    })

    if (alterError) {
      console.warn('Column may already exist:', alterError.message)
    } else {
      console.log('✅ Column added successfully')
    }

    // 2. Update existing users to set available_energy_balance = total_energy_generated - total_energy_sold
    console.log('2. Updating existing user balances...')
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE users
        SET available_energy_balance = COALESCE(total_energy_generated, 0) - COALESCE(total_energy_sold, 0)
        WHERE available_energy_balance = 0 OR available_energy_balance IS NULL;
      `
    })

    if (updateError) {
      console.error('Error updating balances:', updateError)
    } else {
      console.log('✅ User balances updated')
    }

    // 3. Create or replace the energy balance functions
    console.log('3. Creating energy balance functions...')

    const functions = [
      {
        name: 'update_user_energy_stats',
        sql: `
          CREATE OR REPLACE FUNCTION update_user_energy_stats(
            user_wallet TEXT,
            stat_type TEXT,
            quantity_val DECIMAL,
            earnings_val DECIMAL DEFAULT 0
          ) RETURNS VOID AS $$
          DECLARE
            user_id_val UUID;
          BEGIN
            -- Get or create user
            INSERT INTO users (wallet_address)
            VALUES (user_wallet)
            ON CONFLICT (wallet_address) DO NOTHING;

            SELECT id INTO user_id_val FROM users WHERE wallet_address = user_wallet;

            -- Update user stats based on type
            IF stat_type = 'generated' THEN
              UPDATE users SET
                total_energy_generated = total_energy_generated + quantity_val,
                available_energy_balance = available_energy_balance + quantity_val,
                updated_at = NOW()
              WHERE id = user_id_val;
            ELSIF stat_type = 'sold' THEN
              UPDATE users SET
                total_energy_sold = total_energy_sold + quantity_val,
                available_energy_balance = available_energy_balance - quantity_val,
                total_earnings_vnd = total_earnings_vnd + earnings_val,
                reputation_score = reputation_score + 1,
                updated_at = NOW()
              WHERE id = user_id_val;
            ELSIF stat_type = 'bought' THEN
              UPDATE users SET
                total_energy_bought = total_energy_bought + quantity_val,
                updated_at = NOW()
              WHERE id = user_id_val;
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `
      },
      {
        name: 'get_available_energy_balance',
        sql: `
          CREATE OR REPLACE FUNCTION get_available_energy_balance(user_wallet TEXT)
          RETURNS DECIMAL AS $$
          DECLARE
            balance_val DECIMAL;
          BEGIN
            SELECT available_energy_balance INTO balance_val
            FROM users
            WHERE wallet_address = user_wallet;

            RETURN COALESCE(balance_val, 0);
          END;
          $$ LANGUAGE plpgsql;
        `
      },
      {
        name: 'validate_energy_offer',
        sql: `
          CREATE OR REPLACE FUNCTION validate_energy_offer(
            user_wallet TEXT,
            offer_quantity DECIMAL
          ) RETURNS BOOLEAN AS $$
          DECLARE
            available_balance DECIMAL;
            pending_offers DECIMAL;
            total_committed DECIMAL;
          BEGIN
            -- Get current available balance
            SELECT available_energy_balance INTO available_balance
            FROM users
            WHERE wallet_address = user_wallet;

            -- Get total quantity in pending offers
            SELECT COALESCE(SUM(quantity), 0) INTO pending_offers
            FROM energy_offers
            WHERE seller_wallet = user_wallet AND status = 'active';

            -- Calculate total committed energy
            total_committed = pending_offers + offer_quantity;

            -- Check if user has enough available energy
            RETURN COALESCE(available_balance, 0) >= total_committed;
          END;
          $$ LANGUAGE plpgsql;
        `
      }
    ]

    for (const func of functions) {
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql: func.sql
      })

      if (funcError) {
        console.error(`Error creating function ${func.name}:`, funcError)
      } else {
        console.log(`✅ Function ${func.name} created`)
      }
    }

    // 4. Test the functions
    console.log('4. Testing functions...')

    // Test get_available_energy_balance
    const { data: testBalance, error: testError } = await supabase.rpc('get_available_energy_balance', {
      user_wallet: '0x742d35cc6634c0532925a3b8d4c9db96590c6c87'
    })

    if (testError) {
      console.error('Function test failed:', testError)
    } else {
      console.log(`✅ Function test passed. Sample balance: ${testBalance}`)
    }

    // 5. Show current user stats
    console.log('5. Current user statistics:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, total_energy_generated, total_energy_sold, available_energy_balance')
      .limit(5)

    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      console.table(users)
    }

    console.log('🎉 Energy balance migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateEnergyBalance()