export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY';

export interface DateFormatConfig {
  format: DateFormat;
  displayName: string;
  example: string;
}

export const DATE_FORMATS: DateFormatConfig[] = [
  {
    format: 'DD/MM/YYYY',
    displayName: 'Day/Month/Year (DD/MM/YYYY)',
    example: '25/12/2024'
  },
  {
    format: 'MM/DD/YYYY',
    displayName: 'Month/Day/Year (MM/DD/YYYY)',
    example: '12/25/2024'
  },
  {
    format: 'YYYY-MM-DD',
    displayName: 'ISO Format (YYYY-MM-DD)',
    example: '2024-12-25'
  },
  {
    format: 'DD-MM-YYYY',
    displayName: 'Day-Month-Year (DD-MM-YYYY)',
    example: '25-12-2024'
  },
  {
    format: 'MM-DD-YYYY',
    displayName: 'Month-Day-Year (MM-DD-YYYY)',
    example: '12-25-2024'
  }
];

export function formatDate(date: Date | string | null | undefined, format: DateFormat): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear().toString();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatDateTime(date: Date | string | null | undefined, format: DateFormat): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear().toString();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  let datePart: string;
  switch (format) {
    case 'DD/MM/YYYY':
      datePart = `${day}/${month}/${year}`;
      break;
    case 'MM/DD/YYYY':
      datePart = `${month}/${day}/${year}`;
      break;
    case 'YYYY-MM-DD':
      datePart = `${year}-${month}-${day}`;
      break;
    case 'DD-MM-YYYY':
      datePart = `${day}-${month}-${year}`;
      break;
    case 'MM-DD-YYYY':
      datePart = `${month}-${day}-${year}`;
      break;
    default:
      datePart = `${day}/${month}/${year}`;
  }
  
  return `${datePart} ${hours}:${minutes}`;
}

export function parseDate(dateString: string, format: DateFormat): Date | null {
  if (!dateString) return null;
  
  let day: string, month: string, year: string;
  
  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      [day, month, year] = dateString.split(/[\/\-]/);
      break;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      [month, day, year] = dateString.split(/[\/\-]/);
      break;
    case 'YYYY-MM-DD':
      [year, month, day] = dateString.split('-');
      break;
    default:
      return null;
  }
  
  if (!day || !month || !year) return null;
  
  // Create date in local timezone to avoid timezone shifts
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0);
  
  if (isNaN(date.getTime())) return null;
  
  return date;
}

// Get the current date format from localStorage or default to DD/MM/YYYY
export function getCurrentDateFormat(): DateFormat {
  if (typeof window === 'undefined') return 'DD/MM/YYYY';
  
  try {
    const stored = localStorage.getItem('dateFormat');
    if (stored && DATE_FORMATS.some(df => df.format === stored)) {
      return stored as DateFormat;
    }
  } catch (error) {
    console.warn('Failed to get date format from localStorage:', error);
  }
  
  return 'DD/MM/YYYY';
}

// Set the current date format in localStorage
export function setCurrentDateFormat(format: DateFormat): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('dateFormat', format);
  } catch (error) {
    console.warn('Failed to set date format in localStorage:', error);
  }
}

// Format date using the current system format
export function formatDateWithCurrentFormat(date: Date | string | null | undefined): string {
  const currentFormat = getCurrentDateFormat();
  return formatDate(date, currentFormat);
}

// Format date and time using the current system format
export function formatDateTimeWithCurrentFormat(date: Date | string | null | undefined): string {
  const currentFormat = getCurrentDateFormat();
  return formatDateTime(date, currentFormat);
}

// Hook to format date with current format (for use in components)
export function useFormattedDate(date: Date | string | null | undefined): string {
  const currentFormat = getCurrentDateFormat();
  return formatDate(date, currentFormat);
}

// Create a timezone-safe date (sets time to noon to avoid timezone shifts)
export function createSafeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

// Normalize a date to avoid timezone issues by setting time to noon
export function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
} 