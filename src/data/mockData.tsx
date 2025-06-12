
export interface Profile {
  id: string;
  name: string;
  avatar: string;
  did?: string;
  lensHandle?: string;
  skills?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  rating?: number;
  completedJobs?: number;
}

export interface JobPost {
  id: string;
  title: string;
  description: string;
  client: Profile;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  duration: string;
  skills: string[];
  category: string;
  postedAt: string;
  location: 'remote' | 'onsite' | 'hybrid';
  immediate: boolean;
}

// Mock client profiles
export const mockClients: Profile[] = [
  {
    id: '1',
    name: 'Decentralia Labs',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Decentralia&backgroundColor=9b87f5',
    did: 'did:ethr:0x1234567890abcdef',
    lensHandle: '@decentralia',
    rating: 4.8,
    completedJobs: 24
  },
  {
    id: '2',
    name: 'Blockchain Ventures',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Blockchain&backgroundColor=7E69AB',
    did: 'did:ethr:0xabcdef1234567890',
    lensHandle: '@blockchainventures',
    rating: 4.6,
    completedJobs: 18
  },
  {
    id: '3',
    name: 'CryptoDesign Co',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=CryptoDesign&backgroundColor=6E59A5',
    did: 'did:ethr:0x9876543210abcdef',
    lensHandle: '@cryptodesign',
    rating: 4.9,
    completedJobs: 32
  },
  {
    id: '4',
    name: 'NFT Creators Guild',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=NFTCreators&backgroundColor=D6BCFA',
    did: 'did:ethr:0xabcdef0987654321',
    lensHandle: '@nftcreators',
    rating: 4.7,
    completedJobs: 41
  },
  {
    id: '5',
    name: 'DeFi Protocol',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=DeFiProtocol&backgroundColor=9b87f5',
    did: 'did:ethr:0x1234abcdef567890',
    lensHandle: '@defiprotocol',
    rating: 4.5,
    completedJobs: 15
  }
];

// Mock job postings
export const mockJobs: JobPost[] = [
  {
    id: '1',
    title: 'Smart Contract Developer for NFT Marketplace',
    description: 'We need an experienced Solidity developer to help us build a new NFT marketplace with royalty features and multi-chain support.',
    client: mockClients[0],
    budget: {
      min: 2000,
      max: 5000,
      currency: 'USDC'
    },
    duration: '2-4 weeks',
    skills: ['Solidity', 'ERC-721', 'ERC-1155', 'OpenZeppelin'],
    category: 'Smart Contract Development',
    postedAt: '2h ago',
    location: 'remote',
    immediate: true
  },
  {
    id: '2',
    title: 'Web3 Frontend Developer',
    description: 'Looking for a React developer familiar with ethers.js and web3 wallet integrations to build the frontend of our DeFi application.',
    client: mockClients[1],
    budget: {
      min: 1500,
      max: 3000,
      currency: 'ETH'
    },
    duration: '1-2 months',
    skills: ['React', 'TypeScript', 'ethers.js', 'Tailwind CSS'],
    category: 'Frontend Development',
    postedAt: '5h ago',
    location: 'remote',
    immediate: false
  },
  {
    id: '3',
    title: 'UI/UX Designer for DeFi Dashboard',
    description: 'Create a modern, intuitive dashboard design for our DeFi protocol that displays user positions, farming opportunities, and analytics.',
    client: mockClients[2],
    budget: {
      min: 1000,
      max: 2500,
      currency: 'USDC'
    },
    duration: '2 weeks',
    skills: ['UI/UX Design', 'Figma', 'Web3 Design', 'Dashboard Design'],
    category: 'Design',
    postedAt: '1d ago',
    location: 'remote',
    immediate: true
  },
  {
    id: '4',
    title: 'Smart Contract Auditor',
    description: 'We need a security expert to audit our new DeFi protocol contracts before mainnet deployment.',
    client: mockClients[3],
    budget: {
      min: 3000,
      max: 7000,
      currency: 'ETH'
    },
    duration: '1-2 weeks',
    skills: ['Smart Contract Security', 'Audit', 'Solidity', 'DeFi'],
    category: 'Security',
    postedAt: '3d ago',
    location: 'remote',
    immediate: false
  },
  {
    id: '5',
    title: 'Technical Content Writer for Web3 Education',
    description: 'Create engaging, technical articles explaining our protocol and blockchain concepts to both technical and non-technical audiences.',
    client: mockClients[4],
    budget: {
      min: 500,
      max: 1500,
      currency: 'USDC'
    },
    duration: 'Ongoing',
    skills: ['Content Writing', 'Technical Writing', 'Blockchain Knowledge', 'Education'],
    category: 'Content',
    postedAt: '6h ago',
    location: 'remote',
    immediate: false
  }
];
