import Joi from 'joi'

export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorDetails
      })
    }

    req[property] = value
    next()
  }
}

export const validateWalletAddress = (req, res, next) => {
  const walletAddress = req.params.walletAddress || req.body.walletAddress
  
  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      message: 'Wallet address is required'
    })
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format'
    })
  }

  next()
}

export const validateTransactionHash = (req, res, next) => {
  const txHash = req.params.txHash || req.body.txHash
  
  if (!txHash) {
    return res.status(400).json({
      success: false,
      message: 'Transaction hash is required'
    })
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction hash format'
    })
  }

  next()
}

// Common validation schemas
export const schemas = {
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  positiveNumber: Joi.number().positive().required(),
  positiveInteger: Joi.number().integer().positive().required(),
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  })
}
