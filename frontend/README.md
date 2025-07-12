# 🌐 REC-ONE Frontend DApp

Modern Web3 frontend for the REC-ONE P2P Energy Trading Platform, built with **Vanilla TypeScript** and **Ethers.js**.

## 🎨 Design Philosophy

### Sky Blue Gradient Theme
- **Inspiration**: Clean energy and blue skies
- **Color Palette**: White to sky blue gradient
- **UX Principle**: 1-click interactions for all operations
- **Responsive**: Mobile-first design approach

### User Experience Goals
- ✨ **Simplicity**: Minimal steps for complex blockchain operations
- 🚀 **Speed**: Fast loading and real-time updates
- 🔒 **Security**: Clear transaction confirmations
- 📱 **Accessibility**: Works on all devices and screen sizes

## 🏗️ Technical Architecture

### Technology Stack
- **Framework**: Vite + TypeScript
- **Web3 Library**: Ethers.js v6
- **Styling**: Custom CSS with CSS Variables
- **Build Tool**: Vite for fast development and optimized builds
- **Package Manager**: npm

### Project Structure
```
frontend/
├── src/
│   ├── energy-app.ts      # Main application logic
│   ├── energy-style.css   # Custom styling
│   ├── main.ts           # Original Vite template (unused)
│   └── vite-env.d.ts     # TypeScript declarations
├── public/               # Static assets
├── index.html           # Main HTML template
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

## 🔧 Core Features

### 💼 Wallet Integration
- **MetaMask Connection**: Seamless wallet connection
- **Network Switching**: Automatic Lisk Sepolia setup
- **Account Management**: Real-time balance updates
- **Transaction Signing**: Secure transaction handling

### ⚡ Energy Management
- **Generation Simulation**: Easy energy production input
- **Balance Tracking**: Real-time energy balance display
- **Transaction History**: Visual feedback for all operations

### 🏪 Marketplace Interface
- **Live Offers**: Real-time marketplace updates
- **Offer Creation**: Simple form for selling energy
- **Purchase Flow**: One-click energy purchasing
- **Offer Management**: View and manage your offers

### 🎯 User Interface Components
- **Loading States**: Clear feedback during transactions
- **Status Messages**: Success/error notifications
- **Responsive Cards**: Beautiful card-based layout
- **Interactive Buttons**: Hover effects and animations

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Modern web browser with MetaMask
- Access to deployed smart contract

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Configuration

1. **Update Contract Address**:
   ```typescript
   // In src/energy-app.ts
   const CONTRACT_ADDRESS = '0x66C06efE9B8B44940379F5c53328a35a3Abc3Fe7'
   ```

2. **Network Configuration** (auto-configured):
   ```typescript
   const LISK_SEPOLIA_CONFIG = {
     chainId: '0x106A', // 4202 in hex
     chainName: 'Lisk Sepolia Testnet',
     rpcUrls: ['https://rpc.sepolia-api.lisk.com'],
     // ... other config
   }
   ```

## 🎨 Styling System

### CSS Variables
```css
:root {
  --primary-gradient: linear-gradient(135deg, #ffffff 0%, #e3f2fd 25%, #bbdefb 50%, #90caf9 75%, #64b5f6 100%);
  --accent-blue: #2196f3;
  --light-blue: #64b5f6;
  --text-primary: #1565c0;
  /* ... more variables */
}
```

### Component Classes
- `.card` - Main container styling
- `.btn` - Button components with gradients
- `.input-group` - Form input styling
- `.offer-item` - Marketplace offer cards
- `.loading-overlay` - Transaction loading states

### Responsive Breakpoints
- **Desktop**: > 768px (full grid layout)
- **Mobile**: ≤ 768px (stacked layout)

## 🔄 State Management

### Application State
- **Wallet Connection**: Provider, signer, user address
- **Balances**: ETH balance, energy balance
- **Marketplace**: Active offers, user offers
- **UI State**: Loading states, error messages

### Real-time Updates
- **Balance Refresh**: After each transaction
- **Marketplace Sync**: Automatic offer list updates
- **Event Listening**: MetaMask account/network changes

## 🔒 Security Features

### Input Validation
- **Client-side Validation**: Form input checks
- **Type Safety**: TypeScript for compile-time safety
- **Error Handling**: Comprehensive error catching

### Transaction Safety
- **Confirmation Dialogs**: Clear transaction details
- **Gas Estimation**: Automatic gas calculation
- **Error Recovery**: User-friendly error messages

## 📱 User Interface Guide

### Main Sections

1. **Header**
   - Application title and description
   - Clean gradient background

2. **Wallet Connection**
   - Connect/disconnect MetaMask
   - Network status indicator

3. **Account Overview**
   - Wallet address display
   - ETH and energy balances
   - Real-time updates

4. **Energy Generation**
   - Input field for kWh amount
   - Generate energy button
   - Transaction feedback

5. **Energy Marketplace**
   - Create offer form
   - Active offers list
   - Buy/sell interactions

### Interaction Flow

1. **Connect Wallet** → MetaMask popup → Network switch (if needed)
2. **Generate Energy** → Input amount → Confirm transaction → Balance update
3. **Create Offer** → Input details → Confirm transaction → Marketplace update
4. **Purchase Energy** → Click buy → Confirm payment → Balance update

## 🛠️ Development

### Development Server
```bash
npm run dev
# Runs on http://localhost:5173
```

### Build Process
```bash
npm run build
# Outputs to dist/ directory
```

### Code Structure

#### Main Application (energy-app.ts)
- Wallet connection logic
- Smart contract interaction
- UI event handlers
- State management

#### Styling (energy-style.css)
- CSS custom properties
- Component styling
- Responsive design
- Animation effects

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Static Hosting
The `dist/` folder can be deployed to:
- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop `dist/` folder
- **GitHub Pages**: Upload `dist/` contents
- **Any static host**: Upload `dist/` folder

### Environment Configuration
No environment variables needed - all configuration is in the source code.

## 🔧 Customization

### Theming
Modify CSS variables in `energy-style.css`:
```css
:root {
  --primary-gradient: /* your gradient */;
  --accent-blue: /* your color */;
  /* ... */
}
```

### Contract Integration
Update contract details in `energy-app.ts`:
```typescript
const CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS';
const CONTRACT_ABI = [/* your ABI */];
```

### UI Components
Add new sections by:
1. Adding HTML to `index.html`
2. Adding styles to `energy-style.css`
3. Adding logic to `energy-app.ts`

## 📊 Performance

### Optimization Features
- **Vite Build**: Fast bundling and optimization
- **Tree Shaking**: Unused code elimination
- **CSS Minification**: Compressed stylesheets
- **Asset Optimization**: Optimized images and fonts

### Loading Performance
- **Initial Load**: < 2 seconds on 3G
- **Interaction Response**: < 100ms for UI updates
- **Transaction Feedback**: Immediate loading states

## 🐛 Troubleshooting

### Common Issues

1. **MetaMask Not Detected**
   - Ensure MetaMask is installed
   - Refresh the page
   - Check browser console for errors

2. **Network Connection Issues**
   - Verify Lisk Sepolia RPC is accessible
   - Check MetaMask network settings
   - Try switching networks and back

3. **Transaction Failures**
   - Ensure sufficient ETH balance
   - Check gas price settings
   - Verify contract address is correct

4. **UI Not Updating**
   - Check browser console for errors
   - Verify contract events are being emitted
   - Refresh the page to reset state

## 📚 Resources

- [Vite Documentation](https://vitejs.dev/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Developer Docs](https://docs.metamask.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain responsive design
- Test on multiple browsers
- Keep accessibility in mind

## 📄 License

MIT License - see LICENSE file for details.
