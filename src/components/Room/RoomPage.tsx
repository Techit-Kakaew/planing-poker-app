import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useRoomStore, type Participant } from "@/store/useRoomStore";
import TaskList from "../Tasks/TaskList";
import VotingPanel from "../Voting/VotingPanel";
import PresenceAvatars from "./PresenceAvatars";
import { Button } from "@/components/ui/button";
import { LogOut, Share2 } from "lucide-react";

const normalizeParticipants = (presenceState: Record<string, unknown[]>) => {
  const deduped = new Map<string, Participant>();

  Object.values(presenceState).forEach((entries) => {
    entries.forEach((entry) => {
      const participant = entry as Participant;
      if (!participant?.user_id) return;

      const existing = deduped.get(participant.user_id);
      if (!existing) {
        deduped.set(participant.user_id, participant);
        return;
      }

      deduped.set(participant.user_id, {
        ...existing,
        ...participant,
        user_name: participant.user_name || existing.user_name,
        avatar_url: participant.avatar_url || existing.avatar_url,
      });
    });
  });

  return Array.from(deduped.values()).sort((a, b) =>
    (a.user_name || "").localeCompare(b.user_name || "", undefined, {
      sensitivity: "base",
    }),
  );
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    setRoomId,
    tasks,
    setTasks,
    setVotes,
    user,
    setParticipants,
    setRoomOwnerId,
    roomOwnerId,
    currentTaskId,
    setCurrentTaskId,
    setLeaderSelectedTaskId,
  } = useRoomStore();
  const [roomName, setRoomName] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const roomTaskIdsRef = useRef<string[]>([]);
  const initialTaskFromUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId || initialTaskFromUrlRef.current) return;

    initialTaskFromUrlRef.current = searchParams.get("task");
  }, [roomId, searchParams]);

  useEffect(() => {
    if (!roomId) return;
    setRoomId(roomId);

    // Fetch initial data
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("name, owner_id, current_task_id, status")
        .eq("id", roomId)
        .single();

      if (error || !data) {
        console.error("Room not found");
        navigate("/");
        return;
      }

      if (data.status === "completed") {
        navigate(`/room/${roomId}/summary`);
        return;
      }
      if (data) {
        setRoomName(data.name);
        setRoomOwnerId(data.owner_id);
        if (data.current_task_id) {
          setLeaderSelectedTaskId(data.current_task_id);
          // Also set as active task for the leader themselves
          if (data.owner_id === user?.id) {
            setCurrentTaskId(data.current_task_id);
          }
        }
      }
    };
    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("room_id", roomId)
        .order("order_index");

      if (data) {
        roomTaskIdsRef.current = data.map((task) => task.id);
        setTasks(data);
        setHasLoaded(true);
      }
    };

    const fetchVotes = async (taskIds = roomTaskIdsRef.current) => {
      if (taskIds.length === 0) {
        setVotes([]);
        return;
      }

      const { data } = await supabase
        .from("votes")
        .select("*")
        .in("task_id", taskIds);

      if (data) setVotes(data);
    };

    const loadInitialRoomData = async () => {
      await fetchRoom();
      await fetchTasks();
      await fetchVotes(roomTaskIdsRef.current);
    };

    loadInitialRoomData();

    // Presence and Subscriptions
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const { data } = await supabase
            .from("tasks")
            .select("*")
            .eq("room_id", roomId)
            .order("order_index");

          if (!data) return;

          roomTaskIdsRef.current = data.map((task) => task.id);
          setTasks(data);
          setHasLoaded(true);
          await fetchVotes(roomTaskIdsRef.current);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        (payload) => {
          const changedTaskId =
            payload.eventType === "DELETE"
              ? payload.old.task_id
              : payload.new.task_id;

          if (
            changedTaskId &&
            roomTaskIdsRef.current.includes(changedTaskId as string)
          ) {
            fetchVotes();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new.owner_id) setRoomOwnerId(payload.new.owner_id);
          if (payload.new.current_task_id !== undefined)
            setLeaderSelectedTaskId(payload.new.current_task_id);
          if (payload.new.status === "completed") {
            navigate(`/room/${roomId}/summary`);
          }
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setParticipants(
          normalizeParticipants(state as unknown as Record<string, unknown[]>),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user?.id,
            user_name: user?.user_metadata?.full_name || user?.email,
            avatar_url:
              user?.user_metadata?.avatar_url || user?.user_metadata?.picture,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    roomId,
    user,
    setRoomId,
    setTasks,
    setVotes,
    setParticipants,
    setRoomOwnerId,
    setLeaderSelectedTaskId,
    setCurrentTaskId,
    navigate,
  ]);

  useEffect(() => {
    if (!initialTaskFromUrlRef.current) return;

    setCurrentTaskId(initialTaskFromUrlRef.current);
    initialTaskFromUrlRef.current = null;
  }, [setCurrentTaskId]);

  // Update URL search params when currentTaskId changes
  useEffect(() => {
    const taskInUrl = searchParams.get("task");

    if (currentTaskId && taskInUrl !== currentTaskId) {
      setSearchParams({ task: currentTaskId }, { replace: true });
    } else if (!currentTaskId && taskInUrl) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("task");
      setSearchParams(newParams, { replace: true });
    }
  }, [currentTaskId, setSearchParams, searchParams]);

  // Validate currentTaskId against tasks list (handle deletion or invalid URL)
  useEffect(() => {
    // Only run validation after we've finished the initial fetch
    if (!hasLoaded) return;

    // 1. If we have a task ID in URL but it's not in the list, clear it
    if (currentTaskId) {
      const exists = tasks.some((t) => t.id === currentTaskId);
      if (!exists && tasks.length > 0) {
        console.warn("Selected task not found, clearing selection");
        setCurrentTaskId(null);
        setSearchParams({}, { replace: true });
      }
    }

    // 2. If the room is empty, ensure no task is selected in URL
    if (tasks.length === 0 && searchParams.get("task")) {
      setCurrentTaskId(null);
      setSearchParams({}, { replace: true });
    }
  }, [
    tasks,
    currentTaskId,
    setCurrentTaskId,
    setSearchParams,
    searchParams,
    hasLoaded,
  ]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-xs">
              {roomName || "Loading..."}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="text-slate-500 hover:text-indigo-600 rounded-xl"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
          <PresenceAvatars />
        </div>
        <div className="flex items-center space-x-2">
          {user?.id === roomOwnerId && (
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const confirm = window.confirm(
                  "End this meeting and show summary?",
                );
                if (!confirm) return;
                const { error } = await supabase
                  .from("rooms")
                  .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", roomId);
                if (error) console.error("Error ending meeting:", error);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              End Meeting
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="text-slate-600 dark:text-slate-400 rounded-xl border-slate-200 dark:border-slate-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Task List */}
        <div className="w-1/3 min-w-[320px] bg-white dark:bg-slate-900 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
          <TaskList />
        </div>

        {/* Right: Voting Panel */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
          <VotingPanel />
        </div>
      </main>
    </div>
  );
}
