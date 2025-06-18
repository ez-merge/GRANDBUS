-- Add locked_dates column to bus_routes
ALTER TABLE bus_routes
ADD COLUMN IF NOT EXISTS locked_dates jsonb DEFAULT '{}'::jsonb;

-- Update manage_seat_locks function to handle dates
CREATE OR REPLACE FUNCTION manage_seat_locks(
  p_bus_id uuid,
  p_route_id uuid,
  p_seats integer[],
  p_action text,
  p_date date,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_locks jsonb;
  current_reasons jsonb;
  date_key text;
  seat_num text;
BEGIN
  -- Get current locked seats and reasons
  SELECT 
    COALESCE(locked_dates, '{}'::jsonb),
    COALESCE(locked_seat_reason, '{}'::jsonb)
  INTO current_locks, current_reasons
  FROM bus_routes
  WHERE bus_id = p_bus_id AND route_id = p_route_id;

  -- Convert date to text key
  date_key := p_date::text;

  IF p_action = 'lock' THEN
    -- Initialize date entry if it doesn't exist
    IF NOT (current_locks ? date_key) THEN
      current_locks := jsonb_set(
        current_locks,
        array[date_key],
        '[]'::jsonb
      );
    END IF;

    -- Add new seats to locked seats for specific date
    current_locks := jsonb_set(
      current_locks,
      array[date_key],
      (
        SELECT jsonb_agg(DISTINCT value)
        FROM (
          SELECT jsonb_array_elements(current_locks->date_key) as value
          UNION ALL
          SELECT to_jsonb(s::text)
          FROM unnest(p_seats) s
        ) sub
      )
    );

    -- Update reasons if provided
    IF p_reason IS NOT NULL THEN
      -- Use array_to_string to iterate over seats
      FOR seat_num IN 
        SELECT unnest(array_to_string(p_seats, ',')::text[])
      LOOP
        current_reasons := jsonb_set(
          current_reasons,
          array[date_key, seat_num],
          to_jsonb(p_reason)
        );
      END LOOP;
    END IF;
  ELSIF p_action = 'unlock' THEN
    -- Remove seats from locked seats for specific date
    IF current_locks ? date_key THEN
      current_locks := jsonb_set(
        current_locks,
        array[date_key],
        (
          SELECT COALESCE(
            jsonb_agg(value),
            '[]'::jsonb
          )
          FROM (
            SELECT value
            FROM jsonb_array_elements(current_locks->date_key) value
            WHERE value::text NOT IN (
              SELECT to_json(s::text)::text
              FROM unnest(p_seats) s
            )
          ) sub
        )
      );

      -- Remove reasons for unlocked seats
      FOR seat_num IN 
        SELECT unnest(array_to_string(p_seats, ',')::text[])
      LOOP
        current_reasons := current_reasons #- array[date_key, seat_num];
      END LOOP;
    END IF;
  END IF;

  -- Update bus_routes with new locks and reasons
  UPDATE bus_routes
  SET 
    locked_dates = current_locks,
    locked_seat_reason = current_reasons
  WHERE bus_id = p_bus_id AND route_id = p_route_id;
END;
$$ LANGUAGE plpgsql;

-- Update check_seat_availability function
CREATE OR REPLACE FUNCTION check_seat_availability()
RETURNS trigger AS $$
DECLARE
  existing_booking RECORD;
  locked_seat integer;
  booked_seat integer;
  date_locks jsonb;
BEGIN
  -- Get locked seats for this bus and route on specific date
  SELECT locked_dates->NEW.departure_date::text INTO date_locks
  FROM bus_routes
  WHERE bus_id = NEW.bus_id
    AND route_id = NEW.route_id;

  -- Check if any selected seat is locked for this date
  IF date_locks IS NOT NULL THEN
    FOR locked_seat IN 
      SELECT jsonb_array_elements_text(date_locks)::integer
    LOOP
      IF locked_seat = ANY(NEW.seats) THEN
        RAISE EXCEPTION 'Seat % is locked for date %', locked_seat, NEW.departure_date;
      END IF;
    END LOOP;
  END IF;

  -- Check for existing bookings with overlapping seats
  FOR existing_booking IN
    SELECT seats
    FROM bookings
    WHERE bus_id = NEW.bus_id
      AND route_id = NEW.route_id
      AND departure_date = NEW.departure_date
      AND NOT is_cancelled
  LOOP
    FOR booked_seat IN 
      SELECT unnest(existing_booking.seats)
    LOOP
      IF booked_seat = ANY(NEW.seats) THEN
        RAISE EXCEPTION 'Seat % is already booked for date %', booked_seat, NEW.departure_date;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;