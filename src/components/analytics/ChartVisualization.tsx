// Chart visualization component with comprehensive error handling
import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Document, UserStatistics } from '../../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

interface ChartVisualizationProps {
  statistics: UserStatistics & {
    totalDocuments: number;
    verifiedDocuments: number;
    unverifiedDocuments: number;
    legalizedDocuments: number;
    pendingDocuments: number;
    rejectedDocuments: number;
    successRate: number;
    recentActivityCount: number;
  };
  documents: Document[];
  type: 'status-distribution' | 'document-types' | 'monthly-activity';
}

// Fallback component for chart rendering failures
const ChartFallback: React.FC<{ 
  title: string; 
  error?: string; 
  onRetry?: () => void;
}> = ({ title, error, onRetry }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-6">
    <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-4xl mb-4">📊</div>
      <h4 className="text-lg font-medium text-slate-700 mb-2">Chart Unavailable</h4>
      <p className="text-slate-500 mb-4 max-w-sm">
        {error || 'Unable to render chart at this time. The data is still being processed.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  statistics,
  documents,
  type,
}) => {
  const [chartError, setChartError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const chartRef = useRef<any>(null);

  // Reset error when props change
  useEffect(() => {
    setChartError(null);
  }, [statistics, documents, type]);

  const handleRetry = () => {
    setChartError(null);
    setRetryCount(prev => prev + 1);
  };

  const renderChart = () => {
    try {
      switch (type) {
        case 'status-distribution':
          return renderStatusDistribution();
        case 'document-types':
          return renderDocumentTypes();
        case 'monthly-activity':
          return renderMonthlyActivity();
        default:
          throw new Error(`Unknown chart type: ${type}`);
      }
    } catch (error: any) {
      console.error('Chart rendering error:', error);
      setChartError(error.message || 'Failed to render chart');
      return null;
    }
  };

  const renderStatusDistribution = () => {
    const data = {
      labels: ['Verified', 'Pending', 'Legalized', 'Unverified', 'Rejected'],
      datasets: [
        {
          data: [
            statistics.verifiedDocuments,
            statistics.pendingDocuments,
            statistics.legalizedDocuments,
            statistics.unverifiedDocuments,
            statistics.rejectedDocuments,
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(234, 179, 8, 1)',
            'rgba(239, 68, 68, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    };

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Document Status Distribution</h3>
        <div className="h-64">
          <Pie ref={chartRef} data={data} options={options} />
        </div>
      </div>
    );
  };

  const renderDocumentTypes = () => {
    // Group documents by type
    const typeCount = documents.reduce((acc, doc) => {
      acc[doc.docType] = (acc[doc.docType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const data = {
      labels: Object.keys(typeCount),
      datasets: [
        {
          label: 'Number of Documents',
          data: Object.values(typeCount),
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `${context.parsed.y} document${context.parsed.y !== 1 ? 's' : ''}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    };

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Documents by Type</h3>
        <div className="h-64">
          <Bar ref={chartRef} data={data} options={options} />
        </div>
      </div>
    );
  };

  const renderMonthlyActivity = () => {
    // Generate monthly activity data from documents
    const monthlyData = documents.reduce((acc, doc) => {
      const month = doc.uploadDate.toISOString().slice(0, 7); // YYYY-MM format
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toISOString().slice(0, 7));
    }

    const data = {
      labels: months.map(month => {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
      datasets: [
        {
          label: 'Documents Uploaded',
          data: months.map(month => monthlyData[month] || 0),
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `${context.parsed.y} document${context.parsed.y !== 1 ? 's' : ''} uploaded`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    };

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Upload Activity</h3>
        <div className="h-64">
          <Line ref={chartRef} data={data} options={options} />
        </div>
      </div>
    );
  };

  // Show fallback if there's an error
  if (chartError) {
    const titles = {
      'status-distribution': 'Document Status Distribution',
      'document-types': 'Documents by Type',
      'monthly-activity': 'Monthly Upload Activity',
    };

    return (
      <ChartFallback 
        title={titles[type]} 
        error={chartError}
        onRetry={handleRetry}
      />
    );
  }

  // Show fallback if no data
  if (statistics.totalDocuments === 0) {
    const titles = {
      'status-distribution': 'Document Status Distribution',
      'document-types': 'Documents by Type',
      'monthly-activity': 'Monthly Upload Activity',
    };

    return (
      <ChartFallback 
        title={titles[type]} 
        error="No documents available to display in chart"
      />
    );
  }

  const chart = renderChart();
  
  // If chart rendering failed, show fallback
  if (!chart) {
    const titles = {
      'status-distribution': 'Document Status Distribution',
      'document-types': 'Documents by Type',
      'monthly-activity': 'Monthly Upload Activity',
    };

    return (
      <ChartFallback 
        title={titles[type]} 
        error={chartError || 'Chart rendering failed'}
        onRetry={handleRetry}
      />
    );
  }

  return chart;
};

export default ChartVisualization;