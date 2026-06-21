// Statistics cards component for analytics dashboard
import React from 'react';
import { UserStatistics } from '../../types';
import { getStatusColor } from '../../config/theme';

interface StatisticsCardsProps {
  statistics: UserStatistics & {
    totalDocuments: number;
    verifiedDocuments: number;
    rejectedDocuments: number;
    pendingDocuments: number;
    successRate: number;
    recentActivityCount: number;
    ipfsUploads?: number;
    blockchainTransactions?: number;
  };
  loading: boolean;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ statistics, loading }) => {
  const cards = [
    {
      title: 'Total Documents',
      value: statistics.totalDocuments,
      icon: '📄',
      color: 'slate',
      description: 'All uploaded documents',
      trend: null,
    },
    {
      title: 'Verified Documents',
      value: statistics.verifiedDocuments,
      icon: '✅',
      color: 'emerald',
      description: 'Successfully verified',
      trend: statistics.verifiedDocuments > 0 ? '+' : null,
    },
    {
      title: 'Success Rate',
      value: `${statistics.successRate}%`,
      icon: '📈',
      color: statistics.successRate >= 80 ? 'emerald' : statistics.successRate >= 60 ? 'orange' : 'red',
      description: 'Verification success rate',
      trend: null,
    },
    {
      title: 'Rejected Documents',
      value: statistics.rejectedDocuments,
      icon: '❌',
      color: 'red',
      description: 'Failed verification',
      trend: null,
    },
    {
      title: 'IPFS Uploads',
      value: statistics.ipfsUploads || 0,
      icon: '🌐',
      color: 'blue',
      description: 'Stored on IPFS',
      trend: null,
    },
    {
      title: 'Recent Activity',
      value: statistics.recentActivityCount,
      icon: '🔄',
      color: 'purple',
      description: 'Last 7 days',
      trend: null,
    },
  ];

  const AnimatedValue: React.FC<{ value: string | number; duration?: number }> = ({ 
    value, 
    duration = 1000 
  }) => {
    const [displayValue, setDisplayValue] = React.useState(0);
    const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value;

    React.useEffect(() => {
      if (loading) return;

      let startTime: number;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        setDisplayValue(Math.floor(progress * numericValue));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }, [numericValue, loading, duration]);

    if (typeof value === 'string' && value.includes('%')) {
      return <span>{displayValue}%</span>;
    }
    
    return <span>{displayValue}</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.title}
          className={`bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-300 ${
            loading ? 'animate-pulse' : 'animate-fade-in'
          }`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-${card.color}-100`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
            {card.trend && (
              <span className={`text-sm font-medium px-2 py-1 rounded-full bg-${card.color}-100 text-${card.color}-700`}>
                {card.trend}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-medium text-slate-600">{card.title}</h3>
            <div className={`text-3xl font-bold text-${card.color}-700`}>
              {loading ? (
                <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <AnimatedValue value={card.value} />
              )}
            </div>
            <p className="text-xs text-slate-500">{card.description}</p>
          </div>

          {/* Progress bar for percentage values */}
          {typeof card.value === 'string' && card.value.includes('%') && !loading && (
            <div className="mt-4">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`bg-${card.color}-500 h-2 rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${statistics.successRate}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatisticsCards;