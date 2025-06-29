# APT-UTC: Decentralized Talent Marketplace on Aptos

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Aptos](https://img.shields.io/badge/Aptos-SDK-2.0.1-green.svg)](https://aptos.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)

## Project Overview

APT-UTC is a next-generation decentralized freelance platform built on the Aptos blockchain, now enhanced with advanced AI-powered face anti-spoofing verification, **DAO governance system**, and **dynamic trust scoring mechanism**. The platform ensures that all users are real people, not bots or deepfakes, by leveraging state-of-the-art facial recognition and anti-spoofing models that can be retrained with new data for continuous improvement.

**Key strengths:**
- **AI Face Anti-Spoofing Verification:** Prevents fake profiles and deepfakes using deep learning (PyTorch, dlib, OpenCV) and allows retraining the model with new data to adapt to evolving threats.
- **DAO Governance System:** Community-driven decision making with voting mechanisms for platform upgrades, fee structures, and dispute resolutions.
- **Dynamic Trust Score System:** Real-time reputation scoring based on job completion, client feedback, and community voting, ensuring quality and reliability.
- **On-Chain Security & Transparency:** All job, milestone, DAO proposals, votes, and transaction data is stored directly on-chain, ensuring immutability and eliminating third-party risks.
- **Fully Automated, Trustless Workflow:** Escrow, milestone management, fund distribution, DAO voting, and dispute resolution are all governed by smart contracts, removing the need for intermediaries.
- **Modern Web3 Experience:** Combines identity verification, real-time chat, decentralized file storage (IPFS), DAO participation, and seamless Aptos wallet integration for a frictionless user journey.

## Unique Project Highlights

- **AI-Powered Face Verification:**
  - Uses deep learning to distinguish real faces from spoofed or deepfake images.
  - Supports **retraining the AI model** with new datasets for improved accuracy and adaptability.
  - Integrates OCR to extract and match identity information from official documents.
- **Decentralized Autonomous Organization (DAO):**
  - **Community Governance:** Users can propose and vote on platform improvements, fee structures, and policy changes.
  - **Transparent Voting:** All proposals and votes are recorded on-chain with immutable history.
  - **Stakeholder Participation:** Trust score and job completion history determine voting power.
  - **Automated Execution:** Approved proposals are automatically executed by smart contracts.
- **Dynamic Trust Score & Reputation System:**
  - **Real-time Scoring:** Trust scores update based on job completion, client feedback, and community voting.
  - **Quality Assurance:** Higher trust scores unlock premium features and better job matching.
  - **Anti-Gaming Protection:** Sophisticated algorithms prevent manipulation of the trust system.
  - **Community-Driven:** Users can vote on trust score adjustments for exceptional or problematic behavior.
- **Comprehensive On-Chain Data Management:**
  - Not just NFTs—every job, milestone, escrow, DAO proposal, vote, and event state is stored directly on the Aptos blockchain.
  - All actions (job posting, applying, submitting, accepting, withdrawing, canceling, voting, proposing, etc.) are on-chain transactions, not just message signing.
- **Security & Transparency:**
  - Data is tamper-proof and not reliant on centralized servers.
  - Escrow, fund splitting, DAO governance, and dispute handling are fully automated and transparent.
- **Ready Architecture:**
  - Escrowed funds can be deployed into DeFi protocols to generate yield and share profits with stakeholders.
  - DAO can vote on yield distribution strategies and DeFi integrations.
- **Modern User Experience:**
  - Real-time chat, notifications, profile management, DAO participation, trust score tracking, Aptos wallet integration, and decentralized file storage.

> **APT-UTC is more than a freelance platform—it's a secure, AI-driven identity verification, community-governed, and reputation-based solution for the Web3 community, powered by blockchain, advanced machine learning, and decentralized governance.**

## Key Features

- **AI-Powered Face Verification:**
  - Advanced anti-spoofing (deepfake/fake prevention) using PyTorch, dlib, OpenCV.
  - Retrainable model for continuous improvement and adaptability.
  - OCR extraction and face matching with ID documents.
- **DAO Governance System:**
  - **Proposal Creation:** Users can submit proposals for platform improvements.
  - **Voting Mechanism:** Weighted voting based on trust score and activity.
  - **Execution Engine:** Smart contracts automatically execute approved proposals.
  - **Transparency:** All governance activities are publicly verifiable on-chain.
- **Dynamic Trust Score System:**
  - **Multi-factor Scoring:** Based on job completion rate, client satisfaction, community feedback.
  - **Real-time Updates:** Scores adjust immediately after job completion or community voting.
  - **Feature Unlocking:** Higher scores unlock premium features and better job matching.
  - **Anti-manipulation:** Advanced algorithms prevent gaming of the reputation system.
- **On-Chain Job & Milestone Management:**
  - All job, milestone, escrow, DAO proposals, votes, and event data is stored directly on the Aptos blockchain.
  - Every action (job posting, applying, submitting, accepting, withdrawing, canceling, voting, proposing, etc.) is an on-chain transaction.
- **Trustless, Automated Escrow:**
  - Smart contracts handle all fund flows, milestone approvals, DAO governance, and dispute resolution—no intermediaries needed.
- **Real-Time Communication:**
  - Integrated chat, notifications, and user presence for seamless collaboration.
- **Ready:**
  - Escrowed funds can generate yield via DeFi protocols, with profit sharing for stakeholders.
  - DAO votes on yield distribution and DeFi strategy.
- **Modern Web3 UX:**
  - Decentralized identity, Aptos wallet integration, IPFS file storage, DAO participation, trust score tracking, and a responsive, user-friendly interface.

## Visual Overview

<p align="center">
  <img src="public/logo/logo.png" alt="APT-UTC Logo" width="120"/>
</p>

<p align="center">
  <img src="public/videos/feature-1.mp4" alt="Face Verification Demo" width="400"/>
</p>

*Above: Project logo and a demo of AI-powered face verification in action.*

---

## Links

- [Project Homepage](https://github.com/your-org/aptos)  
- [Aptos Documentation](https://aptos.dev/)
- [Move Language](https://move-language.github.io/move/)
- [PyTorch](https://pytorch.org/)
- [OpenCV](https://opencv.org/)
- [dlib](http://dlib.net/)
- [Flask](https://flask.palletsprojects.com/)
- [Docker](https://www.docker.com/)
- [Firebase](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Pinata (IPFS)](https://www.pinata.cloud/)
- [Petra Wallet](https://petra.app/)

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
aptos/
├── public/                  # Static assets (logo, videos, etc.)
├── src/                     # Frontend source code (React, TypeScript)
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page components (Dashboard, Jobs, Messages, DAO, etc.)
│   ├── context/             # React contexts (Wallet, Profile)
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions (Aptos, IPFS, face verification, etc.)
│   ├── lib/                 # Library configurations (Firebase, etc.)
│   └── contracts/           # Move smart contracts
│       └── job/
│           └── sources/
│               ├── job.move              # Job marketplace contract
│               ├── DAO.move              # DAO governance contract
│               └── Web3WorkProfiles.move # User profiles & trust score contract
│
├── Face/                    # AI Face Verification backend (Python)
│   └── Face_to_Fake_Real/
│       ├── Code/            # Python source code (Flask API, training, inference)
│       │   ├── apiCall_Fake_Real.py     # Flask API for face verification
│       │   ├── train_main.py, train.py  # Model training scripts
│       │   ├── test.py, anti_spoof_predict.py # Inference scripts
│       │   ├── requirements.txt         # Python dependencies
│       │   ├── Dockerfile               # Docker build file
│       │   └── ...                      # Other supporting scripts
│       ├── resources/       # Pretrained models, detection configs
│       │   ├── anti_spoof_models/       # Anti-spoofing model weights (.pth)
│       │   └── detection_model/         # Face detection models (Caffe, prototxt)
│       └── saved_logs/      # Training logs (optional)
│
├── package.json, vite.config.ts, ...    # Frontend config files
└── README.md                            # Project documentation
```

