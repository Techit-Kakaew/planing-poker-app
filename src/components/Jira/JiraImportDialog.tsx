import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  disconnectJira,
  getJiraAuthUrl,
  getJiraIssueDetail,
  getJiraProjects,
  getJiraStatus,
  searchJiraIssues,
  updateJiraSite,
  type JiraIssueDetail,
  type JiraIssue,
  type JiraProject,
  type JiraStatusResponse,
} from "@/lib/jira";
import {
  Check,
  Eye,
  ExternalLink,
  Filter,
  Link2,
  Loader2,
  RefreshCcw,
  Unplug,
} from "lucide-react";
import { JiraIcon } from "@/components/ui/jira-icon";
import type { Task } from "@/store/useRoomStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mapIssueDetailToSnapshot } from "@/lib/taskDetails";
import { useRoomStore } from "@/store/useRoomStore";

interface JiraImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string | null;
  tasks: Task[];
}

function extractIssueKey(title: string) {
  const match = title.match(/^([A-Z][A-Z0-9]+-\d+)\b/);
  return match?.[1] || null;
}

export default function JiraImportDialog({
  open,
  onOpenChange,
  roomId,
  tasks,
}: JiraImportDialogProps) {
  const { setJiraSiteUrl } = useRoomStore();
  const [status, setStatus] = useState<JiraStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [detailIssue, setDetailIssue] = useState<JiraIssueDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProjectKeys, setSelectedProjectKeys] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const existingIssueKeys = useMemo(
    () =>
      new Set(
        tasks
          .map((task) => extractIssueKey(task.title))
          .filter((value): value is string => Boolean(value)),
      ),
    [tasks],
  );

  const loadStatus = useCallback(
    async (force = false) => {
      // Skip fetch if we already have status and not forced
      if (status && !force) return status;

      setStatusLoading(true);
      setStatusError(null);

      try {
        const nextStatus = await getJiraStatus();
        setStatus(nextStatus);
        return nextStatus;
      } catch (error) {
        setStatusError(
          error instanceof Error ? error.message : "Unable to load Jira status",
        );
        return null;
      } finally {
        setStatusLoading(false);
      }
    },
    [status],
  );

  const loadIssues = async (
    cloudId: string,
    searchText: string,
    projectKeys: string[] = [],
  ) => {
    setIssuesLoading(true);
    setIssuesError(null);

    try {
      const result = await searchJiraIssues(cloudId, searchText, projectKeys);
      setIssues(result.issues);
      setSelectedKeys({});
    } catch (error) {
      setIssuesError(
        error instanceof Error ? error.message : "Unable to load Jira issues",
      );
    } finally {
      setIssuesLoading(false);
    }
  };

  const loadProjects = async (cloudId: string) => {
    try {
      const result = await getJiraProjects(cloudId);
      setProjects(result.projects);
    } catch {
      // non-critical, silently fail
    }
  };

  useEffect(() => {
    if (!open) return;

    void (async () => {
      const nextStatus = await loadStatus();
      if (nextStatus?.connected && nextStatus.selectedCloudId) {
        if (issues.length === 0)
          await loadIssues(nextStatus.selectedCloudId, "", selectedProjectKeys);
        if (projects.length === 0)
          await loadProjects(nextStatus.selectedCloudId);
      }
    })();
  }, [open, issues.length, loadStatus, projects.length, selectedProjectKeys]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnect = async () => {
    setRedirecting(true);

    try {
      const result = await getJiraAuthUrl(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.assign(result.url);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to start Jira connection",
      );
      setRedirecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);

    try {
      await disconnectJira();
      setStatus({
        connected: false,
        sites: [],
        selectedCloudId: null,
      });
      setIssues([]);
      setSelectedKeys({});
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to disconnect Jira",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSiteChange = async (selectedCloudId: string) => {
    if (!status) return;

    setStatus((current) =>
      current
        ? {
            ...current,
            selectedCloudId,
          }
        : current,
    );

    try {
      await updateJiraSite(selectedCloudId);
      await loadIssues(selectedCloudId, query, selectedProjectKeys);
      await loadProjects(selectedCloudId);
    } catch (error) {
      setIssuesError(
        error instanceof Error ? error.message : "Unable to switch Jira site",
      );
    }
  };

  const handleSearch = async () => {
    if (!status?.selectedCloudId) return;
    await loadIssues(status.selectedCloudId, query, selectedProjectKeys);
  };

  const selectableIssues = issues.filter(
    (issue) => !existingIssueKeys.has(issue.key),
  );
  const selectedIssues = selectableIssues.filter(
    (issue) => selectedKeys[issue.key],
  );

  const handleImport = async () => {
    if (!roomId || selectedIssues.length === 0) return;
    setImporting(true);

    try {
      if (!status?.selectedCloudId) {
        throw new Error("No Jira site selected");
      }

      const detailedIssues = await Promise.all(
        selectedIssues.map(async (issue) => {
          const result = await getJiraIssueDetail(
            status.selectedCloudId!,
            issue.key,
          );
          return result.issue;
        }),
      );

      const nextOrderIndex = tasks.length;
      const payload = detailedIssues.map((issue, index) => ({
        room_id: roomId,
        title: `${issue.key}: ${issue.summary}`,
        order_index: nextOrderIndex + index,
        has_jira_detail: true,
      }));

      const { data: insertedTasks, error } = await supabase
        .from("tasks")
        .insert(payload)
        .select("id, title");

      if (error) {
        throw error;
      }

      const snapshots =
        insertedTasks?.map((task, index) =>
          mapIssueDetailToSnapshot(task.id, detailedIssues[index]),
        ) || [];

      if (snapshots.length > 0) {
        const { error: snapshotError } = await supabase
          .from("task_issue_details")
          .insert(snapshots);

        if (snapshotError) {
          throw snapshotError;
        }
      }

      onOpenChange(false);
      setQuery("");
      setSelectedKeys({});

      // Save Jira site URL for link rendering
      const selectedSite = status.sites.find(
        (s) => s.id === status.selectedCloudId,
      );
      if (selectedSite?.url) setJiraSiteUrl(selectedSite.url);
    } catch (error) {
      setIssuesError(
        error instanceof Error ? error.message : "Unable to import Jira issues",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleOpenDetail = async (issue: JiraIssue) => {
    if (!status?.selectedCloudId) return;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailIssue(null);

    try {
      const result = await getJiraIssueDetail(
        status.selectedCloudId,
        issue.key,
      );
      setDetailIssue(result.issue);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Unable to load Jira issue details",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "Unknown";
    return new Date(value).toLocaleString();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <JiraIcon className="w-6 h-6 text-[#0052CC]" />
              Import from Jira
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!status?.connected ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-950/40 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Connect your Atlassian account to browse Jira issues and
                  import them as planning tasks.
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={redirecting || statusLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Jira
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Connected Jira site
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pick which authorized site to browse issues from.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="rounded-xl"
                    >
                      {disconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Unplug className="w-4 h-4 mr-2" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <select
                      value={status.selectedCloudId || ""}
                      onChange={(event) =>
                        void handleSiteChange(event.target.value)
                      }
                      className="w-full h-11 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-10 text-sm text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {status.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSearch();
                      }
                    }}
                    placeholder="Search by issue key or summary"
                    className="h-11 border-slate-200 dark:border-slate-700"
                  />
                  {/* Filter by project button */}
                  <div className="relative" ref={filterRef}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFilterOpen((v) => !v)}
                      className={`h-11 rounded-xl ${selectedProjectKeys.length > 0 ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : ""}`}
                    >
                      <Filter className="w-4 h-4" />
                      {selectedProjectKeys.length > 0 && (
                        <span className="ml-1.5 text-xs font-bold">
                          {selectedProjectKeys.length}
                        </span>
                      )}
                    </Button>
                    {filterOpen && (
                      <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                          Filter by project
                        </p>
                        <Input
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          placeholder="Search Jira"
                          className="h-8 text-sm border-slate-200 dark:border-slate-700"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {projects
                            .filter(
                              (p) =>
                                p.name
                                  .toLowerCase()
                                  .includes(projectSearch.toLowerCase()) ||
                                p.key
                                  .toLowerCase()
                                  .includes(projectSearch.toLowerCase()),
                            )
                            .map((project) => {
                              const checked = selectedProjectKeys.includes(
                                project.key,
                              );
                              return (
                                <label
                                  key={project.id}
                                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? selectedProjectKeys.filter(
                                            (k) => k !== project.key,
                                          )
                                        : [...selectedProjectKeys, project.key];
                                      setSelectedProjectKeys(next);
                                      if (status?.selectedCloudId) {
                                        void loadIssues(
                                          status.selectedCloudId,
                                          query,
                                          next,
                                        );
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                  />
                                  {project.avatarUrl && (
                                    <img
                                      src={project.avatarUrl}
                                      alt=""
                                      className="w-5 h-5 rounded"
                                    />
                                  )}
                                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                                    {project.name}
                                  </span>
                                </label>
                              );
                            })}
                          {projects.length === 0 && (
                            <p className="text-xs text-slate-400 px-2 py-2">
                              No projects found
                            </p>
                          )}
                        </div>
                        {selectedProjectKeys.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectKeys([]);
                              if (status?.selectedCloudId) {
                                void loadIssues(
                                  status.selectedCloudId,
                                  query,
                                  [],
                                );
                              }
                            }}
                            className="w-full text-xs text-rose-500 hover:text-rose-600 font-semibold py-1 cursor-pointer"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSearch()}
                    disabled={issuesLoading || !status.selectedCloudId}
                    className="h-11 rounded-xl"
                  >
                    {issuesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Current filters label */}
                <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                  Current filters:{" "}
                  <span className="italic">
                    {selectedProjectKeys.length > 0
                      ? `${selectedProjectKeys.join(", ")} · Viewed in the last 30 days`
                      : "Viewed in the last 30 days"}
                  </span>
                </p>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                    {issuesLoading && (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading Jira issues...
                      </div>
                    )}

                    {!issuesLoading && issues.length === 0 && (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                        No Jira issues found for this query yet.
                      </div>
                    )}

                    {!issuesLoading &&
                      issues.map((issue) => {
                        const alreadyAdded = existingIssueKeys.has(issue.key);
                        const checked = Boolean(selectedKeys[issue.key]);

                        return (
                          <label
                            key={issue.id}
                            className={`flex items-start gap-3 p-4 ${
                              alreadyAdded
                                ? "bg-slate-50/70 dark:bg-slate-950/40"
                                : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={alreadyAdded}
                              onChange={(event) =>
                                setSelectedKeys((current) => ({
                                  ...current,
                                  [issue.key]: event.target.checked,
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  {issue.key}
                                </span>
                                {issue.issueType && (
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                    {issue.issueType}
                                  </span>
                                )}
                                {issue.status && (
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                    {issue.status}
                                  </span>
                                )}
                                {alreadyAdded && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Already added
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 wrap-break-word">
                                {issue.summary}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 self-start">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger render={<span />}>
                                    <button
                                      type="button"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void handleOpenDetail(issue);
                                      }}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View issue details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger render={<span />}>
                                    <a
                                      href={issue.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Open in Jira</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </>
            )}

            {(statusError || issuesError) && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {issuesError || statusError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleImport()}
              disabled={
                !status?.connected || selectedIssues.length === 0 || importing
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Import{" "}
                  {selectedIssues.length > 0
                    ? `${selectedIssues.length} issue${selectedIssues.length > 1 ? "s" : ""}`
                    : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-4xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              {detailIssue ? detailIssue.key : "Issue details"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-6">
            {detailLoading && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading issue details...
              </div>
            )}

            {!detailLoading && detailError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {detailError}
              </div>
            )}

            {!detailLoading && detailIssue && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {detailIssue.key}
                    </span>
                    {detailIssue.issueType && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {detailIssue.issueType}
                      </span>
                    )}
                    {detailIssue.status && (
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {detailIssue.status}
                      </span>
                    )}
                    {detailIssue.priority && (
                      <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        {detailIssue.priority}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white wrap-break-word">
                    {detailIssue.summary}
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        People
                      </p>
                      <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        <p>
                          <span className="font-semibold">Assignee:</span>{" "}
                          {detailIssue.assignee || "Unassigned"}
                        </p>
                        <p>
                          <span className="font-semibold">Reporter:</span>{" "}
                          {detailIssue.reporter || "Unknown"}
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
                          {formatDateTime(detailIssue.created)}
                        </p>
                        <p>
                          <span className="font-semibold">Updated:</span>{" "}
                          {formatDateTime(detailIssue.updated)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {detailIssue.parent && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Parent
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {detailIssue.parent.key}
                        </span>{" "}
                        {detailIssue.parent.summary}
                      </p>
                    </div>
                  )}

                  {detailIssue.labels.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Labels
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detailIssue.labels.map((label) => (
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
                  {detailIssue.descriptionHtml ? (
                    <div
                      className="max-w-none text-sm text-slate-700 dark:text-slate-300 [&_a]:text-indigo-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc [&_ul]:pl-6"
                      dangerouslySetInnerHTML={{
                        __html: detailIssue.descriptionHtml,
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
                      {detailIssue.comments.length}
                    </span>
                  </div>

                  {detailIssue.comments.length > 0 ? (
                    <div className="space-y-4">
                      {detailIssue.comments.map((comment) => (
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
                            dangerouslySetInnerHTML={{
                              __html: comment.bodyHtml,
                            }}
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
            {detailIssue && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  window.open(detailIssue.url, "_blank", "noreferrer")
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Jira
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
