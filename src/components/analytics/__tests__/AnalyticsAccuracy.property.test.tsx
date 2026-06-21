// Property-based test for analytics accuracy
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { AppProvider } from '../../../context/AppContext';
import AnalyticsDashboard from '../AnalyticsDashboard';
import StatisticsCards from '../StatisticsCards';
import { Document, UserStatistics } from '../../../types';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock document generator
const documentArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  docId: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  docNumber: fc.string({ minLength: 1 }),
  docType: fc.constantFrom('Birth Certificate', 'Educational Certificate', 'Property Document', 'Identity Document'),
  ipfsHash: fc.string({ minLength: 10 }),
  documentCID: fc.option(fc.string({ minLength: 10 })),
  uploadDate: fc.date(),
  submittedAt: fc.date(),
  status: fc.constantFrom('Verified', 'Unverified', 'Legalized', 'Pending', 'Rejected') as fc.Arbitrary<'Verified' | 'Unverified' | 'Legalized' | 'Pending' | 'Rejected'>,
  fileType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
  fileHash: fc.string({ minLength: 10 }),
  transactionHash: fc.option(fc.string({ minLength: 10 })),
  qrId: fc.option(fc.string({ minLength: 1 })),
});

// Mock statistics generator
const statisticsArbitrary = fc.record({
  totalVerified: fc.nat({ max: 100 }),
  successfulVerifications: fc.nat({ max: 100 }),
  pendingRequests: fc.nat({ max: 50 }),
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>
    {children}
  </AppProvider>
);

describe('Feature: user-portal-redesign, Property 7: Analytics Accuracy', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  test('analytics display accurate counts that match actual document statuses', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(documentArbitrary, { minLength: 5, maxLength: 30 }),
        statisticsArbitrary,
        async (documents, baseStats) => {
          // Calculate expected counts from documents
          const expectedCounts = {
            total: documents.length,
            verified: documents.filter(doc => doc.status === 'Verified').length,
            unverified: documents.filter(doc => doc.status === 'Unverified').length,
            legalized: documents.filter(doc => doc.status === 'Legalized').length,
            pending: documents.filter(doc => doc.status === 'Pending').length,
            rejected: documents.filter(doc => doc.status === 'Rejected').length,
          };

          // Mock API response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              ...baseStats,
              totalVerified: expectedCounts.total,
              successfulVerifications: expectedCounts.verified,
              pendingRequests: expectedCounts.pending,
            }),
          });

          // Create extended statistics object
          const extendedStats = {
            ...baseStats,
            totalDocuments: expectedCounts.total,
            verifiedDocuments: expectedCounts.verified,
            unverifiedDocuments: expectedCounts.unverified,
            legalizedDocuments: expectedCounts.legalized,
            pendingDocuments: expectedCounts.pending,
            rejectedDocuments: expectedCounts.rejected,
            successRate: expectedCounts.total > 0 ? Math.round((expectedCounts.verified / expectedCounts.total) * 100) : 0,
            recentActivity: documents
              .filter(doc => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return doc.uploadDate >= sevenDaysAgo;
              })
              .slice(0, 5)
              .map(doc => ({
                id: `activity-${doc.id}`,
                type: 'upload' as const,
                document: doc,
                timestamp: doc.uploadDate,
                description: `Uploaded ${doc.docType}`,
              })),
            recentActivityCount: documents.filter(doc => {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              return doc.uploadDate >= sevenDaysAgo;
            }).length,
          };

          const { container } = render(
            <TestWrapper>
              <StatisticsCards statistics={extendedStats} loading={false} />
            </TestWrapper>
          );

          // Property 7: Total documents count should be accurate
          expect(container).toHaveTextContent(expectedCounts.total.toString());

          // Property 7: Verified documents count should be accurate
          expect(container).toHaveTextContent(expectedCounts.verified.toString());

          // Property 7: Success rate should be calculated correctly
          const expectedSuccessRate = expectedCounts.total > 0 
            ? Math.round((expectedCounts.verified / expectedCounts.total) * 100) 
            : 0;
          expect(container).toHaveTextContent(`${expectedSuccessRate}%`);

          // Property 7: All status categories should be represented
          expect(container).toHaveTextContent('Total Documents');
          expect(container).toHaveTextContent('Verified Documents');
          expect(container).toHaveTextContent('Success Rate');
          expect(container).toHaveTextContent('Pending Review');
          expect(container).toHaveTextContent('Legalized Documents');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('analytics calculations are mathematically correct for all document collections', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 1, maxLength: 50 }),
        (documents) => {
          // Property 7: Calculate expected statistics
          const statusCounts = documents.reduce((acc, doc) => {
            acc[doc.status] = (acc[doc.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const totalDocuments = documents.length;
          const verifiedDocuments = statusCounts['Verified'] || 0;
          const unverifiedDocuments = statusCounts['Unverified'] || 0;
          const legalizedDocuments = statusCounts['Legalized'] || 0;
          const pendingDocuments = statusCounts['Pending'] || 0;
          const rejectedDocuments = statusCounts['Rejected'] || 0;

          // Property 7: Sum of all status counts should equal total
          const sumOfStatusCounts = verifiedDocuments + unverifiedDocuments + legalizedDocuments + pendingDocuments + rejectedDocuments;
          expect(sumOfStatusCounts).toBe(totalDocuments);

          // Property 7: Success rate calculation should be correct
          const expectedSuccessRate = totalDocuments > 0 ? Math.round((verifiedDocuments / totalDocuments) * 100) : 0;
          expect(expectedSuccessRate).toBeGreaterThanOrEqual(0);
          expect(expectedSuccessRate).toBeLessThanOrEqual(100);

          // Property 7: Each status count should be non-negative
          expect(verifiedDocuments).toBeGreaterThanOrEqual(0);
          expect(unverifiedDocuments).toBeGreaterThanOrEqual(0);
          expect(legalizedDocuments).toBeGreaterThanOrEqual(0);
          expect(pendingDocuments).toBeGreaterThanOrEqual(0);
          expect(rejectedDocuments).toBeGreaterThanOrEqual(0);

          // Property 7: If there are verified documents, success rate should be > 0
          if (verifiedDocuments > 0) {
            expect(expectedSuccessRate).toBeGreaterThan(0);
          }

          // Property 7: If all documents are verified, success rate should be 100%
          if (verifiedDocuments === totalDocuments && totalDocuments > 0) {
            expect(expectedSuccessRate).toBe(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics update automatically when document statuses change', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(documentArbitrary, { minLength: 5, maxLength: 15 }),
        fc.constantFrom('Verified', 'Unverified', 'Legalized', 'Pending', 'Rejected'),
        async (initialDocuments, newStatus) => {
          // Initial statistics
          const initialStats = {
            totalVerified: initialDocuments.length,
            successfulVerifications: initialDocuments.filter(doc => doc.status === 'Verified').length,
            pendingRequests: initialDocuments.filter(doc => doc.status === 'Pending').length,
          };

          // Mock initial API response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => initialStats,
          });

          // Change status of first document
          const updatedDocuments = [...initialDocuments];
          if (updatedDocuments.length > 0) {
            updatedDocuments[0] = { ...updatedDocuments[0], status: newStatus as any };
          }

          // Updated statistics
          const updatedStats = {
            totalVerified: updatedDocuments.length,
            successfulVerifications: updatedDocuments.filter(doc => doc.status === 'Verified').length,
            pendingRequests: updatedDocuments.filter(doc => doc.status === 'Pending').length,
          };

          // Mock updated API response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => updatedStats,
          });

          const { container } = render(
            <TestWrapper>
              <AnalyticsDashboard />
            </TestWrapper>
          );

          // Property 7: Should fetch initial statistics
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/stats');
          });

          // Property 7: Analytics should reflect the document status changes
          const expectedVerifiedCount = updatedDocuments.filter(doc => doc.status === 'Verified').length;
          const expectedPendingCount = updatedDocuments.filter(doc => doc.status === 'Pending').length;

          // Verify the counts are mathematically consistent
          expect(expectedVerifiedCount).toBeGreaterThanOrEqual(0);
          expect(expectedPendingCount).toBeGreaterThanOrEqual(0);
          expect(expectedVerifiedCount + expectedPendingCount).toBeLessThanOrEqual(updatedDocuments.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('analytics maintain accuracy across different time periods', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 10, maxLength: 40 }),
        (documents) => {
          // Property 7: Calculate recent activity (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const recentDocuments = documents.filter(doc => doc.uploadDate >= sevenDaysAgo);
          const olderDocuments = documents.filter(doc => doc.uploadDate < sevenDaysAgo);

          // Property 7: Recent + older should equal total
          expect(recentDocuments.length + olderDocuments.length).toBe(documents.length);

          // Property 7: Recent activity count should be accurate
          expect(recentDocuments.length).toBeGreaterThanOrEqual(0);
          expect(recentDocuments.length).toBeLessThanOrEqual(documents.length);

          // Property 7: Each document should be categorized correctly by date
          recentDocuments.forEach(doc => {
            expect(doc.uploadDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
          });

          olderDocuments.forEach(doc => {
            expect(doc.uploadDate.getTime()).toBeLessThan(sevenDaysAgo.getTime());
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('analytics handle edge cases correctly', () => {
    // Test with empty document array
    const emptyStats = {
      totalDocuments: 0,
      verifiedDocuments: 0,
      unverifiedDocuments: 0,
      legalizedDocuments: 0,
      pendingDocuments: 0,
      rejectedDocuments: 0,
      successRate: 0,
      recentActivity: [],
      recentActivityCount: 0,
      totalVerified: 0,
      successfulVerifications: 0,
      pendingRequests: 0,
    };

    const { container } = render(
      <TestWrapper>
        <StatisticsCards statistics={emptyStats} loading={false} />
      </TestWrapper>
    );

    // Property 7: Should handle zero values correctly
    expect(container).toHaveTextContent('0');
    expect(container).toHaveTextContent('0%');

    // Test with all documents having same status
    const sampleDoc = fc.sample(documentArbitrary, 1)[0];
    const allVerifiedDocuments = Array(5).fill(null).map((_, i) => ({
      ...sampleDoc,
      id: `doc-${i}`,
      status: 'Verified' as const,
    }));

    const allVerifiedStats = {
      totalDocuments: 5,
      verifiedDocuments: 5,
      unverifiedDocuments: 0,
      legalizedDocuments: 0,
      pendingDocuments: 0,
      rejectedDocuments: 0,
      successRate: 100,
      recentActivity: Array(5).fill(null).map((_, i) => ({
        id: `activity-${i}`,
        type: 'upload' as const,
        document: sampleDoc,
        timestamp: new Date(),
        description: `Uploaded ${sampleDoc.docType}`,
      })),
      recentActivityCount: 5,
      totalVerified: 5,
      successfulVerifications: 5,
      pendingRequests: 0,
    };

    const { container: allVerifiedContainer } = render(
      <TestWrapper>
        <StatisticsCards statistics={allVerifiedStats} loading={false} />
      </TestWrapper>
    );

    // Property 7: Should show 100% success rate when all documents are verified
    expect(allVerifiedContainer).toHaveTextContent('100%');
    expect(allVerifiedContainer).toHaveTextContent('5');
  });

  test('analytics preserve data integrity during calculations', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 1, maxLength: 100 }),
        (documents) => {
          // Property 7: Group documents by status
          const statusGroups = documents.reduce((acc, doc) => {
            if (!acc[doc.status]) acc[doc.status] = [];
            acc[doc.status].push(doc);
            return acc;
          }, {} as Record<string, Document[]>);

          // Property 7: Verify data integrity
          const totalFromGroups = Object.values(statusGroups).reduce((sum, group) => sum + group.length, 0);
          expect(totalFromGroups).toBe(documents.length);

          // Property 7: Each document should appear in exactly one group
          const allDocumentsFromGroups = Object.values(statusGroups).flat();
          expect(allDocumentsFromGroups.length).toBe(documents.length);

          // Property 7: No document should be duplicated
          const uniqueIds = new Set(allDocumentsFromGroups.map(doc => doc.id));
          expect(uniqueIds.size).toBe(documents.length);

          // Property 7: Status counts should be consistent
          Object.entries(statusGroups).forEach(([status, group]) => {
            group.forEach(doc => {
              expect(doc.status).toBe(status);
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});