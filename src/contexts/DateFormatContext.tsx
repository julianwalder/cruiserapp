'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DateFormat, getCurrentDateFormat, setCurrentDateFormat } from '@/lib/date-utils';

interface DateFormatContextType {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

export function DateFormatProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>('DD/MM/YYYY');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize date format after mount to avoid hydration issues
    const initialFormat = getCurrentDateFormat();
    setDateFormatState(initialFormat);
    setIsInitialized(true);
  }, []);

  const setDateFormat = (format: DateFormat) => {
    setDateFormatState(format);
    setCurrentDateFormat(format);
  };

  useEffect(() => {
    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dateFormat' && e.newValue) {
        setDateFormatState(e.newValue as DateFormat);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <DateFormatContext.Provider value={{ dateFormat, setDateFormat }}>
      {children}
    </DateFormatContext.Provider>
  );
}

export function useDateFormat() {
  const context = useContext(DateFormatContext);
  if (context === undefined) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
} 