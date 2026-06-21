// Retry utility for failed operations
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw lastError!;
}

// Specific retry for network operations
export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'onRetry'> & {
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    delay: 1000,
    backoff: true,
    ...options,
    onRetry: (attempt, error) => {
      console.warn(`Network operation failed (attempt ${attempt}):`, error.message);
      if (options.onRetry) {
        options.onRetry(attempt, error);
      }
    }
  });
}