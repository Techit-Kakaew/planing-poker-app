import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useRoomStore } from "@/store/useRoomStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  ArrowRight,
  CheckCircle2,
  History as HistoryIcon,
} from "lucide-react";

interface Room {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
}

export default function HistoryPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useRoomStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch rooms where I am owner
        const { data: ownedRooms } = await supabase
          .from("rooms")
          .select("*")
          .eq("owner_id", user.id)
          .eq("status", "completed");

        // 2. Fetch rooms where I am a participant (voted)
        const { data: myVotes } = await supabase
          .from("votes")
          .select("task_id")
          .eq("user_id", user.id);

        const taskIds = myVotes?.map((v) => v.task_id) || [];

        let participatedRooms: Room[] = [];
        if (taskIds.length > 0) {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("room_id")
            .in("id", taskIds);

          const roomIds = Array.from(
            new Set(tasks?.map((t) => t.room_id) || []),
          );

          if (roomIds.length > 0) {
            const { data: pRooms } = await supabase
              .from("rooms")
              .select("*")
              .in("id", roomIds)
              .eq("status", "completed");

            participatedRooms = pRooms || [];
          }
        }

        // Combine and deduplicate
        const allRoomsMap = new Map();
        ownedRooms?.forEach((r) => allRoomsMap.set(r.id, r));
        participatedRooms.forEach((r) => allRoomsMap.set(r.id, r));

        const sortedRooms = Array.from(allRoomsMap.values()).sort(
          (a, b) =>
            new Date(b.completed_at || b.created_at).getTime() -
            new Date(a.completed_at || a.created_at).getTime(),
        );

        setRooms(sortedRooms);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center sm:text-left">
          Room History
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
          View your completed session reports and summaries.
        </p>
      </div>

      {rooms.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent text-center py-12">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <HistoryIcon className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            </div>
            <CardTitle className="text-slate-400 dark:text-slate-500 italic">
              No historical data yet
            </CardTitle>
            <CardDescription>
              Complete a session to generate its summary report.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button
              variant="outline"
              onClick={() => navigate("/rooms")}
              className="rounded-xl"
            >
              Check Active Sessions
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="group hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              onClick={() => navigate(`/room/${room.id}/summary`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg translate-y-0 group-hover:-translate-y-1 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Completed
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {room.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(
                    room.completed_at || room.created_at,
                  ).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center py-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  View Report
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
