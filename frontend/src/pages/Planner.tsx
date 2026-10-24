import { useState } from "react";
import FilterPanel from "../features/Filters/FilterPanel";
import ItineraryPanel, {
  DatedActivity,
  ActivitiesByDate,
} from "../features/Itinerary/ItineraryPanel";
import MapView from "../features/Map/MapView";
import SearchDashboard from "../features/Search/SearchDashboard";
import { Location } from "../components/LocationPicker/LocationPicker";
import "./Planner.css";

interface PlannerProps {
  arrivalDate?: Date;
  departureDate?: Date;
  location?: Location;
}

function formatDate(date?: Date): string {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return validDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });
}

const DEFAULT_LOCATION: Location = {
  name: "Providence, RI",
  lat: 41.824,
  lng: -71.4128,
};

export const Planner: React.FC<PlannerProps> = ({
  arrivalDate = new Date(),
  departureDate = new Date(),
  location = DEFAULT_LOCATION,
}) => {
  const [activitiesByDate, setActivitiesByDate] = useState<ActivitiesByDate>(
    {}
  );
  const [currentDate, setCurrentDate] = useState<string>(
    formatDate(arrivalDate)
  );
  const [highlightMode, setHighlightMode] = useState<
    "none" | "weather" | "redlining"
  >("none");

  const handleRemoveActivity = (date: string, id: string) => {
    console.log("remove");
    setActivitiesByDate((prev) => {
      const updated = [...(prev[date] || [])].filter((a) => a.id !== id);
      return { ...prev, [date]: updated };
    });
  };

  const handleReorderActivities = (
    date: string,
    reordered: DatedActivity[]
  ) => {
    setActivitiesByDate((prev) => ({ ...prev, [date]: reordered }));
  };

  const handleSetActivities = (newActivity: DatedActivity) => {
    setActivitiesByDate((prev) => {
      const current = prev[newActivity.date] || [];

      const alreadyExists = current.some((a) => a.id === newActivity.id);
      if (alreadyExists) return prev;

      return {
        ...prev,
        [newActivity.date]: [...current, newActivity],
      };
    });
  };

  const allActivities = Object.values(activitiesByDate).flat();

  return (
    <section id="planner" className="planner-container">
      <ItineraryPanel
        arrivalDate={arrivalDate}
        departureDate={departureDate}
        activitiesByDate={activitiesByDate}
        onRemoveActivity={handleRemoveActivity}
        onReorderActivities={handleReorderActivities}
        onDateChange={setCurrentDate}
        currentDate={currentDate}
        highlightMode={highlightMode}
        onHighlightModeChange={setHighlightMode}
      />

      <div className="planner-map">
        <div className="map-search-bar">
          <SearchDashboard
            activities={allActivities}
            setActivities={(items) =>
              items.forEach((item) => handleSetActivities(item))
            }
            date={currentDate}
          />
        </div>
        <MapView
          markers={activitiesByDate[currentDate] || []}
          lat={location.lat}
          lng={location.lng}
          highlightMode={highlightMode}
        />
      </div>
    </section>
  );
};

export default Planner;