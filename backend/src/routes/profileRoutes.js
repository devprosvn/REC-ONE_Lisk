import express from 'express'
import Joi from 'joi'
import UserProfileService from '../services/userProfileService.js'
import { supabase } from '../config/supabase.js'

const router = express.Router()

// Validation schemas
const updateProfileSchema = Joi.object({
  display_name: Joi.string().min(2).max(50).trim(),
  bio: Joi.string().max(500).allow(''),
  location: Joi.string().max(100).allow(''),
  phone: Joi.string().pattern(/^[\+]?[0-9\-\(\)\s]+$/).allow(''),
  avatar_url: Joi.string().uri().allow(''),
  energy_producer_type: Joi.string().valid('solar', 'wind', 'hydro', 'biomass', 'other').allow(''),
  installation_capacity: Joi.number().positive().max(10000).allow(null),
  installation_date: Joi.date().max('now').allow(null)
})

const linkWalletSchema = Joi.object({
  wallet_address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  signature: Joi.string().required() // For wallet verification
})

// Middleware to verify Supabase JWT token
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      })
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Authentication error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    })
  }
}

/**
 * @route GET /api/v1/profiles/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const result = await UserProfileService.getProfile(req.user.id)
    
    if (!result.success) {
      return res.status(404).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Get profile error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    })
  }
})

/**
 * @route GET /api/v1/profiles/:userId
 * @desc Get user profile by ID (public)
 * @access Public
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      })
    }

    const result = await UserProfileService.getProfile(userId)
    
    if (!result.success) {
      return res.status(404).json(result)
    }

    // Remove sensitive information for public view
    const publicProfile = {
      ...result.data,
      email: undefined,
      phone: undefined
    }

    res.json({
      success: true,
      data: publicProfile
    })
  } catch (error) {
    console.error('Get public profile error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    })
  }
})

/**
 * @route GET /api/v1/profiles/wallet/:walletAddress
 * @desc Get user profile by wallet address
 * @access Public
 */
router.get('/wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params
    
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      })
    }

    const result = await UserProfileService.getProfileByWallet(walletAddress)
    
    if (!result.success) {
      return res.status(404).json(result)
    }

    // Remove sensitive information for public view
    const publicProfile = {
      ...result.data,
      email: undefined,
      phone: undefined
    }

    res.json({
      success: true,
      data: publicProfile
    })
  } catch (error) {
    console.error('Get profile by wallet error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    })
  }
})

/**
 * @route PUT /api/v1/profiles/me
 * @desc Update current user's profile
 * @access Private
 */
router.put('/me', authenticateUser, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      })
    }

    const result = await UserProfileService.updateProfile(req.user.id, value)
    
    if (!result.success) {
      return res.status(400).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Update profile error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    })
  }
})

/**
 * @route POST /api/v1/profiles/link-wallet
 * @desc Link wallet address to user profile
 * @access Private
 */
router.post('/link-wallet', authenticateUser, async (req, res) => {
  try {
    const { error, value } = linkWalletSchema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      })
    }

    // TODO: Verify wallet signature to ensure user owns the wallet
    // This would involve verifying that the signature was created by the wallet address
    
    const result = await UserProfileService.linkWallet(req.user.id, value.wallet_address)
    
    if (!result.success) {
      return res.status(400).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Link wallet error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to link wallet'
    })
  }
})

/**
 * @route GET /api/v1/profiles
 * @desc Get all user profiles (for marketplace)
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    
    if (limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit cannot exceed 100'
      })
    }

    const result = await UserProfileService.getAllProfiles(limit, offset)
    
    if (!result.success) {
      return res.status(500).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Get all profiles error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profiles'
    })
  }
})

/**
 * @route GET /api/v1/profiles/search
 * @desc Search user profiles
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      })
    }

    const limit = parseInt(req.query.limit) || 20
    const result = await UserProfileService.searchProfiles(query, limit)
    
    if (!result.success) {
      return res.status(500).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Search profiles error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to search profiles'
    })
  }
})

/**
 * @route GET /api/v1/profiles/me/trades
 * @desc Get current user's trade history
 * @access Private
 */
router.get('/me/trades', authenticateUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    
    const result = await UserProfileService.getUserTradeHistory(req.user.id, limit, offset)
    
    if (!result.success) {
      return res.status(500).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Get trade history error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trade history'
    })
  }
})

/**
 * @route GET /api/v1/profiles/me/stats
 * @desc Get current user's statistics
 * @access Private
 */
router.get('/me/stats', authenticateUser, async (req, res) => {
  try {
    const result = await UserProfileService.getUserStats(req.user.id)
    
    if (!result.success) {
      return res.status(404).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Get user stats error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    })
  }
})

export default router
