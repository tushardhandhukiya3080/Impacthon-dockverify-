// Main Application component - User Portal Redesign
import React, { useEffect } from 'react';
import { AppProvider, useAppContext, useUser, useUI } from './context/AppContext';
import { profileService } from './services/api';
import UserPortalLayout from './components/layout/UserPortalLayout';
import DocumentInventory from './components/inventory/DocumentInventory';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ErrorBoundary from './components/common/ErrorBoundary';

// Import existing components (preserved from original system)
import GuestLandingPage from './components/guest/GuestLandingPage';
import AuthenticationPage from './components/auth/AuthenticationPage';
import DashboardOverview from './components/dashboard/DashboardOverview';
import DocumentVerification from './components/verification/DocumentVerification';
import QRScanner from './components/qr/QRScanner';
import UserProfile from './components/profile/UserProfile';
import Settings from './components/settings/Settings';

// Main App Content Component
const AppContent: React.FC = () => {
  const { dispatch } = useAppContext();
  const user = useUser();
  const ui = useUI();

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const userProfile = await profileService.getProfile();
      dispatch({ type: 'SET_USER', payload: userProfile });
    } catch (error) {
      // User not authenticated - stay on guest page
      console.log('User not authenticated');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Show loading state
  if (ui.loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  // Show guest pages if not authenticated
  if (!user) {
    if (ui.currentView === 'auth') {
      return <AuthenticationPage />;
    }
    return <GuestLandingPage />;
  }

  // Render main dashboard content based on current view
  const renderDashboardContent = () => {
    switch (ui.currentView) {
      case 'home':
        return <DashboardOverview />;
      
      case 'inventory':
        return <DocumentInventory />;
      
      case 'analytics':
        return <AnalyticsDashboard />;
      
      case 'verify':
        return <DocumentVerification />;
      
      case 'qrVerification':
        return <QRScanner />;
      
      case 'profile':
        return <UserProfile />;
      
      case 'settings':
        return <Settings />;
      
      default:
        return <DashboardOverview />;
    }
  };

  // Authenticated user dashboard
  return (
    <UserPortalLayout>
      <ErrorBoundary>
        {renderDashboardContent()}
      </ErrorBoundary>
    </UserPortalLayout>
  );
};

// Main App Component with Provider
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="App">
          <AppContent />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;