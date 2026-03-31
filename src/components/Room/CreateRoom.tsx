import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useRoomStore } from "@/store/useRoomStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Boxes } from "lucide-react";

export default function CreateRoom() {
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useRoomStore();
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .insert([
          {
            name: roomName,
            owner_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        navigate(`/room/${data.id}`);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Make sure Supabase is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Card className="w-full max-w-lg shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Boxes className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Planning Poker
          </CardTitle>
          <CardDescription>
            Start a new estimation session with your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="room-name"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Room Name
            </label>
            <Input
              id="room-name"
              placeholder="e.g. Sprint 24 Planning"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="h-12 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleCreateRoom}
            disabled={loading || !roomName}
            className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? "Creating..." : "Create Room"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
