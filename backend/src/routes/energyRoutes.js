import express from 'express'
import { EnergyService } from '../services/energyService.js'
import { validateRequest } from '../middleware/validation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
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

const energyOfferSchema = Joi.object({
  offerId: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).required(),
  sellerWallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  quantity: Joi.number().positive().required(),
  pricePerKWhETH: Joi.alternatives().try(
    Joi.number().positive().min(0.000001).max(1.0),
    Joi.string().pattern(/^\d*\.?\d+$/).custom((value, helpers) => {
      const numValue = parseFloat(value)
      if (numValue <= 0) {
        return helpers.error('number.positive')
      }
      if (numValue < 0.000001) {
        return helpers.error('number.min', { limit: 0.000001 })
      }
      if (numValue >= 1.000001) {
        return helpers.error('number.max', { limit: 1.0 })
      }
      return value
    })
  ).required().messages({
    'number.positive': 'Price must be greater than 0',
    'number.min': 'Price must be at least 0.000001 ETH/kWh',
    'number.max': 'Price must not exceed 1.0 ETH/kWh'
  }),
  pricePerKWhVND: Joi.number().positive().required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  blockNumber: Joi.number().integer().positive().optional()
})

const energyPurchaseSchema = Joi.object({
  offerId: Joi.number().integer().positive().required(),
  buyerWallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  sellerWallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  quantity: Joi.number().positive().required(),
  totalPriceETH: Joi.number().positive().required(),
  totalPriceVND: Joi.number().positive().required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  blockNumber: Joi.number().integer().positive().optional()
})

// POST /api/v1/energy/generation - Record energy generation
router.post('/generation', 
  validateRequest(energyGenerationSchema),
  asyncHandler(async (req, res) => {
    const generation = await EnergyService.recordEnergyGeneration(req.body)
    res.status(201).json({
      success: true,
      message: 'Energy generation recorded successfully',
      data: generation
    })
  })
)

// POST /api/v1/energy/offers - Record energy offer creation
router.post('/offers',
  validateRequest(energyOfferSchema),
  asyncHandler(async (req, res) => {
    const offer = await EnergyService.recordEnergyOffer(req.body)
    res.status(201).json({
      success: true,
      message: 'Energy offer recorded successfully',
      data: offer
    })
  })
)

// POST /api/v1/energy/purchase - Record energy purchase
router.post('/purchase',
  validateRequest(energyPurchaseSchema),
  asyncHandler(async (req, res) => {
    const purchase = await EnergyService.recordEnergyPurchase(req.body)
    res.status(200).json({
      success: true,
      message: 'Energy purchase recorded successfully',
      data: purchase
    })
  })
)

// POST /api/v1/energy/cancel - Cancel energy offer
router.post('/cancel',
  validateRequest(Joi.object({
    offerId: Joi.number().integer().positive().required(),
    txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
    blockNumber: Joi.number().integer().positive().optional()
  })),
  asyncHandler(async (req, res) => {
    const cancelled = await EnergyService.cancelEnergyOffer(req.body)
    res.status(200).json({
      success: true,
      message: 'Energy offer cancelled successfully',
      data: cancelled
    })
  })
)

// GET /api/v1/energy/offers - Get active offers
router.get('/offers', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0
  
  const offers = await EnergyService.getActiveOffers(limit, offset)
  
  res.json({
    success: true,
    data: offers,
    pagination: {
      limit,
      offset,
      count: offers.length
    }
  })
}))

// GET /api/v1/energy/offers/search - Search offers with filters
router.get('/offers/search', asyncHandler(async (req, res) => {
  const filters = {
    minQuantity: req.query.minQuantity ? parseFloat(req.query.minQuantity) : undefined,
    maxQuantity: req.query.maxQuantity ? parseFloat(req.query.maxQuantity) : undefined,
    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
    sellerWallet: req.query.sellerWallet,
    sortBy: req.query.sortBy || 'created_at',
    sortOrder: req.query.sortOrder || 'desc',
    limit: Math.min(parseInt(req.query.limit) || 20, 100),
    offset: parseInt(req.query.offset) || 0
  }

  const offers = await EnergyService.searchOffers(filters)
  
  res.json({
    success: true,
    data: offers,
    filters,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      count: offers.length
    }
  })
}))

// GET /api/v1/energy/history/:walletAddress - Get user's energy history
router.get('/history/:walletAddress', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  
  // Validate wallet address
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format'
    })
  }

  const history = await EnergyService.getUserEnergyHistory(walletAddress, limit)
  
  res.json({
    success: true,
    data: history,
    pagination: {
      limit,
      count: {
        generations: history.generations.length,
        offers: history.offers.length,
        purchases: history.purchases.length
      }
    }
  })
}))

// GET /api/v1/energy/marketplace/stats - Get marketplace statistics
router.get('/marketplace/stats', asyncHandler(async (req, res) => {
  const stats = await EnergyService.getMarketplaceStats()
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  })
}))

// GET /api/v1/energy/offers/:offerId - Get specific offer details
router.get('/offers/:offerId', asyncHandler(async (req, res) => {
  const { offerId } = req.params

  if (!/^\d+$/.test(offerId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid offer ID format'
    })
  }

  const { data: offer, error } = await supabase
    .from('energy_offers')
    .select(`
      *,
      seller:users!seller_id(wallet_address, username, reputation_score),
      buyer:users!buyer_id(wallet_address, username)
    `)
    .eq('offer_id', parseInt(offerId))
    .single()

  if (error || !offer) {
    return res.status(404).json({
      success: false,
      message: 'Offer not found'
    })
  }

  res.json({
    success: true,
    data: offer
  })
}))

// GET /api/v1/energy/balance/:walletAddress - Get user's energy balance
router.get('/balance/:walletAddress', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format'
    })
  }

  const balance = await EnergyService.getUserEnergyBalance(walletAddress)

  res.json({
    success: true,
    data: balance,
    message: `Available energy: ${balance.maxCanSell} kWh (Generated: ${balance.totalGenerated}, Sold: ${balance.totalSold}, Pending: ${balance.pendingOffers})`
  })
}))

// POST /api/v1/energy/validate-offer - Validate if user can create offer
router.post('/validate-offer',
  validateRequest(Joi.object({
    walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    quantity: Joi.number().positive().required()
  })),
  asyncHandler(async (req, res) => {
    const { walletAddress, quantity } = req.body

    const isValid = await EnergyService.validateEnergyBalance(walletAddress, quantity)
    const balance = await EnergyService.getUserEnergyBalance(walletAddress)

    res.json({
      success: true,
      data: {
        canCreateOffer: isValid,
        requestedQuantity: quantity,
        availableBalance: balance.maxCanSell,
        energyBalance: balance
      },
      message: isValid
        ? `✅ You can create this offer (${quantity} kWh available: ${balance.maxCanSell} kWh)`
        : `❌ Insufficient energy balance (${quantity} kWh requested, ${balance.maxCanSell} kWh available)`
    })
  })
)

export default router
