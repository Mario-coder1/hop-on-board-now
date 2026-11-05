-- Real database projection checks: sparse segments, behind/ahead, tolerance and off-route GPS.
WITH driver AS (
 SELECT * FROM public.route_position_m('[[18,49],[18.1,49],[18.2,49]]'::jsonb,18.15,49)
), behind AS (
 SELECT * FROM public.route_position_m('[[18,49],[18.1,49],[18.2,49]]'::jsonb,18.02,49)
), ahead AS (
 SELECT * FROM public.route_position_m('[[18,49],[18.1,49],[18.2,49]]'::jsonb,18.19,49)
), nearby AS (
 SELECT * FROM public.route_position_m('[[18,49],[18.1,49],[18.2,49]]'::jsonb,18.149,49)
), off_route AS (
 SELECT * FROM public.route_position_m('[[18,49],[18.1,49],[18.2,49]]'::jsonb,18.15,49.1)
)
SELECT 1 / CASE WHEN driver.progress_m > behind.progress_m + 1000 THEN 1 ELSE 0 END AS behind_blocked,
 1 / CASE WHEN driver.progress_m < ahead.progress_m THEN 1 ELSE 0 END AS ahead_allowed,
 1 / CASE WHEN driver.progress_m - nearby.progress_m < 1000 THEN 1 ELSE 0 END AS nearby_allowed,
 1 / CASE WHEN off_route.distance_m > 2000 THEN 1 ELSE 0 END AS off_route_not_evidence,
 1 / CASE WHEN driver.progress_m > 10000 AND driver.progress_m < 12000 THEN 1 ELSE 0 END AS sparse_segment_projection
FROM driver, behind, ahead, nearby, off_route;