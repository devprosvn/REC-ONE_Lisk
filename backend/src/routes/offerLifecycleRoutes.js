// REC-ONE Offer Lifecycle Management Routes
import express from 'express'
import Joi from 'joi'
import { OfferLifecycleService } from '../services/offerLifecycleService.js'
import { validateRequest } from '../middleware/validation.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

// Validation schemas
const restoreOfferSchema = Joi.object({
  offerId: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).required(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
})

const cancelOfferSchema = Joi.object({
  offerId: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).required(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  confirmationText: Joi.string().valid('CANCEL').required()
})

const editOfferSchema = Joi.object({
  offerId: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).required(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  quantity: Joi.number().positive().optional(),
  pricePerKWhETH: Joi.alternatives().try(
    Joi.number().positive(),
    Joi.string().pattern(/^\d*\.?\d+$/)
  ).optional(),
  pricePerKWhVND: Joi.number().positive().optional()
})

// POST /api/v1/offers/lifecycle/expire - Manually trigger offer expiration
router.post('/expire',
  asyncHandler(async (req, res) => {
    const result = await OfferLifecycleService.expireOldOffers()
    res.json({
      success: true,
      message: `${result.expiredCount} offers expired`,
      data: result
    })
  })
)

// POST /api/v1/offers/lifecycle/delete - Manually trigger offer deletion
router.post('/delete',
  asyncHandler(async (req, res) => {
    const result = await OfferLifecycleService.deleteOldOffers()
    res.json({
      success: true,
      message: `${result.deletedCount} offers deleted`,
      data: result
    })
  })
)

// POST /api/v1/offers/lifecycle/restore - Restore an expired offer
router.post('/restore',
  validateRequest(restoreOfferSchema),
  asyncHandler(async (req, res) => {
    const { offerId, walletAddress } = req.body
    const result = await OfferLifecycleService.restoreOffer(offerId, walletAddress)
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      })
    }
  })
)

// POST /api/v1/offers/lifecycle/cancel - Cancel an offer
router.post('/cancel',
  validateRequest(cancelOfferSchema),
  asyncHandler(async (req, res) => {
    const { offerId, walletAddress, confirmationText } = req.body
    const result = await OfferLifecycleService.cancelOffer(offerId, walletAddress, confirmationText)
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      })
    }
  })
)

// PUT /api/v1/offers/lifecycle/edit - Edit an active offer
router.put('/edit',
  validateRequest(editOfferSchema),
  asyncHandler(async (req, res) => {
    const { offerId, walletAddress, quantity, pricePerKWhETH, pricePerKWhVND } = req.body
    
    const updates = {}
    if (quantity !== undefined) updates.quantity = quantity
    if (pricePerKWhETH !== undefined) updates.pricePerKWhETH = pricePerKWhETH
    if (pricePerKWhVND !== undefined) updates.pricePerKWhVND = pricePerKWhVND
    
    const result = await OfferLifecycleService.editOffer(offerId, walletAddress, updates)
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      })
    }
  })
)

// GET /api/v1/offers/lifecycle/user/:wallet - Get user's offers with status
router.get('/user/:wallet',
  asyncHandler(async (req, res) => {
    const { wallet } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const offset = parseInt(req.query.offset) || 0
    
    // Validate wallet address
    const walletRegex = /^0x[a-fA-F0-9]{40}$/
    if (!walletRegex.test(wallet)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      })
    }
    
    const result = await OfferLifecycleService.getUserOffersWithStatus(wallet, limit, offset)
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    })
  })
)

// GET /api/v1/offers/lifecycle/active - Get active offers only
router.get('/active',
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const offset = parseInt(req.query.offset) || 0
    
    const result = await OfferLifecycleService.getActiveOffers(limit, offset)
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    })
  })
)

// POST /api/v1/offers/lifecycle/initialize - Initialize expiration dates for existing offers
router.post('/initialize',
  asyncHandler(async (req, res) => {
    const result = await OfferLifecycleService.initializeExpirationDates()
    res.json({
      success: true,
      message: result.message,
      data: {
        updatedCount: result.updatedCount
      }
    })
  })
)

// GET /api/v1/offers/lifecycle/status/:offerId - Get offer status details
router.get('/status/:offerId',
  asyncHandler(async (req, res) => {
    const { offerId } = req.params
    
    // This would be implemented to get detailed status of a specific offer
    res.json({
      success: true,
      message: 'Offer status endpoint - to be implemented',
      data: {
        offerId: parseInt(offerId)
      }
    })
  })
)

export default router
