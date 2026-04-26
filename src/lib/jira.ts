import { supabase } from "@/lib/supabase";

export interface JiraSite {
  id: string;
  name: string;
  url: string;
  avatarUrl: string | null;
}

export interface JiraStatusResponse {
  connected: boolean;
  sites: JiraSite[];
  selectedCloudId: string | null;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string | null;
  issueType: string | null;
  priority: string | null;
  url: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl: string | null;
}

export interface JiraIssueDetailComment {
  id: string;
  author: string;
  created: string | null;
  bodyHtml: string;
}

export interface JiraIssueDetail {
  id: string;
  key: string;
  url: string;
  summary: string;
  status: string | null;
  issueType: string | null;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  created: string | null;
  updated: string | null;
  parent: {
    key: string;
    summary: string;
  } | null;
  descriptionHtml: string;
  comments: JiraIssueDetailComment[];
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

async function jiraFetch<T>(path: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please sign in again to continue.");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Jira request failed");
  }

  return data as T;
}

export function getJiraStatus() {
  return jiraFetch<JiraStatusResponse>("/api/jira/status");
}

export function getJiraAuthUrl(returnTo: string) {
  const params = new URLSearchParams({ returnTo });
  return jiraFetch<{ url: string }>(`/api/jira/auth?${params.toString()}`);
}

export function updateJiraSite(selectedCloudId: string) {
  return jiraFetch<{ ok: true }>("/api/jira/status", {
    method: "POST",
    body: JSON.stringify({ selectedCloudId }),
  });
}

export function disconnectJira() {
  return jiraFetch<{ ok: true }>("/api/jira/status", {
    method: "DELETE",
  });
}

export function searchJiraIssues(
  cloudId: string,
  query: string,
  projectKeys: string[] = [],
) {
  const params = new URLSearchParams({ cloudId, query });
  if (projectKeys.length > 0) params.set("projectKeys", projectKeys.join(","));
  return jiraFetch<{ issues: JiraIssue[] }>(
    `/api/jira/issues?${params.toString()}`,
  );
}

export function getJiraProjects(cloudId: string) {
  const params = new URLSearchParams({ cloudId });
  return jiraFetch<{ projects: JiraProject[] }>(
    `/api/jira/projects?${params.toString()}`,
  );
}

export function getJiraIssueDetail(cloudId: string, issueIdOrKey: string) {
  const params = new URLSearchParams({
    cloudId,
    issueIdOrKey,
  });

  return jiraFetch<{ issue: JiraIssueDetail }>(
    `/api/jira/issue?${params.toString()}`,
  );
}
