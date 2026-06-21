// Header component with personalized user branding
import React from 'react';
import { User } from '../../types';
import { useWallet } from '../../context/AppContext';

interface HeaderProps {
  user: User | null;
  currentView: string;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, currentView, onToggleSidebar }) => {
  const wallet = useWallet();

  const getViewTitle = (view: string) => {
    switch (view) {
      case 'home': return 'Dashboard Overview';
      case 'inventory': return 'Document Inventory';
      case 'analytics': return 'Analytics Dashboard';
      case 'verify': return 'Verify Document';
      case 'qrVerification': return 'QR Scanner';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
      {/* Mobile Menu Button & Branding */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        
        {/* Mobile User Branding */}
        <div className="md:hidden flex items-center gap-2">
          <div className="bg-gradient-to-br from-brand-400 to-accent-400 p-1.5 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <span className="text-lg font-display font-bold text-brand-700">
            {user?.fullName ? `${user.fullName.split(' ')[0]}'s Portal` : 'User Portal'}
          </span>
        </div>
      </div>

      {/* Desktop View Title */}
      <h2 className="hidden md:block text-2xl font-bold text-slate-800">
        {getViewTitle(currentView)}
      </h2>

      {/* User Info & Wallet Status */}
      <div className="flex items-center gap-4">
        {/* Wallet Status Indicator */}
        {wallet.connected && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-700">
              {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
            </span>
          </div>
        )}

        {/* User Profile Section */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-slate-500">
              {wallet.connected ? 'Wallet Connected' : 'Authorized User'}
            </p>
          </div>
          
          {/* User Avatar */}
          <div className="h-10 w-10 bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
            {user?.fullName ? getUserInitials(user.fullName) : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;