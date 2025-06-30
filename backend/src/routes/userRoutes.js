import express from 'express'
import { UserService } from '../services/userService.js'
import { validateRequest } from '../middleware/validation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
const createUserSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional()
})

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional()
})

// POST /api/v1/users - Create or get user
router.post('/',
  validateRequest(createUserSchema),
  asyncHandler(async (req, res) => {
    const { user, isNew } = await UserService.createOrGetUser(req.body.walletAddress, req.body)
    
    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? 'User created successfully' : 'User retrieved successfully',
      data: user,
      isNew
    })
  })
)

// GET /api/v1/users/:walletAddress - Get user profile
router.get('/:walletAddress', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format'
    })
  }

  const user = await UserService.getUserByWallet(walletAddress)
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    })
  }

  res.json({
    success: true,
    data: user
  })
}))

// GET /api/v1/users/:walletAddress/stats - Get user statistics
router.get('/:walletAddress/stats', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format'
    })
  }

  const stats = await UserService.getUserStats(walletAddress)
  
  res.json({
    success: true,
    data: stats
  })
}))

// PUT /api/v1/users/:walletAddress - Update user profile
router.put('/:walletAddress',
  validateRequest(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { walletAddress } = req.params
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      })
    }

    const updatedUser = await UserService.updateUser(walletAddress, req.body)
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    })
  })
)

// GET /api/v1/users/leaderboard - Get leaderboard
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50)
  const type = req.query.type || 'earnings' // earnings, generation, reputation
  
  const leaderboard = await UserService.getLeaderboard(limit, type)
  
  res.json({
    success: true,
    data: leaderboard,
    pagination: {
      limit,
      type
    }
  })
}))

// GET /api/v1/users/search - Search users
router.get('/search', asyncHandler(async (req, res) => {
  const query = req.query.q
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  
  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    })
  }

  const users = await UserService.searchUsers(query, limit)
  
  res.json({
    success: true,
    data: users,
    pagination: {
      limit,
      query
    }
  })
}))

export default router
