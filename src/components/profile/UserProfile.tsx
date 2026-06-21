// User profile component (preserved functionality)
import React, { useState, useEffect } from 'react';
import { useAppContext, useUser } from '../../context/AppContext';
import { profileService } from '../../services/api';

const UserProfile: React.FC = () => {
  const { dispatch } = useAppContext();
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const profileData = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    try {
      await profileService.updateProfile(profileData);
      dispatch({ type: 'SET_USER', payload: { ...user!, ...profileData } });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkWallet = async () => {
    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        setMessage({ type: 'error', text: 'MetaMask is required. Please install MetaMask extension.' });
        return;
      }

      setWalletLoading(true);
      setMessage(null);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];

      console.log('🔗 Linking wallet:', walletAddress);

      // Link wallet to user account
      await profileService.linkWallet(walletAddress);

      // Update user state
      dispatch({ type: 'SET_USER', payload: { ...user!, walletAddress } });
      setMessage({ type: 'success', text: 'Wallet linked successfully! You can now verify documents with this wallet.' });

    } catch (error: any) {
      console.error('❌ Wallet linking error:', error);
      if (error.message.includes('User rejected')) {
        setMessage({ type: 'error', text: 'MetaMask connection was cancelled. Please try again.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to link wallet' });
      }
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-brand-900 h-32 relative">
          <div className="absolute inset-0 bg-hero-pattern opacity-20 bg-cover bg-center"></div>
        </div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="h-24 w-24 bg-white p-1 rounded-full shadow-lg">
              <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-4xl">
                👤
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Profile Info */}
            <div>
              <h3 className="text-3xl font-bold text-slate-800">
                {user?.fullName || 'User'}
              </h3>
              <p className="text-slate-500 mb-4">{user?.email || 'user@example.com'}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Phone</label>
                  <p className="text-sm text-slate-800">{user?.phone || 'Not provided'}</p>
                </div>
                
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Wallet Status</label>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    user?.walletAddress 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-orange-50 text-orange-700 border border-orange-100'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      user?.walletAddress ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}></span>
                    {user?.walletAddress ? 'Wallet Linked' : 'Wallet Not Linked'}
                  </div>
                  {user?.walletAddress ? (
                    <p className="text-xs text-slate-400 font-mono mt-2 break-all">
                      {user.walletAddress}
                    </p>
                  ) : (
                    <div className="mt-3">
                      <button
                        onClick={handleLinkWallet}
                        disabled={walletLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {walletLoading ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Connecting...
                          </>
                        ) : (
                          <>
                            🔗 Link MetaMask Wallet
                          </>
                        )}
                      </button>
                      <p className="text-xs text-slate-500 mt-2">
                        Link your MetaMask wallet to verify documents and access secure features.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="text-lg font-bold text-slate-800 border-b pb-2">
                  Edit Profile
                </h4>
                
                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      defaultValue={user?.fullName || ''}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={user?.phone || ''}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;