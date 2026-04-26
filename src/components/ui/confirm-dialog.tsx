import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-slate-500 dark:text-slate-400 pb-2">
          {description}
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
