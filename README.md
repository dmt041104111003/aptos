# APT-UTC: Decentralized Talent Marketplace on Aptos

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Aptos](https://img.shields.io/badge/Aptos-SDK-2.0.1-green.svg)](https://aptos.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)

## Project Overview

APT-UTC is a next-generation decentralized freelance platform built on the Aptos blockchain. It empowers clients and freelancers to collaborate transparently, securely, and efficiently, leveraging smart contracts for milestone-based payments, escrow, and trustless interactions. The platform is designed for the future of work in the Web3 era, with a focus on security, automation, and community-driven growth.

## Key Features

### Core Functionality
- **Decentralized Job Posting:** Clients can post jobs with detailed requirements, milestones, and deadlines. All job data is stored on-chain and/or IPFS for transparency and immutability.
- **Milestone Management:** Each job is divided into milestones with individual deadlines and escrowed payments, ensuring fair progress tracking and risk mitigation for both parties.
- **Escrow & Staking:** Funds for milestones are locked in a secure on-chain escrow. Workers must stake tokens to apply, aligning incentives and reducing spam applications.
- **Application & Approval Flow:** Workers apply by staking tokens. Clients review and approve candidates. Unsuccessful or expired applications allow workers to withdraw their stake.
- **Automated Fund Distribution:** Upon milestone completion and approval, funds are automatically released to the worker. In case of disputes or inactivity, the contract enforces fair fund splits and refunds.
- **Timeout & Dispute Handling:** If a milestone deadline passes without action, the contract allows for timeout claims, worker removal, or job reopening, all governed by transparent rules.

### Real-time Communication
- **Live Chat System:** Built with Firebase Firestore for real-time messaging between clients and workers
- **Message Status Tracking:** Sent, delivered, and read status indicators
- **User Presence:** Real-time online/offline status with last seen timestamps
- **Message Recall:** Users can recall their own messages with confirmation dialogs
- **Conversation Management:** Hide conversations without deleting data

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing

### UI Components
- **Shadcn/ui** - High-quality, accessible UI components
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Beautiful, customizable icons
- **Sonner** - Toast notifications

### Web3 & Blockchain
- **Aptos SDK** - Official Aptos TypeScript SDK
- **Move Smart Contracts** - Custom job marketplace contracts
- **IPFS Integration** - Decentralized file storage via Pinata
- **Petra Wallet** - Aptos wallet integration

### Backend & Database
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Authentication** - User authentication
- **Express.js** - API server (for email services)

### AI & External Services
- **Groq SDK** - AI assistant integration
- **EmailJS** - Email contact form service
- **Pinata** - IPFS file upload and management

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui components
│   └── ui2/            # Custom components
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Jobs.tsx        # Job marketplace
│   ├── Messages.tsx    # Real-time chat
│   ├── PostJob.tsx     # Job creation
│   └── Settings.tsx    # User settings
├── context/            # React contexts
│   ├── WalletContext.tsx    # Aptos wallet management
│   └── ProfileContext.tsx   # User profile data
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
│   ├── aptosUtils.ts   # Aptos blockchain utilities
│   ├── ipfs.ts         # IPFS integration
│   └── pinata.ts       # Pinata API utilities
├── lib/                # Library configurations
│   └── firebase.ts     # Firebase configuration
└── contracts/          # Move smart contracts
    └── job/
        └── sources/
            ├── job.move              # Job marketplace contract
            └── Web3WorkProfiles.move # User profiles contract
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Aptos wallet (Petra recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aptos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id

   # EmailJS Configuration
   VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
   VITE_EMAILJS_USER_ID=your_emailjs_user_id

   # Groq AI Configuration
   VITE_GROQ_API_KEY=your_groq_api_key

   # Pinata Configuration
   VITE_PINATA_JWT=your_pinata_jwt
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Smart Contracts

### Job Marketplace Contract
- **Address:** `0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea`
- **Module:** `job_marketplace_v29`
- **Features:** Job posting, milestone management, escrow, dispute resolution

### Web3 Profiles Contract
- **Address:** `0xabec4e453af5c908c5d7f0b7b59931dd204e2bc5807de364629b4e32eb5fafea`
- **Module:** `web3_profiles_v29`
- **Features:** Decentralized identity (DID), user profiles, reputation system

## DeFi Vision & Future Integration

This project is designed with DeFi principles at its core:

- **Escrow Yield Generation:** Funds locked in job escrow can be deployed into DeFi protocols to earn yield while jobs are in progress
- **Staking Rewards:** Worker stake pools can be used for liquidity mining or yield farming
- **Fee Sharing & Platform Sustainability:** A portion of the yield or transaction fees can be distributed to platform stakeholders
- **Programmable Money Flows:** All fund movements are governed by smart contracts, enabling future integrations with lending, insurance, or reputation-based DeFi modules

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Aptos Documentation](https://aptos.dev/)
- [Move Language](https://move-language.github.io/move/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/)

## Support

For support, email daomanhtung4102003@gmail.com.

---

**Get started, contribute, or reach out to join the future of decentralized work!** 
