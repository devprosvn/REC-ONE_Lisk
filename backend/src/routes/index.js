import express from 'express'
import userRoutes from './userRoutes.js'
import profileRoutes from './profileRoutes.js'
import energyRoutes from './energyRoutes.js'
import transactionRoutes from './transactionRoutes.js'
import statsRoutes from './statsRoutes.js'
import offerLifecycleRoutes from './offerLifecycleRoutes.js'

const router = express.Router()

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1'

export const setupRoutes = (app) => {
  // API documentation endpoint
  router.get('/', (req, res) => {
    res.json({
      name: 'REC-ONE P2P Energy Trading API',
      version: API_VERSION,
      description: 'Backend API for REC-ONE blockchain energy trading platform',
      endpoints: {
        users: `/api/${API_VERSION}/users`,
        profiles: `/api/${API_VERSION}/profiles`,
        energy: `/api/${API_VERSION}/energy`,
        transactions: `/api/${API_VERSION}/transactions`,
        stats: `/api/${API_VERSION}/stats`,
        offerLifecycle: `/api/${API_VERSION}/offers/lifecycle`
      },
      documentation: 'https://github.com/rec-one/api-docs',
      status: 'active',
      blockchain: {
        network: 'Lisk Sepolia',
        chainId: 4202,
        contractAddress: process.env.CONTRACT_ADDRESS
      }
    })
  })

  // Mount route modules
  router.use('/users', userRoutes)
  router.use('/profiles', profileRoutes)
  router.use('/energy', energyRoutes)
  router.use('/transactions', transactionRoutes)
  router.use('/stats', statsRoutes)
  router.use('/offers/lifecycle', offerLifecycleRoutes)

  // Mount the router with API version prefix
  app.use(`/api/${API_VERSION}`, router)
  
  // Root redirect
  app.get('/', (req, res) => {
    res.redirect(`/api/${API_VERSION}`)
  })
}

export default router
