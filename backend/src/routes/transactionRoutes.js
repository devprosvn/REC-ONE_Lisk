import express from 'express'
import { validateRequest } from '../middleware/validation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { supabase, TABLES } from '../config/supabase.js'
import Joi from 'joi'

const router = express.Router()

// Validation schemas
const transactionSchema = Joi.object({
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  transactionType: Joi.string().valid('generation', 'offer_creation', 'purchase', 'cancellation').required(),
  offerId: Joi.number().integer().positive().optional(),
  quantity: Joi.number().positive().optional(),
  priceEth: Joi.number().positive().optional(),
  priceVnd: Joi.number().positive().optional(),
  gasUsed: Joi.number().integer().positive().optional(),
  gasPrice: Joi.number().integer().positive().optional(),
  blockNumber: Joi.number().integer().positive().required(),
  status: Joi.string().valid('pending', 'confirmed', 'failed').default('confirmed')
})

// POST /api/v1/transactions - Record transaction
router.post('/',
  validateRequest(transactionSchema),
  asyncHandler(async (req, res) => {
    const { data: transaction, error } = await supabase
      .from(TABLES.TRANSACTIONS)
      .insert([{
        tx_hash: req.body.txHash,
        from_address: req.body.fromAddress.toLowerCase(),
        to_address: req.body.toAddress.toLowerCase(),
        transaction_type: req.body.transactionType,
        offer_id: req.body.offerId,
        quantity: req.body.quantity,
        price_eth: req.body.priceEth,
        price_vnd: req.body.priceVnd,
        gas_used: req.body.gasUsed,
        gas_price: req.body.gasPrice,
        block_number: req.body.blockNumber,
        status: req.body.status,
        confirmed_at: req.body.status === 'confirmed' ? new Date().toISOString() : null
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction
    })
  })
)

// GET /api/v1/transactions/:txHash - Get transaction details
router.get('/:txHash', asyncHandler(async (req, res) => {
  const { txHash } = req.params
  
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction hash format'
    })
  }

  const { data: transaction, error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('*')
    .eq('tx_hash', txHash)
    .single()

  if (error || !transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    })
  }

  res.json({
    success: true,
    data: transaction
  })
}))

// GET /api/v1/transactions/user/:walletAddress - Get user transactions
router.get('/user/:walletAddress', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format'
    })
  }

  const { data: transactions, error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('*')
    .or(`from_address.eq.${walletAddress.toLowerCase()},to_address.eq.${walletAddress.toLowerCase()}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  res.json({
    success: true,
    data: transactions,
    pagination: {
      limit,
      offset,
      count: transactions.length
    }
  })
}))

// GET /api/v1/transactions/recent - Get recent transactions
router.get('/recent', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  
  const { data: transactions, error } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  res.json({
    success: true,
    data: transactions,
    pagination: {
      limit,
      count: transactions.length
    }
  })
}))

export default router
