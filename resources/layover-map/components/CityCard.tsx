import React from "react";
import type { CityInfo } from "../types";

interface CityCardProps {
  city: CityInfo;
  durationLabels: string;
  priceRange: string;
  optionCount: number;
  onClick: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  IT: "🇮🇹", FR: "🇫🇷", TR: "🇹🇷", GB: "🇬🇧", DE: "🇩🇪", NL: "🇳🇱",
  ES: "🇪🇸", GR: "🇬🇷", PT: "🇵🇹", AT: "🇦🇹", CZ: "🇨🇿", DK: "🇩🇰",
  CH: "🇨🇭", IE: "🇮🇪", NO: "🇳🇴", SE: "🇸🇪", FI: "🇫🇮", PL: "🇵🇱",
  HU: "🇭🇺", IS: "🇮🇸", AE: "🇦🇪", QA: "🇶🇦", IL: "🇮🇱", JO: "🇯🇴",
  JP: "🇯🇵", KR: "🇰🇷", SG: "🇸🇬", TH: "🇹🇭", HK: "🇭🇰", IN: "🇮🇳",
  CN: "🇨🇳", MY: "🇲🇾", VN: "🇻🇳", TW: "🇹🇼", US: "🇺🇸", CA: "🇨🇦",
  MX: "🇲🇽", BR: "🇧🇷", AR: "🇦🇷", CO: "🇨🇴", PE: "🇵🇪", CL: "🇨🇱",
  ZA: "🇿🇦", KE: "🇰🇪", MA: "🇲🇦", EG: "🇪🇬", ET: "🇪🇹", AU: "🇦🇺",
  NZ: "🇳🇿",
};

export const CityCard: React.FC<CityCardProps> = ({
  city,
  durationLabels,
  priceRange,
  optionCount,
  onClick,
}) => {
  const flag = COUNTRY_FLAGS[city.country] || "🌍";
  const stars = "★".repeat(Math.round(city.tourismScore / 2));

  return (
    <div className="eyf-city-card" onClick={onClick}>
      <div className="eyf-city-card-header">
        <span className="eyf-city-flag">{flag}</span>
        <div className="eyf-city-info">
          <h3 className="eyf-city-name">{city.name}</h3>
          <span className="eyf-city-stars">{stars}</span>
        </div>
        <span className="eyf-city-code">{city.code}</span>
      </div>
      <div className="eyf-city-card-body">
        <div className="eyf-city-durations">
          {durationLabels.split(", ").map((label) => (
            <span key={label} className="eyf-duration-tag">
              {label}
            </span>
          ))}
        </div>
        <div className="eyf-city-meta">
          <span className="eyf-city-price">{priceRange}</span>
          <span className="eyf-city-options">{optionCount} options</span>
        </div>
      </div>
    </div>
  );
};
