import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Users,
  Calendar,
  Trophy,
  ArrowLeft,
  Download,
} from "lucide-react";
import { renderTitleWithLinks } from "@/lib/renderTaskTitle";
import { useRoomStore } from "@/store/useRoomStore";

interface SummaryData {
  room: {
    name: string;
    created_at: string;
    completed_at: string;
  };
  tasks: {
    id: string;
    title: string;
    final_score: string | null;
  }[];
  participants: {
    user_name: string;
    avatar_url: string | null;
  }[];
}

export default function SummaryPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { jiraSiteUrl } = useRoomStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!roomId) return;
      setLoading(true);

      try {
        // 1. Fetch Room Details
        const { data: room, error: roomError } = await supabase
          .from("rooms")
          .select("name, created_at, completed_at")
          .eq("id", roomId)
          .single();

        if (roomError) throw roomError;

        // 2. Fetch Tasks with Final Scores
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("id, title, final_score")
          .eq("room_id", roomId)
          .order("order_index");

        if (tasksError) throw tasksError;

        // 3. Fetch Unique Participants from Votes
        const { data: votes, error: votesError } = await supabase
          .from("votes")
          .select("user_name, avatar_url")
          .in(
            "task_id",
            tasks.map((t) => t.id),
          );

        if (votesError) throw votesError;

        // Deduplicate participants
        const participantMap = new Map();
        votes?.forEach((v) => {
          if (v.user_name && !participantMap.has(v.user_name)) {
            participantMap.set(v.user_name, v.avatar_url);
          }
        });
        const participants = Array.from(participantMap.entries()).map(
          ([name, avatar]) => ({
            user_name: name,
            avatar_url: avatar,
          }),
        );

        setData({
          room,
          tasks,
          participants,
        });
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Summary Not Found
        </h1>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  const completedDate = new Date(
    data.room.completed_at || Date.now(),
  ).toLocaleDateString();
  const totalTasks = data.tasks.length;
  const settledTasks = data.tasks.filter((t) => t.final_score).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-slate-500 hover:text-indigo-600 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back Home
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 dark:border-slate-800"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-2 text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Session Summary
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Great work! The session is successfully concluded.
          </p>
        </div>

        {/* Room Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Date
              </CardDescription>
              <CardTitle className="text-xl">{completedDate}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Settled Tasks
              </CardDescription>
              <CardTitle className="text-xl">
                {settledTasks} / {totalTasks}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Participants
              </CardDescription>
              <CardTitle className="text-xl">
                {data.participants.length} Members
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Tasks List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Estimation Results
            </h2>
            <div className="space-y-3">
              {data.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {renderTitleWithLinks(task.title, jiraSiteUrl ?? undefined)}
                  </span>
                  <div
                    className={`
                    min-w-[40px] h-10 flex items-center justify-center rounded-xl font-black text-lg
                    ${
                      task.final_score
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }
                  `}
                  >
                    {task.final_score || "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participant List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Participated By
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              {data.participants.map((participant, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-indigo-50 dark:border-indigo-900/30 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {participant.avatar_url ? (
                      <img
                        src={participant.avatar_url}
                        alt={participant.user_name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-indigo-500 text-white font-bold text-xs uppercase">
                        {participant.user_name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {participant.user_name}
                  </span>
                </div>
              ))}
              {data.participants.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4 italic">
                  No participants found.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
