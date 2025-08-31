// Reference airport interface for search results from OurAirports database
export interface ReferenceAirport {
  id: number;
  name: string;
  icao_code?: string;
  iata_code?: string;
  gps_code?: string;
  local_code?: string;
  municipality?: string;
  iso_country?: string;
  country_name?: string;
  iso_region?: string;
  region_name?: string;
  latitude_deg?: number;
  longitude_deg?: number;
  elevation_ft?: number;
  type?: string;
}
