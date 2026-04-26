import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import type { TaskIssueDetailSnapshot } from "@/lib/taskDetails";

interface TaskIssueDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: TaskIssueDetailSnapshot | null;
  loading?: boolean;
  error?: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export default function TaskIssueDetailDialog({
  open,
  onOpenChange,
  detail,
  loading = false,
  error = null,
}: TaskIssueDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
            {detail ? detail.issue_key : "Task details"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading task details...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && !detail && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500 dark:text-slate-400">
              No shared task detail is available for this item yet.
            </div>
          )}

          {!loading && detail && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {detail.issue_key}
                  </span>
                  {detail.issue_type && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {detail.issue_type}
                    </span>
                  )}
                  {detail.status && (
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {detail.status}
                    </span>
                  )}
                  {detail.priority && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {detail.priority}
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white wrap-break-word">
                  {detail.summary}
                </h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      People
                    </p>
                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      <p>
                        <span className="font-semibold">Assignee:</span>{" "}
                        {detail.assignee || "Unassigned"}
                      </p>
                      <p>
                        <span className="font-semibold">Reporter:</span>{" "}
                        {detail.reporter || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Timeline
                    </p>
                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      <p>
                        <span className="font-semibold">Created:</span>{" "}
                        {formatDateTime(detail.source_created_at)}
                      </p>
                      <p>
                        <span className="font-semibold">Updated:</span>{" "}
                        {formatDateTime(detail.source_updated_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {detail.parent && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Parent
                    </p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {detail.parent.key}
                      </span>{" "}
                      {detail.parent.summary}
                    </p>
                  </div>
                )}

                {detail.labels.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Labels
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detail.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </p>
                {detail.description_html ? (
                  <div
                    className="max-w-none text-sm text-slate-700 dark:text-slate-300 [&_a]:text-indigo-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc [&_ul]:pl-6"
                    dangerouslySetInnerHTML={{
                      __html: detail.description_html,
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No description on this issue.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Comments
                  </p>
                  <span className="text-xs font-semibold text-slate-400">
                    {detail.comments.length}
                  </span>
                </div>

                {detail.comments.length > 0 ? (
                  <div className="space-y-4">
                    {detail.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-950/40 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {comment.author}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDateTime(comment.created)}
                          </p>
                        </div>
                        <div
                          className="max-w-none text-sm text-slate-700 dark:text-slate-300 [&_a]:text-indigo-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc [&_ul]:pl-6"
                          dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No comments on this issue.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {detail && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                window.open(detail.issue_url, "_blank", "noreferrer")
              }
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Jira
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
