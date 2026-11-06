CREATE OR REPLACE FUNCTION public.offer_ride_for_wish(_wish_id uuid, _ride_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.current_profile_id(); w record; r record; v_name text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO r FROM rides WHERE id = _ride_id AND driver_id = v_me;
  IF NOT FOUND THEN RAISE EXCEPTION 'ride not found'; END IF;
  SELECT * INTO w FROM ride_wishes WHERE id = _wish_id AND active = true;
  IF NOT FOUND OR w.passenger_id = v_me THEN RETURN; END IF;
  SELECT full_name INTO v_name FROM profiles WHERE id = v_me;
  INSERT INTO notifications(profile_id, title, message, is_global)
  VALUES (w.passenger_id, '🚗 Vodič ti ponúkol jazdu!',
    coalesce(v_name,'Vodič') || ' ponúkol jazdu ' || r.origin_address || ' → ' || r.destination_address || ' (' || to_char(r.departure_time AT TIME ZONE 'Europe/Bratislava','DD.MM. HH24:MI') || '). Otvor: /ride/' || r.id, false);
  PERFORM public.send_push_via_edge(w.passenger_id, '🚗 Vodič ti ponúkol jazdu!',
    coalesce(v_name,'Vodič') || ' ponúkol jazdu ' || r.origin_address || ' → ' || r.destination_address || '. Klikni a rezervuj si miesto.',
    jsonb_build_object('rideId', r.id, 'type', 'wish_offer', 'url', '/ride/' || r.id));
END $$;
REVOKE ALL ON FUNCTION public.offer_ride_for_wish(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offer_ride_for_wish(uuid, uuid) TO authenticated;