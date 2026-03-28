import { z } from "zod";

const citySchema = z.object({
  code: z.string(),
  name: z.string(),
  coordinates: z.array(z.number()),
  tourismScore: z.number(),
  country: z.string(),
});

const flightSegmentSchema = z.object({
  airline: z.string(),
  flightNumber: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  price: z.number(),
  bookingUrl: z.string(),
});

const layoverOptionSchema = z.object({
  id: z.string(),
  cityCode: z.string(),
  stayDuration: z.number(),
  stayLabel: z.string(),
  legA: flightSegmentSchema,
  legB: flightSegmentSchema,
  totalFlightPrice: z.number(),
  estimatedAccommodation: z.number(),
  totalEstimatedPrice: z.number(),
});

export const propSchema = z.object({
  origin: citySchema,
  destination: citySchema,
  departureDate: z.string(),
  maxLayoverNights: z.number(),
  layoverCities: z.array(citySchema),
  options: z.array(layoverOptionSchema),
  mapboxToken: z.string(),
});

export type LayoverMapProps = z.infer<typeof propSchema>;
export type CityInfo = z.infer<typeof citySchema>;
export type FlightSegment = z.infer<typeof flightSegmentSchema>;
export type LayoverOption = z.infer<typeof layoverOptionSchema>;
