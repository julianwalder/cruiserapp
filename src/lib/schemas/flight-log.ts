import { z } from "zod";

// Flight log creation schema - Jeppesen format
export const createFlightLogSchema = z.object({
  // Basic flight information
  date: z.string().min(1, "Date is required"),
  aircraftId: z.string().min(1, "Aircraft is required"),
  userId: z.string().min(1, "Pilot is required"),
  instructorId: z.string().optional().or(z.undefined()),
  payerId: z.string().optional().or(z.undefined()), // User ID of the person who pays for the flight (used for charter flights)
  
  // Departure information
  departureAirfieldId: z.string().min(1, "Departure airfield is required"),
  departureTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .refine((time) => {
      const [hh, mm] = time.split(":").map(Number);
      return (
        !isNaN(hh) && !isNaN(mm) &&
        hh >= 0 && hh <= 23 &&
        mm >= 0 && mm <= 59
      );
    }, "Hour must be 00-23 and minute must be 00-59"),
  departureHobbs: z.number().min(0.1, "Departure Hobbs must be greater than 0"),
  
  // Arrival information
  arrivalAirfieldId: z.string().min(1, "Arrival airfield is required"),
  arrivalTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .refine((time) => {
      const [hh, mm] = time.split(":").map(Number);
      return (
        !isNaN(hh) && !isNaN(mm) &&
        hh >= 0 && hh <= 23 &&
        mm >= 0 && mm <= 59
      );
    }, "Hour must be 00-23 and minute must be 00-59"),
  arrivalHobbs: z.number().min(0.1, "Arrival Hobbs must be greater than 0"),
  
  // Flight hours
  pilotInCommand: z.number().min(0, "PIC hours must be 0 or greater"),
  secondInCommand: z.number().min(0, "SIC hours must be 0 or greater"),
  dualReceived: z.number().min(0, "Dual received hours must be 0 or greater"),
  dualGiven: z.number().min(0, "Dual given hours must be 0 or greater"),
  solo: z.number().min(0, "Solo hours must be 0 or greater"),
  crossCountry: z.number().min(0, "Cross country hours must be 0 or greater"),
  night: z.number().min(0, "Night hours must be 0 or greater"),
  instrument: z.number().min(0, "Instrument hours must be 0 or greater"),
  actualInstrument: z.number().min(0, "Actual instrument hours must be 0 or greater"),
  simulatedInstrument: z.number().min(0, "Simulated instrument hours must be 0 or greater"),
  
  // Landings
  dayLandings: z.number().min(0, "Day landings must be 0 or greater"),
  nightLandings: z.number().min(0, "Night landings must be 0 or greater"),
  
  // Additional information
  oilAdded: z.number().min(0, "Oil added must be 0 or greater").optional(),
  fuelAdded: z.number().min(0, "Fuel added must be 0 or greater").optional(),
  purpose: z.string().optional().or(z.undefined()).nullable(),
  remarks: z.string().optional().or(z.undefined()).nullable(),
  route: z.string().optional().or(z.undefined()).nullable(),
  conditions: z.string().optional().or(z.undefined()).nullable(),
  flightType: z.enum(["INVOICED", "SCHOOL", "FERRY", "CHARTER", "DEMO", "PROMO"]),
  totalHours: z.number().min(0, "Total hours must be 0 or greater").optional(),
});

export type CreateFlightLogForm = z.infer<typeof createFlightLogSchema>;

// Default values for the form
export const defaultFlightLogValues: Partial<CreateFlightLogForm> = {
  flightType: "INVOICED",
  departureHobbs: undefined,
  arrivalHobbs: undefined,
  oilAdded: 0,
  fuelAdded: 0,
  dayLandings: 1,
  nightLandings: 0,
  pilotInCommand: 0,
  secondInCommand: 0,
  dualReceived: 0,
  dualGiven: 0,
  solo: 0,
  crossCountry: 0,
  night: 0,
  instrument: 0,
  actualInstrument: 0,
  simulatedInstrument: 0,
  totalHours: 0,
};
