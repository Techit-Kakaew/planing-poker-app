import { useRoomStore, type Participant } from "@/store/useRoomStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { Crown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PresenceAvatars() {
  const { participants, user, roomId, roomOwnerId } = useRoomStore();
  const isOwner = user?.id === roomOwnerId;

  // Deduplicate participants by user_id
  const uniqueParticipants = Array.from(
    new Map(participants.map((p) => [p.user_id, p])).values(),
  ) as Participant[];

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!roomId || !isOwner) return;
    const confirm = window.confirm(
      "Are you sure you want to transfer room ownership?",
    );
    if (!confirm) return;

    const { error } = await supabase
      .from("rooms")
      .update({ owner_id: newOwnerId })
      .eq("id", roomId);

    if (error) console.error("Error transferring ownership:", error);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-3 overflow-hidden p-1">
        {uniqueParticipants.slice(0, 5).map((p, i) => (
          <Tooltip key={p.user_id || i}>
            <TooltipTrigger>
              <div
                className={`
                  inline-block h-8 w-8 rounded-full ring-2 transition-all transform hover:-translate-y-1 hover:z-10 cursor-default relative
                  ${p.user_id === roomOwnerId ? "ring-amber-400 dark:ring-amber-500 shadow-sm shadow-amber-400/20" : "ring-white dark:ring-slate-900"}
                  bg-slate-200 dark:bg-slate-800 overflow-hidden
                `}
                style={{ zIndex: 10 - i }}
              >
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.user_name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center h-full w-full ${p.user_id === roomOwnerId ? "bg-amber-500" : "bg-indigo-500"} text-white text-[10px] font-bold`}
                  >
                    {p.user_name?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                )}
                {p.user_id === roomOwnerId && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5 shadow-sm">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold">{p.user_name}</p>
                {p.user_id === roomOwnerId && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full font-bold uppercase">
                    Leader
                  </span>
                )}
              </div>
              {isOwner && p.user_id !== user?.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTransferOwnership(p.user_id)}
                  className="h-7 text-[10px] py-0 px-2 bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white font-bold rounded-lg transition-all"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Transfer Leadership
                </Button>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
        {uniqueParticipants.length > 5 && (
          <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 z-0">
            +{uniqueParticipants.length - 5}
          </div>
        )}
        <div className="ml-4 flex flex-col">
          <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
            {uniqueParticipants.length} Participant
            {uniqueParticipants.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] font-medium text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Active now
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
