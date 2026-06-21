// API service layer to maintain compatibility with existing backend
import { User, UserStatistics, VerificationResponse, QRCheckResponse, QRVerifyResponse } from '../types';
import { withNetworkRetry } from '../utils/retry';

const API_BASE_URL = 'http://localhost:5000/api';

// Enhanced error handling for API responses
class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use the default message
    }
    
    throw new APIError(errorMessage, response.status);
  }
  
  return response.json();
}

// Authentication Services
export const authService = {
  async signup(userData: { fullName: string; email: string; phone: string; password: string }) {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      return handleResponse(response);
    });
  },

  async signin(credentials: { email: string; password: string }) {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      return handleResponse(response);
    });
  },

  async logout() {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      return handleResponse(response);
    });
  },
};

// Profile Services
export const profileService = {
  async getProfile(): Promise<User> {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new APIError('Failed to fetch profile', response.status);
      }
      return handleResponse<User>(response);
    });
  },

  async updateProfile(profileData: { fullName: string; email: string; phone: string }) {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
        credentials: 'include'
      });
      return handleResponse(response);
    });
  },

  async linkWallet(walletAddress: string) {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/profile/link-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
        credentials: 'include'
      });
      return handleResponse(response);
    });
  },
};

// Statistics Services
export const statisticsService = {
  async getUserStatistics(): Promise<UserStatistics> {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/stats`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new APIError('Failed to fetch statistics', response.status);
      }
      return handleResponse<UserStatistics>(response);
    });
  },
};

// Document Verification Services
export const verificationService = {
  async verifyDocument(formData: FormData): Promise<VerificationResponse> {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      return handleResponse<VerificationResponse>(response);
    });
  },

  async checkQRStatus(qrId: string): Promise<QRCheckResponse> {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/qr-check?id=${qrId}`, {
        credentials: 'include'
      });
      return handleResponse<QRCheckResponse>(response);
    });
  },

  async verifyQRSignature(data: {
    qrId: string;
    walletAddress: string;
    signature: string;
    message: string;
  }): Promise<QRVerifyResponse> {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/qr-verify-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return handleResponse<QRVerifyResponse>(response);
    });
  },
};

// Document Services (for inventory management)
export const documentService = {
  // Fetch user's verified documents from the database
  async getUserDocuments() {
    return withNetworkRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new APIError('Failed to fetch documents', response.status);
      }
      return handleResponse(response);
    });
  },

  async getDocumentFromIPFS(ipfsHash: string) {
    return withNetworkRetry(async () => {
      // Use Pinata gateway to fetch document
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      const response = await fetch(gatewayUrl);
      
      if (!response.ok) {
        throw new APIError(`Failed to fetch document from IPFS: ${response.statusText}`, response.status);
      }
      
      return response;
    }, {
      maxAttempts: 2, // IPFS can be slower, so fewer retries
      delay: 2000
    });
  },
};

// Utility functions
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // Create toast notification (compatible with existing toast system)
  const event = new CustomEvent('showToast', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
};

export const toggleLoading = (show: boolean) => {
  // Dispatch loading state change
  const event = new CustomEvent('toggleLoading', {
    detail: { show }
  });
  window.dispatchEvent(event);
};

// Export the APIError class for use in components
export { APIError };