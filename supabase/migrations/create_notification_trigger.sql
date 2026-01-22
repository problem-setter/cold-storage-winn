-- Buat function untuk detect perubahan dan trigger notification
CREATE OR REPLACE FUNCTION notify_component_changes()
RETURNS TRIGGER AS $$
DECLARE
  title TEXT;
  msg TEXT;
  prev_record RECORD;
BEGIN
  -- Get previous record
  IF TG_OP = 'UPDATE' THEN
    prev_record := OLD;
  ELSE
    prev_record := NULL;
  END IF;

  -- Check Compressor Status Change
  IF NEW.comp_on <> prev_record.comp_on AND TG_OP = 'UPDATE' THEN
    IF prev_record.comp_on = 1 AND NEW.comp_on = 0 THEN
      title := '🔴 Kompressor Mati';
      msg := 'Kompressor telah berhenti';
    END IF;
  END IF;

  -- Check Compressor Fault
  IF NEW.comp_fault <> prev_record.comp_fault AND TG_OP = 'UPDATE' THEN
    IF prev_record.comp_fault = 0 AND NEW.comp_fault = 1 THEN
      title := '🔧 Kompressor Error';
      msg := 'Kompressor mengalami gangguan/error';
    END IF;
  END IF;

  -- Check Evaporator Status Change
  IF NEW.evap_on <> prev_record.evap_on AND TG_OP = 'UPDATE' THEN
    IF prev_record.evap_on = 1 AND NEW.evap_on = 0 THEN
      title := '🔴 Evaporator Mati';
      msg := 'Evaporator telah berhenti';
    END IF;
  END IF;

  -- Check Evaporator Fault
  IF NEW.evap_fault <> prev_record.evap_fault AND TG_OP = 'UPDATE' THEN
    IF prev_record.evap_fault = 0 AND NEW.evap_fault = 1 THEN
      title := '❄️ Evaporator Error';
      msg := 'Evaporator mengalami gangguan/error';
    END IF;
  END IF;

  -- Check Condenser Status Change
  IF NEW.cond_on <> prev_record.cond_on AND TG_OP = 'UPDATE' THEN
    IF prev_record.cond_on = 1 AND NEW.cond_on = 0 THEN
      title := '🔴 Kondenser Mati';
      msg := 'Kondenser telah berhenti';
    END IF;
  END IF;

  -- Check Condenser Fault
  IF NEW.cond_fault <> prev_record.cond_fault AND TG_OP = 'UPDATE' THEN
    IF prev_record.cond_fault = 0 AND NEW.cond_fault = 1 THEN
      title := '🌊 Kondenser Error';
      msg := 'Kondenser mengalami gangguan/error';
    END IF;
  END IF;

  -- Check System Power Status
  IF NEW.power_on <> prev_record.power_on AND TG_OP = 'UPDATE' THEN
    IF prev_record.power_on = 1 AND NEW.power_on = 0 THEN
      title := '⚡ Sistem Mati';
      msg := 'Sistem cold storage telah mati';
    END IF;
  END IF;

  -- Check Temperature Fault
  IF NEW.temp_fault <> prev_record.temp_fault AND TG_OP = 'UPDATE' THEN
    IF prev_record.temp_fault = 0 AND NEW.temp_fault = 1 THEN
      title := '🚨 Temperature Sensor Fault';
      msg := 'Terjadi gangguan pada sensor suhu';
    END IF;
  END IF;

  -- If any notification should be sent, call the edge function via http
  IF title IS NOT NULL THEN
    -- Send via http request to edge function
    PERFORM http_post(
      'https://{SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-fcm',
      jsonb_build_object(
        'title', title,
        'body', msg
      ),
      'Bearer {SUPABASE_SERVICE_ROLE_KEY}'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to cold_storage table
DROP TRIGGER IF EXISTS trigger_notify_changes ON cold_storage;
CREATE TRIGGER trigger_notify_changes
AFTER UPDATE ON cold_storage
FOR EACH ROW
EXECUTE FUNCTION notify_component_changes();
