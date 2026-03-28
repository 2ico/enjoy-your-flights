import React from "react";
import type { CityInfo, LayoverOption } from "../types";
import { CityCard } from "./CityCard";
import { OptionCard } from "./OptionCard";

interface SidebarProps {
  origin: CityInfo;
  destination: CityInfo;
  departureDate: string;
  layoverCities: CityInfo[];
  selectedCity: CityInfo | null;
  selectedCityOptions: LayoverOption[];
  allOptions: LayoverOption[];
  onSelectCity: (code: string) => void;
  onBack: () => void;
  getDurationLabels: (code: string) => string;
  getOptionsByCity: (code: string) => LayoverOption[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  origin,
  destination,
  departureDate,
  layoverCities,
  selectedCity,
  selectedCityOptions,
  allOptions,
  onSelectCity,
  onBack,
  getDurationLabels,
  getOptionsByCity,
}) => {
  const formattedDate = new Date(departureDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="eyf-sidebar">
      {/* Header */}
      <div className="eyf-sidebar-header">
        <h1 className="eyf-title">Enjoy Your Flights</h1>
        <p className="eyf-route">
          {origin.name} → {destination.name}
        </p>
        <p className="eyf-date">{formattedDate}</p>
      </div>

      {/* Content */}
      <div className="eyf-sidebar-content">
        {selectedCity ? (
          // City detail view
          <>
            <button className="eyf-back-btn" onClick={onBack}>
              ← Back to all cities
            </button>
            <h2 className="eyf-city-detail-title">
              Layovers in {selectedCity.name}
            </h2>
            <p className="eyf-city-detail-subtitle">
              {"★".repeat(Math.round(selectedCity.tourismScore / 2))}{" "}
              Tourism Score: {selectedCity.tourismScore}/10
            </p>
            <div className="eyf-options-list">
              {selectedCityOptions.map((option) => (
                <OptionCard key={option.id} option={option} city={selectedCity} />
              ))}
            </div>
          </>
        ) : (
          // Overview: list of layover cities
          <>
            <h2 className="eyf-section-title">
              Best Layover Cities
            </h2>
            <p className="eyf-section-subtitle">
              {layoverCities.length} cities found — click to explore options
            </p>
            <div className="eyf-cities-list">
              {layoverCities.map((city) => {
                const cityOptions = getOptionsByCity(city.code);
                const cheapest = Math.min(
                  ...cityOptions.map((o) => o.totalEstimatedPrice)
                );
                const mostExpensive = Math.max(
                  ...cityOptions.map((o) => o.totalEstimatedPrice)
                );
                return (
                  <CityCard
                    key={city.code}
                    city={city}
                    durationLabels={getDurationLabels(city.code)}
                    priceRange={`$${cheapest} – $${mostExpensive}`}
                    optionCount={cityOptions.length}
                    onClick={() => onSelectCity(city.code)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
