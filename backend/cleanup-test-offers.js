#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables (.env at project root or backend folder)
dotenv.config({ path: process.env.ENV_PATH || './.env' })

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function cleanup() {
  const username = 'User_0c6C87'

  // Calculate today 14:00 in UTC (assume local timezone is +07:00)
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const thresholdLocal = new Date(`${yyyy}-${mm}-${dd}T14:00:00+07:00`)
  const thresholdUTC = thresholdLocal.toISOString()

  console.log('🧹 Cleaning energy_offers table')
  console.log(`→ Username         : ${username}`)
  console.log(`→ Threshold UTC    : ${thresholdUTC}`)

  // Get user id of specified username (case-sensitive match)
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, wallet_address')
    .eq('username', username)
    .single()

  if (userErr) {
    console.error('Failed to fetch user:', userErr.message)
    process.exit(1)
  }

  if (!user) {
    console.warn(`⚠️ User ${username} not found, skipping username condition`)
  }

  const conditions = []
  if (user) conditions.push(`seller_id.eq.${user.id}`)
  conditions.push(`created_at.lt.${thresholdUTC}`)

  const { error } = await supabase
    .from('energy_offers')
    .delete()
    .or(conditions.join(','))

  if (error) {
    console.error('❌ Delete failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Cleanup completed')
}

cleanup() 