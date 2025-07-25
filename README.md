<div align="center">
  
# APT-UTC: Decentralized Talent Marketplace on Aptos

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Aptos](https://img.shields.io/badge/Aptos-SDK-2.0.1-green.svg)](https://aptos.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)

</div>

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
  - **MiniFASNet Architecture:** Uses lightweight neural networks with SE (Squeeze-and-Excitation) modules and depth-wise separable convolutions for efficient anti-spoofing detection
  - **Multi-Model Ensemble:** Combines MiniFASNetV1 and MiniFASNetV2 variants for robust classification of real vs fake faces
  - **Face Recognition Pipeline:** Leverages dlib for face detection and generates 128-dimensional face embeddings for identity matching
  - **OCR Document Processing:** Tesseract-based text extraction with Vietnamese language support for ID card information extraction
  - **Real-time Anti-Spoofing:** Classifies faces as real or fake using pre-trained models (2.7_80x80_MiniFASNetV2.pth, 4_0_0_80x80_MiniFASNetV1SE.pth)
  - **Retrainable Models:** PyTorch-based architecture allows continuous model improvement with new datasets to adapt to evolving threats
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
  - **MiniFASNet Anti-Spoofing:** Lightweight neural network architecture with SE modules and depth-wise convolutions
  - **Multi-Model Ensemble:** Combines MiniFASNetV1 and MiniFASNetV2 for robust anti-spoofing detection
  - **Face Recognition Pipeline:** dlib-based face detection and 128-dimensional face encoding
  - **OCR Integration:** Tesseract-based text extraction from ID cards with Vietnamese language support
  - **Real-time Verification:** Face matching with distance threshold (≤0.65) and anti-spoofing classification
  - **Retrainable Architecture:** PyTorch-based models can be retrained with new datasets for continuous improvement
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

*Above: Project logo and a demo of AI-powered face verification in action.*


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
- **Move Smart Contracts** - Custom job marketplace, DAO governance, and profile contracts
- **IPFS Integration** - Decentralized file storage via Pinata
- **Petra Wallet** - Aptos wallet integration

### Database
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Authentication** - User authentication


### AI & Machine Learning (Face Verification)
- **PyTorch 1.13.1** - Deep learning framework for anti-spoofing models
- **MiniFASNet** - Lightweight anti-spoofing neural network architecture
  - MiniFASNetV1 & MiniFASNetV2 variants
  - SE (Squeeze-and-Excitation) modules for attention mechanisms
  - Depth-wise separable convolutions for efficiency
- **Face Recognition 1.3.0** - Face detection and encoding using dlib
- **OpenCV 4.11.0** - Computer vision and image processing
- **dlib 19.24.1** - Face detection and landmark extraction
- **Tesseract OCR** - Optical Character Recognition for ID card text extraction
- **Flask 3.1.1** - Python web framework for AI API
- **Anti-Spoofing Models**:
  - 2.7_80x80_MiniFASNetV2.pth (1.8MB)
  - 4_0_0_80x80_MiniFASNetV1SE.pth (1.8MB)
- **Face Verification Pipeline**:
  - Face detection using dlib
  - Face encoding with 128-dimensional embeddings
  - Anti-spoofing classification (real vs fake)
  - OCR text extraction from ID cards
  - Face matching with distance threshold (≤0.65)

### External Services
- **EmailJS** - Email contact form service
- **Pinata** - IPFS file upload and management

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing
- **Docker** - Containerization for AI services

### Top contributors build web:
<a href="https://github.com/dmt041104111003/aptos/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dmt041104111003/aptos" alt="contrib.rocks image" />
</a>

## License

[MIT](LICENSE)
