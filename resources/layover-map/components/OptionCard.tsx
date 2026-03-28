import React from "react";
import type { CityInfo, LayoverOption, FlightSegment } from "../types";

interface OptionCardProps {
  option: LayoverOption;
  city: CityInfo;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

function FlightLeg({ leg, index }: { leg: FlightSegment; index: number }) {
  return (
    <div className="eyf-flight-leg">
      <span className="eyf-leg-number">{index}.</span>
      <div className="eyf-leg-details">
        <div className="eyf-leg-top">
          <span className="eyf-leg-date">{formatDate(leg.departureTime)}</span>
          <span className="eyf-leg-airline">{leg.airline} {leg.flightNumber}</span>
        </div>
        <div className="eyf-leg-times">
          <span className="eyf-leg-route">
            {leg.origin} → {leg.destination}
          </span>
          <span className="eyf-leg-time">
            {formatTime(leg.departureTime)} → {formatTime(leg.arrivalTime)}
          </span>
        </div>
        <div className="eyf-leg-price">${leg.price}</div>
      </div>
    </div>
  );
}

export const OptionCard: React.FC<OptionCardProps> = ({ option, city }) => {
  const title =
    option.stayDuration === 0
      ? `Quick layover in ${city.name}`
      : option.stayDuration === 1
      ? `1 day in ${city.name}`
      : `${option.stayDuration} days in ${city.name}`;

  const stayText =
    option.stayDuration === 0
      ? option.stayLabel
      : `${option.stayDuration} night${option.stayDuration > 1 ? "s" : ""} in ${city.name}`;

  return (
    <div className="eyf-option-card">
      <h3 className="eyf-option-title">{title}</h3>

      {/* Flights */}
      <div className="eyf-flights">
        <FlightLeg leg={option.legA} index={1} />
        <FlightLeg leg={option.legB} index={2} />
      </div>

      {/* Stay info */}
      <div className="eyf-stay-info">
        <span className="eyf-stay-icon">🏨</span>
        <span className="eyf-stay-text">{stayText}</span>
      </div>

      {/* Price breakdown */}
      <div className="eyf-price-breakdown">
        <div className="eyf-price-row">
          <span>Flights</span>
          <span>${option.totalFlightPrice}</span>
        </div>
        {option.estimatedAccommodation > 0 && (
          <div className="eyf-price-row">
            <span>Accommodation (est.)</span>
            <span>${option.estimatedAccommodation}</span>
          </div>
        )}
        <div className="eyf-price-row eyf-price-total">
          <span>Total</span>
          <span>${option.totalEstimatedPrice}</span>
        </div>
      </div>

      {/* Booking links */}
      <div className="eyf-booking-links">
        <a
          href={option.legA.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="eyf-book-btn"
        >
          Book {option.legA.origin} → {option.legA.destination}
        </a>
        <a
          href={option.legB.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="eyf-book-btn"
        >
          Book {option.legB.origin} → {option.legB.destination}
        </a>
      </div>
    </div>
  );
};
