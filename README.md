# APT-UTC: Decentralized Talent Marketplace on Aptos

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Aptos](https://img.shields.io/badge/Aptos-SDK-2.0.1-green.svg)](https://aptos.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)

## Project Overview

APT-UTC is a next-generation decentralized freelance platform built on the Aptos blockchain, now enhanced with advanced AI-powered face anti-spoofing verification. The platform ensures that all users are real people, not bots or deepfakes, by leveraging state-of-the-art facial recognition and anti-spoofing models that can be retrained with new data for continuous improvement.

**Key strengths:**
- **AI Face Anti-Spoofing Verification:** Prevents fake profiles and deepfakes using deep learning (PyTorch, dlib, OpenCV) and allows retraining the model with new data to adapt to evolving threats.
- **On-Chain Security & Transparency:** All job, milestone, and transaction data is stored directly on-chain, ensuring immutability and eliminating third-party risks.
- **Fully Automated, Trustless Workflow:** Escrow, milestone management, fund distribution, and dispute resolution are all governed by smart contracts, removing the need for intermediaries.
- **Modern Web3 Experience:** Combines identity verification, real-time chat, decentralized file storage (IPFS), and seamless Aptos wallet integration for a frictionless user journey.

## Unique Project Highlights

- **AI-Powered Face Verification:**
  - Uses deep learning to distinguish real faces from spoofed or deepfake images.
  - Supports **retraining the AI model** with new datasets for improved accuracy and adaptability.
  - Integrates OCR to extract and match identity information from official documents.
- **Comprehensive On-Chain Data Management:**
  - Not just NFTs—every job, milestone, escrow, and event state is stored directly on the Aptos blockchain.
  - All actions (job posting, applying, submitting, accepting, withdrawing, canceling, etc.) are on-chain transactions, not just message signing.
- **Security & Transparency:**
  - Data is tamper-proof and not reliant on centralized servers.
  - Escrow, fund splitting, and dispute handling are fully automated and transparent.
- **DeFi-Ready Architecture:**
  - Escrowed funds can be deployed into DeFi protocols to generate yield and share profits with stakeholders.
- **Modern User Experience:**
  - Real-time chat, notifications, profile management, Aptos wallet integration, and decentralized file storage.

> **APT-UTC is more than a freelance platform—it's a secure, AI-driven identity verification and anti-fraud solution for the Web3 community, powered by blockchain and advanced machine learning.**

## Key Features

- **AI-Powered Face Verification:**
  - Advanced anti-spoofing (deepfake/fake prevention) using PyTorch, dlib, OpenCV.
  - Retrainable model for continuous improvement and adaptability.
  - OCR extraction and face matching with ID documents.
- **On-Chain Job & Milestone Management:**
  - All job, milestone, escrow, and event data is stored directly on the Aptos blockchain.
  - Every action (job posting, applying, submitting, accepting, withdrawing, canceling, etc.) is an on-chain transaction.
- **Trustless, Automated Escrow:**
  - Smart contracts handle all fund flows, milestone approvals, and dispute resolution—no intermediaries needed.
- **Real-Time Communication:**
  - Integrated chat, notifications, and user presence for seamless collaboration.
- **DeFi-Ready:**
  - Escrowed funds can generate yield via DeFi protocols, with profit sharing for stakeholders.
- **Modern Web3 UX:**
  - Decentralized identity, Aptos wallet integration, IPFS file storage, and a responsive, user-friendly interface.

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
│   ├── pages/               # Page components (Dashboard, Jobs, Messages, etc.)
│   ├── context/             # React contexts (Wallet, Profile)
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions (Aptos, IPFS, face verification, etc.)
│   ├── lib/                 # Library configurations (Firebase, etc.)
│   └── contracts/           # Move smart contracts
│       └── job/
│           └── sources/
│               ├── job.move              # Job marketplace contract
│               └── Web3WorkProfiles.move # User profiles contract
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
   ```