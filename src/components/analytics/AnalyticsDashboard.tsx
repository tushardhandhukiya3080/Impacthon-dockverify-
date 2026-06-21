// Analytics Dashboard component with real-time statistics
import React, { useState, useEffect } from 'react';
import { useAppContext, useStatistics, useDocuments } from '../../context/AppContext';
import { statisticsService } from '../../services/api';
import StatisticsCards from './StatisticsCards';
import ChartVisualization from './ChartVisualization';
import ActivityFeed from './ActivityFeed';

const AnalyticsDashboard: React.FC = () => {
  const { dispatch } = useAppContext();
  const statistics = useStatistics();
  const documents = useDocuments();
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Load statistics on component mount
  useEffect(() => {
    loadStatistics();
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadStatistics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const stats = await statisticsService.getUserStatistics();
      dispatch({ type: 'SET_STATISTICS', payload: stats });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load statistics:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load analytics data' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const formatLastUpdated = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Calculate derived statistics from documents
  const derivedStats = React.useMemo(() => {
    if (!statistics) return null;

    const totalDocuments = documents.length;
    const verifiedDocuments = documents.filter(doc => doc.status === 'Verified').length;
    const rejectedDocuments = documents.filter(doc => doc.status === 'Rejected').length;
    const pendingDocuments = documents.filter(doc => doc.status === 'Pending').length;

    // Calculate success rate
    const successRate = totalDocuments > 0 ? Math.round((verifiedDocuments / totalDocuments) * 100) : 0;

    // Calculate recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentDocuments = documents.filter(doc => doc.uploadDate >= sevenDaysAgo);
    
    // Generate recent activity items for ActivityFeed
    const recentActivityItems = recentDocuments
      .slice(0, 5) // Limit to 5 most recent
      .map(doc => ({
        id: `activity-${doc.id}`,
        type: 'upload' as const,
        document: doc,
        timestamp: doc.uploadDate,
        description: `${doc.status === 'Verified' ? 'Verified' : 'Uploaded'} ${doc.docType}`,
      }));

    return {
      ...statistics,
      totalDocuments,
      verifiedDocuments,
      rejectedDocuments,
      pendingDocuments,
      successRate,
      recentActivity: recentActivityItems,
      recentActivityCount: recentDocuments.length, // For StatisticsCards
      
      // Additional metrics from backend
      ipfsUploads: documents.filter(doc => doc.documentCID).length,
      blockchainTransactions: documents.filter(doc => doc.transactionHash).length,
    };
  }, [statistics, documents]);

  if (!derivedStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            📊 Analytics Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Real-time insights into your document verification activities
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoRefresh}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-brand-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-slate-600">Auto-refresh</span>
          </div>

          {/* Refresh interval selector */}
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          )}

          {/* Manual refresh */}
          <button
            onClick={loadStatistics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Last Updated Indicator */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Last updated: {formatLastUpdated(lastUpdated)}
          {autoRefresh && (
            <span className="text-brand-600">
              (auto-refreshing every {refreshInterval / 1000}s)
            </span>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <StatisticsCards statistics={derivedStats} loading={loading} />

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartVisualization
          statistics={derivedStats}
          documents={documents}
          type="status-distribution"
        />
        <ChartVisualization
          statistics={derivedStats}
          documents={documents}
          type="document-types"
        />
      </div>

      {/* Monthly Activity Chart */}
      <ChartVisualization
        statistics={derivedStats}
        documents={documents}
        type="monthly-activity"
      />

      {/* Activity Feed */}
      <ActivityFeed documents={documents} />
    </div>
  );
};

export default AnalyticsDashboard;