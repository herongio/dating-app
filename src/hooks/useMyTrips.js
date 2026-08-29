import { useEffect, useState } from "react";
import { subscribeToMyTrips } from "../firebase/trips";
import { useAuth } from "../context/AuthContext";
import { todayKey } from "../utils/trips";

export function useMyTrips() {
  const { currentUser } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = currentUser?.id;

  useEffect(() => {
    if (!uid) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToMyTrips(uid, (next) => {
      setTrips(next);
      setLoading(false);
    });
  }, [uid]);

  // Finished trips stay in the list so you can look back at them, but only
  // upcoming ones can produce new matches.
  const today = todayKey();
  return {
    trips,
    upcoming: trips.filter((t) => t.endDate >= today),
    loading,
  };
}
