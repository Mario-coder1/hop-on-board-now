SELECT
  1 / CASE WHEN public.segment_free_seats(1,'[[0,100]]',100,200)=1 THEN 1 ELSE 0 END AS nitra_kosice_available,
  1 / CASE WHEN public.segment_free_seats(1,'[[0,100]]',0,200)=0 THEN 1 ELSE 0 END AS bratislava_kosice_full,
  1 / CASE WHEN public.segment_free_seats(1,'[[0,100],[100,200]]',0,200)=0 THEN 1 ELSE 0 END AS adjacent_not_double_counted,
  1 / CASE WHEN public.segment_free_seats(2,'[[0,100],[100,200]]',0,200)=1 THEN 1 ELSE 0 END AS two_seats_one_free,
  1 / CASE WHEN public.segment_free_seats(2,'[[0,150],[100,200]]',0,200)=0 THEN 1 ELSE 0 END AS overlapping_full,
  1 / CASE WHEN public.segment_free_seats(1,'[]',0,200)=1 THEN 1 ELSE 0 END AS completed_restores_one,
  1 / CASE WHEN public.segment_free_seats(1,'[[0,1000000000000000]]',100,200)=0 THEN 1 ELSE 0 END AS unknown_blocks_full_route;