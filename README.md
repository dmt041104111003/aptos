APT - UTC: Decentralized Talent Marketplace on Aptos
====================================================

Introduction
-----------
APT - UTC is a decentralized marketplace designed to connect Web3 freelancers with clients. It features full transaction event tracking for transparency and includes built-in dispute resolution mechanisms.

Key Features
---------------
- Connect Aptos wallet for decentralized identity verification (on-chain DID)
- Build and update personal profiles, stored on IPFS
- Paginated on-chain event history of profile updates
- Transfer profile ownership to another wallet
- AI-powered fake job prevention
- Decentralized messaging system with toxicity detection
- On-chain reputation system with reviews, scoring, and skill verification
- Detailed reputation score calculation display
- Post projects, search for freelancers, and verify profiles directly from the blockchain
- Transparent and secure payments via Move smart contracts
- Project management with pagination and detailed status
- Transaction history storage
- Unified refresh button on Dashboard, MyProfile, and Messages

Technologies
-----------------
- Frontend: Nextjs, Tailwind CSS, Context API
- Wallet/Auth: Aptos Wallet Adapter (Petra)
- State Management: React Context, Custom Hooks
- Blockchain: Aptos Move, Aptos SDK, Aptos REST API
- Storage: IPFS (Pinata)
- AI: Hugging Face Inference API (for detecting toxicity in messages)
- Source Code Management: Git/GitHub

Tasks (major)
-----------------
- Connect Petra wallet for decentralized identity verification (on-chain DID)
- Maintain paginated on-chain event history of profile updates
- Transfer profile ownership to another wallet
- Decentralized messaging system with integrated toxicity detection
- On-chain reputation system with reviews, scoring, and skill verification
- Post projects, search for freelancers, and verify profiles directly from the blockchain
- Transparent and secure payments via Move smart contracts
- Full tracking of all historical data, project activities, and reputation events

In Progress
-----------------
- Dispute resolution module is currently under development, aiming to enable fair and transparent conflict handling between parties
- Freelancers can launch micro-DAOs and issue personal tokens to raise funds, with smart contracts managing capital, milestones, and revenue sharing
- Users contribute to an insurance pool for protection against scams or unfair job cancellations, governed by a DAO and funded via staking yields
- Platform fees are automatically distributed to the DAO treasury, stakers, and active contributors through smart vaults, promoting sustainable value sharing

Local Installation and Setup
-------------------------------
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Develop Move smart contracts:
   ```bash
   aptos move compile
   aptos move test
   ```

Contact and Additional Information
-------------------------
- Smart contracts: `contracts/` directory (Move/Aptos)

Copyright and Intellectual Property
---------------------------
All ideas, designs, source code, and technical solutions are exclusively owned by APT - UTC. Any copying, reuse, or redistribution in any form is strictly prohibited without written consent from APT - UTC.
