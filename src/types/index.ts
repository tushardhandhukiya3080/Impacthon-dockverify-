// Core TypeScript interfaces for User Portal Redesign

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  walletAddress?: string | null;
  profileImage?: string;
  preferences?: {
    theme: 'light' | 'dark';
    defaultView: 'grid' | 'list';
    autoRefresh: boolean;
  };
}

export interface Document {
  id: string;
  docId: string;
  name: string;
  docNumber: string;
  docType: string;
  ipfsHash: string;
  documentCID?: string | null;
  uploadDate: Date;
  submittedAt: Date;
  status: 'Verified' | 'Unverified' | 'Legalized' | 'Pending' | 'Rejected';
  fileType: string;
  fileSize?: number;
  fileHash: string;
  transactionHash?: string | null;
  qrId?: string | null;
  metadata?: {
    uploader: string;
    verificationDate?: Date;
    legalizationDate?: Date;
  };
}

export interface UserStatistics {
  totalVerified: number;
  successfulVerifications: number;
  pendingRequests: number;
  totalDocuments: number;
  verifiedDocuments: number;
  unverifiedDocuments: number;
  legalizedDocuments: number;
  rejectedDocuments: number;
  pendingDocuments: number;
  successRate: number;
  recentActivity?: ActivityItem[];
  recentActivityCount?: number;
  storageUsed?: number;
  documentsByType?: { [key: string]: number };
  totalIPFSUploads?: number;
  totalBlockchainTransactions?: number;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'verification' | 'download';
  document: Document;
  timestamp: Date;
  description: string;
}

export interface AppState {
  user: User | null;
  documents: Document[];
  statistics: UserStatistics | null;
  ui: {
    sidebarOpen: boolean;
    currentView: string;
    loading: boolean;
    error: string | null;
  };
  wallet: {
    connected: boolean;
    address: string | null;
    network: string | null;
  };
}

export interface DocumentFilters {
  status: ('Verified' | 'Unverified' | 'Legalized' | 'Pending' | 'Rejected')[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
  sortBy: 'name' | 'date' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface ChartDataset {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

export interface StatisticsChartData {
  statusDistribution: ChartDataset;
  monthlyActivity: ChartDataset;
  documentTypes: ChartDataset;
}

export interface ResponsiveBreakpoints {
  mobile: '320px';
  tablet: '768px';
  desktop: '1024px';
  widescreen: '1440px';
}

export interface ComponentResponsiveProps {
  breakpoint: keyof ResponsiveBreakpoints;
  columns: number;
  spacing: string;
  hideOnMobile?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface VerificationResponse {
  message: string;
  verificationStatus: 'Verified' | 'Rejected';
  fileHash: string;
  transactionHash?: string;
  documentCID?: string;
  qrCodeDataUrl?: string;
  qrCodeLink?: string;
}

export interface QRCheckResponse {
  verificationStatus: string;
  docType: string;
  submittedAt: string;
  message: string;
}

export interface QRVerifyResponse {
  message: string;
  docType: string;
  docNumber: string;
  fileHash: string;
  transactionHash: string;
  verificationStatus: string;
  documentCID: string;
}