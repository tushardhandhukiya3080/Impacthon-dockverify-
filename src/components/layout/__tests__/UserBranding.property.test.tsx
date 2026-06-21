// Property-based test for user branding display
import React from 'react';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { AppProvider } from '../../../context/AppContext';
import Header from '../Header';
import Sidebar from '../Sidebar';
import { User } from '../../../types';

// Mock user generator for property testing
const userArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  fullName: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  phone: fc.option(fc.string()),
  walletAddress: fc.option(fc.string()),
});

// Test wrapper component
const TestWrapper: React.FC<{ user: User; children: React.ReactNode }> = ({ user, children }) => (
  <AppProvider>
    <div data-testid="test-container">
      {children}
    </div>
  </AppProvider>
);

describe('Feature: user-portal-redesign, Property 1: User Branding Display', () => {
  test('user branding displays correctly for all users in Header component', () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        const { container } = render(
          <TestWrapper user={user}>
            <Header 
              user={user} 
              currentView="home" 
              onToggleSidebar={() => {}} 
            />
          </TestWrapper>
        );

        // Property 1: User's name should be displayed as branding
        expect(container).toHaveTextContent(user.fullName);
        
        // Property 1: No "DocVerifier" branding should be present
        expect(container).not.toHaveTextContent('DocVerifier');
        expect(container).not.toHaveTextContent('DocVerify');
        
        // Property 1: User initials should be displayed in avatar
        const expectedInitials = user.fullName
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2);
        expect(container).toHaveTextContent(expectedInitials);
      }),
      { numRuns: 100 }
    );
  });

  test('user branding displays correctly for all users in Sidebar component', () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        const { container } = render(
          <TestWrapper user={user}>
            <Sidebar 
              isOpen={true} 
              onToggle={() => {}} 
              user={user} 
            />
          </TestWrapper>
        );

        // Property 1: User's first name should be in portal branding
        const firstName = user.fullName.split(' ')[0];
        expect(container).toHaveTextContent(`${firstName}'s Portal`);
        
        // Property 1: No "DocVerifier" branding should be present
        expect(container).not.toHaveTextContent('DocVerifier');
        expect(container).not.toHaveTextContent('DocVerify');
        
        // Property 1: Should contain "Document Management" subtitle
        expect(container).toHaveTextContent('Document Management');
      }),
      { numRuns: 100 }
    );
  });

  test('fallback branding works correctly for null user', () => {
    const { container: headerContainer } = render(
      <TestWrapper user={null as any}>
        <Header 
          user={null} 
          currentView="home" 
          onToggleSidebar={() => {}} 
        />
      </TestWrapper>
    );

    const { container: sidebarContainer } = render(
      <TestWrapper user={null as any}>
        <Sidebar 
          isOpen={true} 
          onToggle={() => {}} 
          user={null} 
        />
      </TestWrapper>
    );

    // Property 1: Should show fallback branding without DocVerifier
    expect(headerContainer).toHaveTextContent('User Portal');
    expect(sidebarContainer).toHaveTextContent('My Portal');
    
    // Property 1: No "DocVerifier" branding should be present
    expect(headerContainer).not.toHaveTextContent('DocVerifier');
    expect(sidebarContainer).not.toHaveTextContent('DocVerifier');
  });

  test('user branding is consistent across different view states', () => {
    const views = ['home', 'inventory', 'analytics', 'verify', 'profile', 'settings'];
    
    fc.assert(
      fc.property(
        userArbitrary,
        fc.constantFrom(...views),
        (user, currentView) => {
          const { container } = render(
            <TestWrapper user={user}>
              <Header 
                user={user} 
                currentView={currentView} 
                onToggleSidebar={() => {}} 
              />
            </TestWrapper>
          );

          // Property 1: User branding should be consistent regardless of view
          expect(container).toHaveTextContent(user.fullName);
          expect(container).not.toHaveTextContent('DocVerifier');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('personalized branding elements are always present', () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        const { container: headerContainer } = render(
          <TestWrapper user={user}>
            <Header 
              user={user} 
              currentView="home" 
              onToggleSidebar={() => {}} 
            />
          </TestWrapper>
        );

        const { container: sidebarContainer } = render(
          <TestWrapper user={user}>
            <Sidebar 
              isOpen={true} 
              onToggle={() => {}} 
              user={user} 
            />
          </TestWrapper>
        );

        // Property 1: Personalized elements should always be present
        // Header should have user's full name
        expect(headerContainer).toHaveTextContent(user.fullName);
        
        // Sidebar should have possessive form of first name
        const firstName = user.fullName.split(' ')[0];
        expect(sidebarContainer).toHaveTextContent(`${firstName}'s Portal`);
        
        // Both should have verification/security icons (not DocVerifier branding)
        const verificationIcons = headerContainer.querySelectorAll('svg');
        expect(verificationIcons.length).toBeGreaterThan(0);
        
        const sidebarIcons = sidebarContainer.querySelectorAll('svg');
        expect(sidebarIcons.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});