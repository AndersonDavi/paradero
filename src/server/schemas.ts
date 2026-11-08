import { z } from "zod";

const nstr = z.string().nullable().optional();

const routeSummary = z.object({
  route_id: z.string(),
  short_name: nstr,
  long_name: nstr,
  system: nstr,
});

export const stop = z.object({
  stop_id: z.string(),
  name: z.string(),
  kind: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  wheelchair_boarding: nstr,
  distance_m: z.number().nullable().optional(),
  routes: z.array(routeSummary).default([]),
});

export const stopsSearch = z.object({ stops: z.array(stop) });

export const stopLookup = z.object({ found: z.boolean(), stop: stop.nullable().optional() });

export const routesSearch = z.object({
  routes: z.array(
    routeSummary.extend({
      first_departure: nstr,
      last_departure: nstr,
      trips_per_week: z.number().nullable().optional(),
    }),
  ),
});

export const arrivals = z.object({
  as_of: z.string(),
  live: z.boolean().optional(),
  found: z.boolean(),
  arrivals: z.array(
    z.object({
      predicted_at: nstr,
      minutes_away: z.number().nullable().optional(),
      basis: z.enum(["predicted", "estimated", "scheduled"]),
      delay_seconds: z.number().nullable().optional(),
      route_id: nstr,
      route_code: nstr,
      route_name: nstr,
      system: nstr,
      vehicle_label: nstr,
    }),
  ),
});

export const alerts = z.object({
  alerts: z.array(
    z.object({
      alert_id: z.string(),
      effect: nstr,
      description: nstr,
      active_periods: z.array(z.object({ start: nstr, end: nstr })).default([]),
      routes: z.array(z.object({ route_code: nstr })).default([]),
    }),
  ),
});

export const vehicles = z.object({
  as_of: z.string(),
  live: z.boolean().optional(),
  total_pages: z.number().int(),
  vehicles: z.array(
    z.object({
      vehicle_id: nstr,
      label: nstr,
      license_plate: nstr,
      latitude: z.number(),
      longitude: z.number(),
      route_id: nstr,
      route_code: nstr,
      route_name: nstr,
      system: nstr,
      stop_name: nstr,
      reported_at: nstr,
    }),
  ),
});

export const route = z.object({
  as_of: z.string(),
  found: z.boolean(),
  route: z
    .object({
      route_id: z.string(),
      short_name: nstr,
      long_name: nstr,
      system: nstr,
      patterns: z.array(
        z.object({
          trips_per_week: z.number().int(),
          stops: z.array(z.object({ stop_id: z.string(), name: nstr, latitude: z.number().nullable(), longitude: z.number().nullable() })),
          geometry: z.object({ coordinates: z.array(z.array(z.number())) }).nullable(),
        }),
      ),
    })
    .nullable(),
});
