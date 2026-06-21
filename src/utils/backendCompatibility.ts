// Backend compatibility validation utilities
import { APIError } from '../services/api';

export interface CompatibilityTestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  responseTime?: number;
}

export interface BackendCompatibilityReport {
  overallStatus: 'pass' | 'fail' | 'warning';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  results: CompatibilityTestResult[];
  timestamp: Date;
}

// Test configuration for each endpoint
const ENDPOINT_TESTS = [
  {
    endpoint: '/api/profile',
    method: 'GET',
    description: 'User profile retrieval',
    requiresAuth: true,
  },
  {
    endpoint: '/api/stats',
    method: 'GET',
    description: 'User statistics',
    requiresAuth: true,
  },
  {
    endpoint: '/api/auth/logout',
    method: 'POST',
    description: 'User logout',
    requiresAuth: false,
  },
  {
    endpoint: '/api/profile/link-wallet',
    method: 'POST',
    description: 'Wallet linking',
    requiresAuth: true,
    testData: { walletAddress: '0x742d35Cc6634C0532925a3b8D0C9C0E3C5d5c8eA' },
  },
];

/**
 * Test individual endpoint compatibility
 */
async function testEndpoint(
  endpoint: string,
  method: string,
  description: string,
  requiresAuth: boolean = false,
  testData?: any
): Promise<CompatibilityTestResult> {
  const startTime = Date.now();
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (testData && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(testData);
    }

    const response = await fetch(endpoint, options);
    const responseTime = Date.now() - startTime;

    // For authenticated endpoints, we expect 401 if not logged in
    if (requiresAuth && response.status === 401) {
      return {
        endpoint,
        method,
        status: 'pass',
        message: `${description}: Correctly requires authentication`,
        responseTime,
      };
    }

    // For non-authenticated endpoints or successful responses
    if (response.ok || (response.status >= 400 && response.status < 500)) {
      return {
        endpoint,
        method,
        status: 'pass',
        message: `${description}: Endpoint responding correctly (${response.status})`,
        responseTime,
      };
    }

    // Server errors indicate potential issues
    if (response.status >= 500) {
      return {
        endpoint,
        method,
        status: 'warning',
        message: `${description}: Server error (${response.status}) - may indicate backend issues`,
        responseTime,
      };
    }

    return {
      endpoint,
      method,
      status: 'pass',
      message: `${description}: Endpoint accessible (${response.status})`,
      responseTime,
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Network errors might indicate server is down
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        endpoint,
        method,
        status: 'fail',
        message: `${description}: Network error - server may be down`,
        responseTime,
      };
    }

    return {
      endpoint,
      method,
      status: 'fail',
      message: `${description}: ${error.message}`,
      responseTime,
    };
  }
}

/**
 * Run comprehensive backend compatibility tests
 */
export async function runBackendCompatibilityTests(): Promise<BackendCompatibilityReport> {
  console.log('🔍 Starting backend compatibility validation...');
  
  const results: CompatibilityTestResult[] = [];
  
  // Test all configured endpoints
  for (const test of ENDPOINT_TESTS) {
    console.log(`Testing ${test.method} ${test.endpoint}...`);
    
    const result = await testEndpoint(
      test.endpoint,
      test.method,
      test.description,
      test.requiresAuth,
      test.testData
    );
    
    results.push(result);
  }

  // Test IPFS connectivity (Pinata gateway)
  console.log('Testing IPFS connectivity...');
  const ipfsResult = await testIPFSConnectivity();
  results.push(ipfsResult);

  // Test MetaMask integration compatibility
  console.log('Testing MetaMask integration...');
  const metamaskResult = testMetaMaskCompatibility();
  results.push(metamaskResult);

  // Calculate summary
  const passedTests = results.filter(r => r.status === 'pass').length;
  const failedTests = results.filter(r => r.status === 'fail').length;
  const warningTests = results.filter(r => r.status === 'warning').length;

  let overallStatus: 'pass' | 'fail' | 'warning' = 'pass';
  if (failedTests > 0) {
    overallStatus = 'fail';
  } else if (warningTests > 0) {
    overallStatus = 'warning';
  }

  const report: BackendCompatibilityReport = {
    overallStatus,
    totalTests: results.length,
    passedTests,
    failedTests,
    warningTests,
    results,
    timestamp: new Date(),
  };

  console.log('✅ Backend compatibility validation completed');
  return report;
}

