import { useState } from "react";
import { useRoomStore } from "@/store/useRoomStore";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Check, Eye, EyeOff, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PokerCard from "./PokerCard";
import { POKER_CARDS, POKER_GRADIENTS } from "@/constants/poker";
import { renderTitleWithLinks } from "@/lib/renderTaskTitle";
import { cn } from "@/lib/utils";

interface VoteResult {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  value: string;
}

export default function VotingPanel() {
  const {
    user,
    tasks,
    currentTaskId,
    votes,
    participants: participantsList,
    roomOwnerId,
  } = useRoomStore();
  const isOwner = user?.id === roomOwnerId;

  const [isRevealing, setIsRevealing] = useState(false);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);

  const currentTask = tasks.find((t) => t.id === currentTaskId);
  const revealed = currentTask?.revealed || false;
  const myVote = votes.find(
    (v) => v.task_id === currentTaskId && v.user_id === user?.id,
  );

  const handleVote = async (value: string) => {
    if (!currentTaskId || !user || revealed) return;
    setLoadingCard(value);

    try {
      if (myVote?.value === value) {
        // Deselect: remove the vote
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("task_id", currentTaskId)
          .eq("user_id", user.id);

        if (error) console.error("Error removing vote:", error);
      } else {
        const { error } = await supabase.from("votes").upsert(
          {
            task_id: currentTaskId,
            user_id: user.id,
            value: value,
            user_name: user.user_metadata.full_name || user.email,
            avatar_url: user.user_metadata.avatar_url,
          },
          { onConflict: "task_id,user_id" },
        );

        if (error) console.error("Error voting:", error);
      }
    } finally {
      setLoadingCard(null);
    }
  };

  const handleToggleReveal = async () => {
    if (!currentTaskId) return;
    setIsRevealing(true);
    const { error } = await supabase
      .from("tasks")
      .update({ revealed: !revealed })
      .eq("id", currentTaskId);

    if (error) console.error("Error toggling reveal:", error);
    setIsRevealing(false);
  };

  const handleResetVotes = async () => {
    if (!currentTaskId) return;

    // Hide results when resetting
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ revealed: false })
      .eq("id", currentTaskId);

    if (taskError) console.error("Error resetting reveal state:", taskError);

    const { error: voteError } = await supabase
      .from("votes")
      .delete()
      .eq("task_id", currentTaskId);

    if (voteError) console.error("Error resetting votes:", voteError);
  };

  if (!currentTaskId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-4">
        <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-full animate-pulse">
          <EyeOff className="w-12 h-12" />
        </div>
        <div className="max-w-xs">
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
            No Task Selected
          </h3>
          <p className="mt-2 text-slate-500">
            Select a task from the list on the left to start voting with your
            team.
          </p>
        </div>
      </div>
    );
  }

  // Logic for grouped results including participants who didn't vote
  const votesByValue = revealed
    ? participantsList.reduce(
        (acc, p) => {
          const vote = votes.find(
            (v) => v.task_id === currentTaskId && v.user_id === p.user_id,
          );
          const value = vote ? vote.value : "🚫";

          if (!acc[value]) acc[value] = [];
          acc[value].push({
            id: p.user_id,
            user_id: p.user_id,
            user_name: p.user_name,
            avatar_url: p.avatar_url,
            value: value,
          });
          return acc;
        },
        {} as Record<string, VoteResult[]>,
      )
    : null;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-24">
        {/* Current Task Header */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-full">
              Currently estimating
            </span>
            <div className="flex gap-2">
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetVotes}
                    className="text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleToggleReveal}
                    disabled={isRevealing}
                    className={`
                      rounded-xl shadow-lg transition-all
                      ${
                        revealed
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                      }
                    `}
                  >
                    {revealed ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide Results
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Reveal Votes
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-tight">
            {renderTitleWithLinks(currentTask?.title || "")}
          </h2>
        </section>

        {/* Participants Row - Only show when NOT revealed */}
        {!revealed && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Team Progress
              </h3>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mr-6">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center -space-x-4">
                {participantsList.map((p, i) => {
                  const hasVoted = votes.some(
                    (v) =>
                      v.task_id === currentTaskId && v.user_id === p.user_id,
                  );

                  return (
                    <TooltipProvider key={p.user_id}>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className={`
                              w-12 h-12 rounded-full ring-4 ring-white dark:ring-slate-900 overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 transition-all cursor-default
                              ${hasVoted ? "border-green-500 scale-110 z-10" : "border-transparent opacity-50"}
                             `}
                            style={{ zIndex: 20 - i }}
                          >
                            {p.avatar_url ? (
                              <img
                                src={p.avatar_url}
                                alt={p.user_name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white text-sm font-bold">
                                {p.user_name?.slice(0, 1).toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-bold">
                            {p.user_name || "Unknown User"}
                          </p>
                          <p className="text-[10px] opacity-70">
                            {hasVoted ? "Voted" : "Thinking..."}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Grouped Results */}
        {revealed && votesByValue && (
          <section className="space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
              Results
            </h3>
            <div className="space-y-6">
              {Object.entries(votesByValue)
                .sort((a, b) => {
                  if (a[0] === "☕") return 1;
                  if (b[0] === "☕") return -1;
                  if (a[0] === "?") return 1;
                  if (b[0] === "?") return -1;
                  return Number(a[0]) - Number(b[0]);
                })
                .map(([value, members]) => (
                  <div
                    key={value}
                    className="flex items-center space-x-6 group/result"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            onClick={async () => {
                              if (isOwner && currentTaskId && value !== "?") {
                                const { error } = await supabase
                                  .from("tasks")
                                  .update({ final_score: value })
                                  .eq("id", currentTaskId);
                                if (error)
                                  console.error(
                                    "Error setting final score:",
                                    error,
                                  );
                              }
                            }}
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm transition-all animate-in fade-in zoom-in duration-300",
                              value === "?"
                                ? "bg-slate-400 cursor-default"
                                : value === "☕"
                                  ? "bg-linear-to-b from-amber-500 to-amber-800"
                                  : `bg-linear-to-b ${POKER_GRADIENTS[POKER_CARDS.indexOf(value)] || "bg-indigo-600"}`,
                              isOwner &&
                                value !== "?" &&
                                "cursor-pointer hover:scale-110 active:scale-95 ring-4 ring-white/20 dark:ring-white/10 hover:ring-white/40",
                            )}
                          >
                            {value}
                          </div>
                        </TooltipTrigger>
                        {isOwner && value !== "?" && (
                          <TooltipContent>
                            <p>Set as final score</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    <div className="flex -space-x-3">
                      {members.map((m, i) => (
                        <TooltipProvider key={m.id}>
                          <Tooltip>
                            <TooltipTrigger>
                              <div
                                className="w-12 h-12 rounded-full ring-4 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-transparent transition-all hover:z-20 hover:scale-110"
                                style={{ zIndex: members.length - i }}
                              >
                                {m.avatar_url ? (
                                  <img
                                    src={m.avatar_url}
                                    alt={m.user_name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white text-xs font-bold">
                                    {m.user_name?.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">
                                {m.user_name}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      {/* Voting Cards Footer */}
      <section className="p-4 pt-12 border-t border-slate-200 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md overflow-visible">
        <PokerCard
          currentCard={myVote?.value || null}
          loadingCard={loadingCard}
          isDisabled={revealed}
          onCardClick={handleVote}
        />
      </section>
    </div>
  );
}
