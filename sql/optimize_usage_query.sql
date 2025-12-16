-- Optimized aggregation function for flight hours
-- Run this in Supabase SQL Editor to improve /usage page performance
-- FIXED: Cast flightType to text to work with ILIKE operator
-- FIXED: Cast SUM results to NUMERIC to match function return type

CREATE OR REPLACE FUNCTION get_flight_aggregations()
RETURNS TABLE (
  user_id UUID,
  regular_hours NUMERIC,
  regular_hours_current_year NUMERIC,
  regular_hours_previous_year NUMERIC,
  ferry_hours_total NUMERIC,
  ferry_hours_current_year NUMERIC,
  ferry_hours_previous_year NUMERIC,
  charter_hours_total NUMERIC,
  charter_hours_current_year NUMERIC,
  charter_hours_previous_year NUMERIC,
  chartered_hours_total NUMERIC,
  chartered_hours_current_year NUMERIC,
  chartered_hours_previous_year NUMERIC,
  demo_hours_total NUMERIC,
  demo_hours_current_year NUMERIC,
  demo_hours_previous_year NUMERIC,
  flights_12_months INTEGER,
  flights_90_days INTEGER
) AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  previous_year INTEGER := current_year - 1;
  twelve_months_ago TIMESTAMP := CURRENT_DATE - INTERVAL '12 months';
  ninety_days_ago TIMESTAMP := CURRENT_DATE - INTERVAL '90 days';
BEGIN
  RETURN QUERY
  SELECT
    fl."userId" as user_id,
    -- Regular flight hours (exclude FERRY, DEMO, CHARTER)
    COALESCE(SUM(
      CASE
        WHEN fl."flightType"::text NOT ILIKE '%FERRY%'
         AND fl."flightType"::text NOT ILIKE '%DEMO%'
         AND (fl."flightType"::text NOT ILIKE '%CHARTER%' OR fl.payer_id IS NULL)
        THEN fl."totalHours"
        ELSE 0
      END
    )::NUMERIC, 0) as regular_hours,

    -- Regular hours current year
    COALESCE(SUM(
      CASE
        WHEN EXTRACT(YEAR FROM fl.date) = current_year
         AND fl."flightType"::text NOT ILIKE '%FERRY%'
         AND fl."flightType"::text NOT ILIKE '%DEMO%'
         AND (fl."flightType"::text NOT ILIKE '%CHARTER%' OR fl.payer_id IS NULL)
        THEN fl."totalHours"
        ELSE 0
      END
    )::NUMERIC, 0) as regular_hours_current_year,

    -- Regular hours previous year
    COALESCE(SUM(
      CASE
        WHEN EXTRACT(YEAR FROM fl.date) = previous_year
         AND fl."flightType"::text NOT ILIKE '%FERRY%'
         AND fl."flightType"::text NOT ILIKE '%DEMO%'
         AND (fl."flightType"::text NOT ILIKE '%CHARTER%' OR fl.payer_id IS NULL)
        THEN fl."totalHours"
        ELSE 0
      END
    )::NUMERIC, 0) as regular_hours_previous_year,

    -- Ferry hours
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%FERRY%' THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as ferry_hours_total,
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%FERRY%' AND EXTRACT(YEAR FROM fl.date) = current_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as ferry_hours_current_year,
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%FERRY%' AND EXTRACT(YEAR FROM fl.date) = previous_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as ferry_hours_previous_year,

    -- Charter hours (pilot perspective)
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%CHARTER%' THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as charter_hours_total,
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%CHARTER%' AND EXTRACT(YEAR FROM fl.date) = current_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as charter_hours_current_year,
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%CHARTER%' AND EXTRACT(YEAR FROM fl.date) = previous_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as charter_hours_previous_year,

    -- Chartered hours (payer perspective) - calculated separately below
    0::NUMERIC as chartered_hours_total,
    0::NUMERIC as chartered_hours_current_year,
    0::NUMERIC as chartered_hours_previous_year,

    -- Demo hours
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%DEMO%' THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as demo_hours_total,
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%DEMO%' AND EXTRACT(YEAR FROM fl.date) = current_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as demo_hours_current_year,
    COALESCE(SUM(CASE WHEN fl."flightType"::text ILIKE '%DEMO%' AND EXTRACT(YEAR FROM fl.date) = previous_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as demo_hours_previous_year,

    -- Flight counts
    COUNT(CASE WHEN fl.date >= twelve_months_ago THEN 1 END)::INTEGER as flights_12_months,
    COUNT(CASE WHEN fl.date >= ninety_days_ago THEN 1 END)::INTEGER as flights_90_days

  FROM flight_logs fl
  WHERE fl."userId" IS NOT NULL
  GROUP BY fl."userId"

  UNION ALL

  -- Add chartered hours for payers (separate query for payer_id)
  SELECT
    fl.payer_id as user_id,
    0::NUMERIC as regular_hours,
    0::NUMERIC as regular_hours_current_year,
    0::NUMERIC as regular_hours_previous_year,
    0::NUMERIC as ferry_hours_total,
    0::NUMERIC as ferry_hours_current_year,
    0::NUMERIC as ferry_hours_previous_year,
    0::NUMERIC as charter_hours_total,
    0::NUMERIC as charter_hours_current_year,
    0::NUMERIC as charter_hours_previous_year,
    COALESCE(SUM(fl."totalHours")::NUMERIC, 0) as chartered_hours_total,
    COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM fl.date) = current_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as chartered_hours_current_year,
    COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM fl.date) = previous_year THEN fl."totalHours" ELSE 0 END)::NUMERIC, 0) as chartered_hours_previous_year,
    0::NUMERIC as demo_hours_total,
    0::NUMERIC as demo_hours_current_year,
    0::NUMERIC as demo_hours_previous_year,
    0::INTEGER as flights_12_months,
    0::INTEGER as flights_90_days
  FROM flight_logs fl
  WHERE fl.payer_id IS NOT NULL
    AND fl."flightType"::text ILIKE '%CHARTER%'
  GROUP BY fl.payer_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_flight_aggregations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_flight_aggregations() TO anon;

-- Create an index on flight_logs to speed up queries
CREATE INDEX IF NOT EXISTS idx_flight_logs_userid_date ON flight_logs("userId", date DESC);
CREATE INDEX IF NOT EXISTS idx_flight_logs_payerid_date ON flight_logs(payer_id, date DESC) WHERE payer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flight_logs_flighttype ON flight_logs("flightType");
