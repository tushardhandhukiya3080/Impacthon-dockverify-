// Main layout component with personalized user branding
import React, { ReactNode } from 'react';
import { useAppContext, useUser, useUI } from '../../context/AppContext';
import Header from './Header';
import Sidebar from './Sidebar';

interface UserPortalLayoutProps {
  children: ReactNode;
}

const UserPortalLayout: React.FC<UserPortalLayoutProps> = ({ children }) => {
  const { dispatch } = useAppContext();
  const user = useUser();
  const ui = useUI();

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={ui.sidebarOpen} 
        onToggle={toggleSidebar}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header 
          user={user}
          currentView={ui.currentView}
          onToggleSidebar={toggleSidebar}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
          {ui.loading && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                <p className="mt-4 text-brand-800 font-medium animate-pulse">Processing...</p>
              </div>
            </div>
          )}
          
          {ui.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {ui.error}
              </div>
            </div>
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
};

export default UserPortalLayout;