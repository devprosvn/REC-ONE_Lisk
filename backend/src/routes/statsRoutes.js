import express from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { supabase, TABLES } from '../config/supabase.js'

const router = express.Router()

// GET /api/v1/stats/overview - Platform overview
router.get('/overview', asyncHandler(async (req, res) => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('*', { count: 'exact', head: true })

    if (usersError) throw usersError

    // Get total energy generated
    const { data: energyData, error: energyError } = await supabase
      .from(TABLES.ENERGY_GENERATION)
      .select('quantity')

    if (energyError) throw energyError

    const totalEnergyGenerated = energyData?.reduce((sum, record) => sum + parseFloat(record.quantity), 0) || 0

    // Get total energy traded
    const { data: offersData, error: offersError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('quantity, total_price_vnd')
      .eq('status', 'sold')

    if (offersError) throw offersError

    const totalEnergyTraded = offersData?.reduce((sum, offer) => sum + parseFloat(offer.quantity), 0) || 0
    const totalValueTraded = offersData?.reduce((sum, offer) => sum + parseFloat(offer.total_price_vnd), 0) || 0

    // Get active offers count
    const { count: activeOffers, error: activeError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (activeError) throw activeError

    const averagePrice = totalEnergyTraded > 0 ? totalValueTraded / totalEnergyTraded : 0

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalEnergyGenerated,
        totalEnergyTraded,
        totalValueTraded,
        activeOffers: activeOffers || 0,
        averagePrice,
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error getting platform overview:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get platform overview',
      error: error.message
    })
  }
}))

// GET /api/v1/stats/daily - Daily statistics
router.get('/daily', asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0]
  
  try {
    // Get daily energy generation
    const { data: dailyGeneration, error: genError } = await supabase
      .from(TABLES.ENERGY_GENERATION)
      .select('quantity')
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`)

    if (genError) throw genError

    // Get daily offers created
    const { data: dailyOffers, error: offersError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('quantity, total_price_vnd')
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lt('created_at', `${date}T23:59:59.999Z`)

    if (offersError) throw offersError

    // Get daily trades completed
    const { data: dailyTrades, error: tradesError } = await supabase
      .from(TABLES.ENERGY_OFFERS)
      .select('quantity, total_price_vnd')
      .eq('status', 'sold')
      .gte('completed_at', `${date}T00:00:00.000Z`)
      .lt('completed_at', `${date}T23:59:59.999Z`)

    if (tradesError) throw tradesError

    const energyGenerated = dailyGeneration?.reduce((sum, record) => sum + parseFloat(record.quantity), 0) || 0
    const offersCreated = dailyOffers?.length || 0
    const offersVolume = dailyOffers?.reduce((sum, offer) => sum + parseFloat(offer.quantity), 0) || 0
    const tradesCompleted = dailyTrades?.length || 0
    const tradesVolume = dailyTrades?.reduce((sum, trade) => sum + parseFloat(trade.quantity), 0) || 0
    const tradesValue = dailyTrades?.reduce((sum, trade) => sum + parseFloat(trade.total_price_vnd), 0) || 0

    res.json({
      success: true,
      data: {
        date,
        energyGenerated,
        offersCreated,
        offersVolume,
        tradesCompleted,
        tradesVolume,
        tradesValue,
        averageTradePrice: tradesVolume > 0 ? tradesValue / tradesVolume : 0
      }
    })
  } catch (error) {
    console.error('Error getting daily stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get daily statistics',
      error: error.message
    })
  }
}))

// GET /api/v1/stats/prices - Price history
router.get('/prices', asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30)
  
  try {
    const { data: priceHistory, error } = await supabase
      .from(TABLES.PRICE_HISTORY)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(days * 24) // Assuming hourly updates

    if (error) throw error

    res.json({
      success: true,
      data: priceHistory || [],
      pagination: {
        days,
        count: priceHistory?.length || 0
      }
    })
  } catch (error) {
    console.error('Error getting price history:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get price history',
      error: error.message
    })
  }
}))

// GET /api/v1/stats/users - User statistics
router.get('/users', asyncHandler(async (req, res) => {
  try {
    // Get user registration trend (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: newUsers, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (usersError) throw usersError

    // Get top users by energy generation
    const { data: topGenerators, error: genError } = await supabase
      .from(TABLES.USERS)
      .select('wallet_address, username, total_energy_generated, reputation_score')
      .order('total_energy_generated', { ascending: false })
      .limit(10)

    if (genError) throw genError

    // Get top users by earnings
    const { data: topEarners, error: earnError } = await supabase
      .from(TABLES.USERS)
      .select('wallet_address, username, total_earnings_vnd, reputation_score')
      .order('total_earnings_vnd', { ascending: false })
      .limit(10)

    if (earnError) throw earnError

    // Group new users by day
    const usersByDay = {}
    newUsers?.forEach(user => {
      const day = user.created_at.split('T')[0]
      usersByDay[day] = (usersByDay[day] || 0) + 1
    })

    res.json({
      success: true,
      data: {
        newUsersLast30Days: newUsers?.length || 0,
        userRegistrationTrend: usersByDay,
        topGenerators: topGenerators || [],
        topEarners: topEarners || []
      }
    })
  } catch (error) {
    console.error('Error getting user stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: error.message
    })
  }
}))

export default router
