import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useRoomStore } from "@/store/useRoomStore";
import CreateRoom from "./components/Room/CreateRoom";
import RoomPage from "./components/Room/RoomPage";
import LoginPage from "./components/Auth/LoginPage";
import SummaryPage from "./components/Room/SummaryPage";
import DashboardLayout from "./components/Dashboard/DashboardLayout";
import ActiveRooms from "./components/Dashboard/ActiveRooms";
import HistoryPage from "./components/Dashboard/HistoryPage";

function App() {
  const { user, setUser } = useRoomStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <LoginPage />}
          />
          <Route
            element={user ? <DashboardLayout /> : <Navigate to="/login" />}
          >
            <Route path="/" element={<CreateRoom />} />
            <Route path="/rooms" element={<ActiveRooms />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>

          <Route
            path="/room/:roomId"
            element={user ? <RoomPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/room/:roomId/summary"
            element={user ? <SummaryPage /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
