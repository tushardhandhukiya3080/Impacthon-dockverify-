// Wallet status component that preserves MetaMask integration
import React, { useEffect, useState } from 'react';
import { useAppContext, useWallet } from '../../context/AppContext';
import { profileService, APIError } from '../../services/api';

interface WalletStatusProps {
  showDetails?: boolean;
  className?: string;
}

const WalletStatus: React.FC<WalletStatusProps> = ({ 
  showDetails = true, 
  className = '' 
}) => {
  const { dispatch } = useAppContext();
  const wallet = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check MetaMask connection on component mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          dispatch({
            type: 'SET_WALLET_STATUS',
            payload: {
              connected: true,
              address: accounts[0],
              network: 'ethereum', // Could be enhanced to detect actual network
            },
          });
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setError('Failed to check wallet connection');
      }
    }
  };

  const connectWallet = async () => {
    setError(null);
    
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask and try again.');
      }
      
      const account = accounts[0];

      // Update wallet status
      dispatch({
        type: 'SET_WALLET_STATUS',
        payload: {
          connected: true,
          address: account,
          network: 'ethereum',
        },
      });

      // Link wallet to profile (preserve existing functionality)
      try {
        await profileService.linkWallet(account);
      } catch (error) {
        console.error('Failed to link wallet to profile:', error);
        // Don't show this error to user as wallet connection still succeeded
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      if (error.code === 4001) {
        setError('Connection rejected. Please approve the connection request in MetaMask.');
      } else if (error.code === -32002) {
        setError('Connection request already pending. Please check MetaMask.');
      } else {
        setError(error.message || 'Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setError(null);
    dispatch({
      type: 'SET_WALLET_STATUS',
      payload: {
        connected: false,
        address: null,
        network: null,
      },
    });
  };

  const clearError = () => {
    setError(null);
  };

  if (!showDetails && !wallet.connected && !error) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {wallet.connected ? (
          <>
            {/* Connected Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-emerald-700">
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
              </span>
            </div>
            
            {showDetails && (
              <button
                onClick={disconnectWallet}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                title="Disconnect Wallet"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-xs font-medium text-orange-700">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="flex-1">
            <p>{error}</p>
            {error.includes('MetaMask is not installed') && (
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline mt-1 inline-block"
              >
                Download MetaMask
              </a>
            )}
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletStatus;