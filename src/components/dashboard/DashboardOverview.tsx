// Dashboard overview component - main landing page for authenticated users
import React, { useEffect } from 'react';
import { useAppContext, useUser, useStatistics } from '../../context/AppContext';
import { statisticsService } from '../../services/api';

const DashboardOverview: React.FC = () => {
  const { dispatch } = useAppContext();
  const user = useUser();
  const statistics = useStatistics();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      console.log("🔄 Loading dashboard statistics...");
      const stats = await statisticsService.getUserStatistics();
      console.log("📊 Received statistics:", stats);
      dispatch({ type: 'SET_STATISTICS', payload: stats });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const navigateToSection = (section: string) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: section });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user?.fullName?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-brand-100 text-lg">
              Welcome to your personal document management portal
            </p>
          </div>
          <div className="hidden md:block text-6xl opacity-20">
            📄
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Total Documents</p>
              <h3 className="text-3xl font-bold text-slate-800">
                {statistics?.totalDocuments || statistics?.totalVerified || 0}
              </h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
              📋
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Verified</p>
              <h3 className="text-3xl font-bold text-emerald-600">
                {statistics?.verifiedDocuments || statistics?.successfulVerifications || 0}
              </h3>
            </div>
            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Rejected</p>
              <h3 className="text-3xl font-bold text-red-600">
                {statistics?.rejectedDocuments || 0}
              </h3>
            </div>
            <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-2xl">
              ❌
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Success Rate</p>
              <h3 className="text-3xl font-bold text-brand-600">
                {statistics?.successRate || 0}%
              </h3>
            </div>
            <div className="h-12 w-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center text-2xl">
              📈
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigateToSection('inventory')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl">
                📂
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
              Document Inventory
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              View and manage all your documents
            </p>
          </button>

          <button
            onClick={() => navigateToSection('analytics')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
              Analytics Dashboard
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              View insights and statistics
            </p>
          </button>

          <button
            onClick={() => navigateToSection('verify')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                🔍
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
              Verify Document
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              Upload and verify new documents
            </p>
          </button>

          <button
            onClick={() => navigateToSection('qrVerification')}
            className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl">
                📱
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
              QR Scanner
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              Scan QR codes to verify documents
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;