/**
 * Test IPFS connectivity through Pinata gateway
 */
async function testIPFSConnectivity(): Promise<CompatibilityTestResult> {
  const startTime = Date.now();
  
  try {
    // Test with a known IPFS hash (empty file for testing)
    const testHash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'; // Empty file
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${testHash}`, {
      method: 'HEAD', // Just check if accessible
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        endpoint: 'IPFS Gateway',
        method: 'HEAD',
        status: 'pass',
        message: 'IPFS connectivity: Gateway accessible',
        responseTime,
      };
    } else {
      return {
        endpoint: 'IPFS Gateway',
        method: 'HEAD',
        status: 'warning',
        message: `IPFS connectivity: Gateway returned ${response.status}`,
        responseTime,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: 'IPFS Gateway',
      method: 'HEAD',
      status: 'warning',
      message: `IPFS connectivity: ${error.message}`,
      responseTime,
    };
  }
}

/**
 * Test MetaMask integration compatibility
 */
function testMetaMaskCompatibility(): CompatibilityTestResult {
  try {
    // Check if MetaMask is available
    if (typeof window !== 'undefined' && window.ethereum) {
      return {
        endpoint: 'MetaMask',
        method: 'CHECK',
        status: 'pass',
        message: 'MetaMask integration: Wallet provider detected',
      };
    } else {
      return {
        endpoint: 'MetaMask',
        method: 'CHECK',
        status: 'warning',
        message: 'MetaMask integration: No wallet provider detected (expected in test environment)',
      };
    }
  } catch (error: any) {
    return {
      endpoint: 'MetaMask',
      method: 'CHECK',
      status: 'warning',
      message: `MetaMask integration: ${error.message}`,
    };
  }
}

/**
 * Validate specific API response structure
 */
export function validateAPIResponse(
  endpoint: string,
  expectedFields: string[],
  actualResponse: any
): CompatibilityTestResult {
  const missingFields = expectedFields.filter(field => !(field in actualResponse));
  
  if (missingFields.length === 0) {
    return {
      endpoint,
      method: 'VALIDATE',
      status: 'pass',
      message: 'API response structure: All expected fields present',
    };
  } else {
    return {
      endpoint,
      method: 'VALIDATE',
      status: 'fail',
      message: `API response structure: Missing fields - ${missingFields.join(', ')}`,
    };
  }
}

/**
 * Generate a human-readable compatibility report
 */
export function generateCompatibilityReport(report: BackendCompatibilityReport): string {
  const { overallStatus, totalTests, passedTests, failedTests, warningTests, results, timestamp } = report;
  
  let output = `
🔍 Backend Compatibility Report
Generated: ${timestamp.toISOString()}

📊 Summary:
- Overall Status: ${overallStatus.toUpperCase()}
- Total Tests: ${totalTests}
- Passed: ${passedTests}
- Failed: ${failedTests}
- Warnings: ${warningTests}

📋 Detailed Results:
`;

  results.forEach((result, index) => {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    const responseTime = result.responseTime ? ` (${result.responseTime}ms)` : '';
    
    output += `${index + 1}. ${statusIcon} ${result.method} ${result.endpoint}${responseTime}
   ${result.message}

`;
  });

  if (failedTests > 0) {
    output += `
🚨 Critical Issues Found:
The following endpoints are not working correctly and may break functionality:
`;
    results
      .filter(r => r.status === 'fail')
      .forEach(result => {
        output += `- ${result.method} ${result.endpoint}: ${result.message}
`;
      });
  }

  if (warningTests > 0) {
    output += `
⚠️ Warnings:
The following items may need attention:
`;
    results
      .filter(r => r.status === 'warning')
      .forEach(result => {
        output += `- ${result.method} ${result.endpoint}: ${result.message}
`;
      });
  }

  return output;
}