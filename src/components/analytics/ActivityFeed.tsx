// Activity feed component for recent document activities
import React from 'react';
import { Document } from '../../types';
import { getStatusColor, getStatusIcon } from '../../config/theme';

interface ActivityFeedProps {
  documents: Document[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ documents }) => {
  // Generate activity items from documents
  const generateActivities = () => {
    const uploadActivities = documents.map(doc => ({
      id: `upload-${doc.id}`,
      type: 'upload' as const,
      document: doc,
      timestamp: doc.uploadDate,
      description: `Uploaded ${doc.docType}`,
    }));

    const verificationActivities = documents
      .filter(doc => doc.status === 'Verified')
      .map(doc => ({
        id: `verify-${doc.id}`,
        type: 'verification' as const,
        document: doc,
        timestamp: doc.submittedAt,
        description: `${doc.docType} verified successfully`,
      }));

    const activities = [...uploadActivities, ...verificationActivities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10); // Show last 10 activities

    return activities;
  };

  const activities = generateActivities();

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'upload':
        return (
          <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
          </div>
        );
      case 'verification':
        return (
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
      case 'download':
        return (
          <div className="bg-purple-100 text-purple-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-slate-100 text-slate-600 p-2 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
        );
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Recent Activity</h3>
          <p className="text-slate-600">
            Your document activities will appear here once you start uploading and verifying documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
          <span className="text-sm text-slate-500">{activities.length} recent activities</span>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Activity Icon */}
              {getActivityIcon(activity.type, activity.document.status)}

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-600">
                        {activity.document.name}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${getStatusColor(activity.document.status)}20`,
                          color: getStatusColor(activity.document.status),
                        }}
                      >
                        {getStatusIcon(activity.document.status)}
                        {activity.document.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-sm text-slate-500">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Additional Details */}
                {activity.type === 'verification' && activity.document.transactionHash && (
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    Tx: {activity.document.transactionHash.slice(0, 10)}...
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
        <button className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;