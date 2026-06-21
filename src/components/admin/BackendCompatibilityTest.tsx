// Backend compatibility test component (for development/testing)
import React, { useState } from 'react';
import { runBackendCompatibilityTests, generateCompatibilityReport, BackendCompatibilityReport } from '../../utils/backendCompatibility';

const BackendCompatibilityTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BackendCompatibilityReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setReport(null);
    
    try {
      const testReport = await runBackendCompatibilityTests();
      setReport(testReport);
    } catch (error) {
      console.error('Failed to run compatibility tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Backend Compatibility Test
          </h2>
          <p className="text-slate-600">
            Validate that all backend endpoints and integrations are working correctly with the new frontend.
          </p>
        </div>

        <div className="p-6">
          {!report && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                Ready to Test Backend Compatibility
              </h3>
              <p className="text-slate-600 mb-6">
                This will test all API endpoints, IPFS connectivity, and MetaMask integration.
              </p>
              <button
                onClick={runTests}
                disabled={isRunning}
                className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running Tests...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Run Compatibility Tests
                  </>
                )}
              </button>
            </div>
          )}

          {report && (
            <div className="space-y-6">
              {/* Summary */}
              <div className={`p-4 rounded-lg border ${getStatusColor(report.overallStatus)}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getStatusIcon(report.overallStatus)}</span>
                  <h3 className="text-lg font-semibold">
                    Overall Status: {report.overallStatus.toUpperCase()}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Tests:</span> {report.totalTests}
                  </div>
                  <div>
                    <span className="font-medium text-emerald-600">Passed:</span> {report.passedTests}
                  </div>
                  <div>
                    <span className="font-medium text-red-600">Failed:</span> {report.failedTests}
                  </div>
                  <div>
                    <span className="font-medium text-orange-600">Warnings:</span> {report.warningTests}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
                <button
                  onClick={runTests}
                  disabled={isRunning}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  Run Again
                </button>
                <button
                  onClick={() => {
                    const reportText = generateCompatibilityReport(report);
                    navigator.clipboard.writeText(reportText);
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Copy Report
                </button>
              </div>

              {/* Detailed Results */}
              {showDetails && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-slate-800">Detailed Results</h4>
                  {report.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getStatusIcon(result.status)}</span>
                          <div>
                            <div className="font-medium">
                              {result.method} {result.endpoint}
                            </div>
                            <div className="text-sm opacity-75">
                              {result.message}
                            </div>
                          </div>
                        </div>
                        {result.responseTime && (
                          <div className="text-xs opacity-60">
                            {result.responseTime}ms
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {(report.failedTests > 0 || report.warningTests > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-blue-800 mb-2">Recommendations</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {report.failedTests > 0 && (
                      <li>• Fix failed endpoints before deploying to production</li>
                    )}
                    {report.warningTests > 0 && (
                      <li>• Review warnings to ensure optimal functionality</li>
                    )}
                    <li>• Ensure backend server is running and accessible</li>
                    <li>• Verify environment variables are properly configured</li>
                    <li>• Check network connectivity for external services (IPFS, blockchain)</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackendCompatibilityTest;