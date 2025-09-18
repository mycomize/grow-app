import { useState, useEffect } from 'react';

// Global database readiness state
let isDatabaseReady = false;
let isDatabaseError = false;
const readyCallbacks: Array<(ready: boolean, error?: boolean) => void> = [];

/**
 * Set database readiness status (called from root layout)
 */
export const setDatabaseReady = (ready: boolean, error = false) => {
  isDatabaseReady = ready;
  isDatabaseError = error;
  readyCallbacks.forEach(callback => callback(ready, error));
};

/**
 * Hook to check if database is ready for operations
 */
export const useDatabaseReady = () => {
  const [isReady, setIsReady] = useState(isDatabaseReady);
  const [error, setError] = useState(isDatabaseError);

  useEffect(() => {
    // If already ready/error, set state immediately
    if (isDatabaseReady || isDatabaseError) {
      setIsReady(isDatabaseReady);
      setError(isDatabaseError);
      return;
    }

    // Add callback for when database status changes
    const callback = (ready: boolean, hasError = false) => {
      setIsReady(ready);
      setError(hasError);
    };

    readyCallbacks.push(callback);

    // Cleanup
    return () => {
      const index = readyCallbacks.indexOf(callback);
      if (index > -1) {
        readyCallbacks.splice(index, 1);
      }
    };
  }, []);

  return { isReady, error };
};

/**
 * Get current database readiness status
 */
export const getDatabaseReady = () => ({
  isReady: isDatabaseReady,
  error: isDatabaseError
});

/**
 * Wait for database to be ready (Promise-based)
 */
export const waitForDatabase = async (): Promise<boolean> => {
  if (isDatabaseReady) {
    return true;
  }

  if (isDatabaseError) {
    throw new Error('Database initialization failed');
  }

  return new Promise((resolve, reject) => {
    const callback = (ready: boolean, error = false) => {
      if (error) {
        reject(new Error('Database initialization failed'));
      } else if (ready) {
        resolve(true);
      }
    };

    readyCallbacks.push(callback);
    
    // Cleanup after 30 seconds to prevent memory leaks
    setTimeout(() => {
      const index = readyCallbacks.indexOf(callback);
      if (index > -1) {
        readyCallbacks.splice(index, 1);
        reject(new Error('Database initialization timeout'));
      }
    }, 30000);
  });
};
