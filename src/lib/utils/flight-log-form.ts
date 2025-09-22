import { CreateFlightLogForm } from "@/lib/schemas/flight-log";
import { FlightLog } from "@/lib/types/flight-log";

// Utility function to format hours as HH:MM
export const formatHours = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Calculate flight hours from departure and arrival times
export const calculateFlightHours = (departureTime: string, arrivalTime: string): number => {
  try {
    // Ensure times are in HH:MM format
    const departure = new Date(`2000-01-01T${departureTime}:00`);
    const arrival = new Date(`2000-01-01T${arrivalTime}:00`);
    
    // Check if dates are valid
    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
      console.error('Invalid time format:', { departureTime, arrivalTime });
      return 0;
    }
    
    const diffMs = arrival.getTime() - departure.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  } catch (error) {
    console.error('Error calculating flight hours:', error);
    return 0;
  }
};

// Convert flight log data to form data
export const flightLogToFormData = (flightLog: FlightLog): CreateFlightLogForm => {
  // Get payer_id from the database field
  const payerId = (flightLog as any).payer_id;
  
  console.log('🔍 flightLogToFormData - Input flight log:', {
    id: flightLog.id,
    flightType: flightLog.flightType,
    flightTypeType: typeof flightLog.flightType
  });
  
  const formData = {
    flightType: flightLog.flightType as "INVOICED" | "SCHOOL" | "FERRY" | "CHARTER" | "DEMO" | "PROMO",
    departureHobbs: flightLog.departureHobbs,
    arrivalHobbs: flightLog.arrivalHobbs,
    oilAdded: flightLog.oilAdded ?? 0,
    fuelAdded: flightLog.fuelAdded ?? 0,
    dayLandings: flightLog.dayLandings,
    nightLandings: flightLog.nightLandings,
    pilotInCommand: flightLog.pilotInCommand,
    secondInCommand: flightLog.secondInCommand,
    dualReceived: flightLog.dualReceived,
    dualGiven: flightLog.dualGiven,
    solo: flightLog.solo,
    crossCountry: flightLog.crossCountry,
    night: flightLog.night,
    instrument: flightLog.instrument,
    actualInstrument: flightLog.actualInstrument,
    simulatedInstrument: flightLog.simulatedInstrument,
    userId: flightLog.userId,
    aircraftId: flightLog.aircraftId,
    instructorId: flightLog.instructorId ?? undefined,
    payerId: payerId ?? undefined,
    date: flightLog.date,
    departureTime: flightLog.departureTime,
    arrivalTime: flightLog.arrivalTime,
    departureAirfieldId: flightLog.departureAirfieldId,
    arrivalAirfieldId: flightLog.arrivalAirfieldId,
    purpose: flightLog.purpose,
    remarks: flightLog.remarks,
    totalHours: flightLog.totalHours,
  };
  
  console.log('🔍 flightLogToFormData - Output form data:', {
    flightType: formData.flightType,
    flightTypeType: typeof formData.flightType
  });
  
  return formData;
};

// Get flight type label
export const getFlightTypeLabel = (type: string): string => {
  const labels = {
    INVOICED: 'Invoiced',
    SCHOOL: 'School',
    FERRY: 'Ferry',
    CHARTER: 'Charter',
    DEMO: 'Demo',
    PROMO: 'Promo',
  };
  return labels[type as keyof typeof labels] || type;
};

// Get flight type badge color
export const getFlightTypeBadgeColor = (type: string): string => {
  const colors = {
    INVOICED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    SCHOOL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    FERRY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    CHARTER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    DEMO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    PROMO: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

// Get flight type border color
export const getFlightTypeBorderColor = (type: string): string => {
  const colors = {
    INVOICED: 'border-l-green-500',
    SCHOOL: 'border-l-blue-500',
    FERRY: 'border-l-orange-500',
    CHARTER: 'border-l-purple-500',
    DEMO: 'border-l-yellow-500',
    PROMO: 'border-l-pink-500',
  };
  return colors[type as keyof typeof colors] || 'border-l-gray-500';
};
