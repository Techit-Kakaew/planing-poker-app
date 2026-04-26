import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getTaskIssueDetail,
  type TaskIssueDetailSnapshot,
} from "@/lib/taskDetails";
import TaskIssueDetailDialog from "@/components/Tasks/TaskIssueDetailDialog";

interface TaskDetailButtonProps {
  taskId: string;
  hasDetail?: boolean;
  className?: string;
  variant?: "icon" | "inline";
}

export default function TaskDetailButton({
  taskId,
  hasDetail = true,
  className = "",
  variant = "icon",
}: TaskDetailButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskIssueDetailSnapshot | null>(null);

  if (!hasDetail) {
    return null;
  }

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const result = await getTaskIssueDetail(taskId);
      setDetail(result);

      if (!result) {
        setError("No shared task detail is available for this item yet.");
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load task details",
      );
    } finally {
      setLoading(false);
    }
  };
  const triggerClassName =
    variant === "inline"
      ? `inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 ${className}`
      : `inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 ${className}`;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className={triggerClassName}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleOpen();
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>View task details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TaskIssueDetailDialog
        open={open}
        onOpenChange={setOpen}
        detail={detail}
        loading={loading}
        error={error}
      />
    </>
  );
}
