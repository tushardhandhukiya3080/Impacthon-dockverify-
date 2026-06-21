// Basic setup test to verify testing environment
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../../../context/AppContext';

// Simple test component
const TestComponent: React.FC = () => (
  <div data-testid="test-component">
    <h1>Test Component</h1>
    <p>Testing environment is working</p>
  </div>
);

describe('Testing Environment Setup', () => {
  test('renders test component correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByText('Testing environment is working')).toBeInTheDocument();
  });

  test('AppProvider provides context correctly', () => {
    const { container } = render(
      <AppProvider>
        <div>Context Provider Test</div>
      </AppProvider>
    );

    expect(container).toHaveTextContent('Context Provider Test');
  });
});