import { useDateFormat } from '@/contexts/DateFormatContext';
import { formatDate, type DateFormat, getCurrentDateFormat } from '@/lib/date-utils';

export function useFormattedDate(date: Date | string | null | undefined): string {
  try {
    const { dateFormat } = useDateFormat();
    return formatDate(date, dateFormat);
  } catch (error) {
    // Fallback to default format if context is not available
    const fallbackFormat = getCurrentDateFormat();
    return formatDate(date, fallbackFormat);
  }
}

export function useDateFormatUtils() {
  try {
    const { dateFormat, setDateFormat } = useDateFormat();
    
    const formatDateWithCurrentFormat = (date: Date | string | null | undefined): string => {
      return formatDate(date, dateFormat);
    };
    
    return {
      dateFormat,
      setDateFormat,
      formatDate: formatDateWithCurrentFormat
    };
  } catch (error) {
    // Fallback to default format if context is not available
    const fallbackFormat = getCurrentDateFormat();
    
    const formatDateWithCurrentFormat = (date: Date | string | null | undefined): string => {
      return formatDate(date, fallbackFormat);
    };
    
    return {
      dateFormat: fallbackFormat,
      setDateFormat: () => {}, // No-op fallback
      formatDate: formatDateWithCurrentFormat
    };
  }
} 