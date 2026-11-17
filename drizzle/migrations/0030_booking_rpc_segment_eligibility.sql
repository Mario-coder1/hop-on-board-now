DO $$ DECLARE n text; d text; BEGIN
 FOREACH n IN ARRAY ARRAY['book_free_ride','book_company_ride'] LOOP
 SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=n;
 d:=replace(d,'r.available_seats<=0','public.ride_segment_seats(r.id,_pickup_lat,_pickup_lng,_dropoff_lat,_dropoff_lng)<=0');
 EXECUTE d;
 END LOOP;
END $$;
UPDATE public.ride_requests q SET segment_start_m=s.start_m,segment_end_m=s.end_m FROM public.rides r, LATERAL public.seat_segment(r.route_polyline,NULL,NULL,NULL,NULL) s WHERE q.ride_id=r.id;
