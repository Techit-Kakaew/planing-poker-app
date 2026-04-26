import { supabase } from "@/lib/supabase";
import type { JiraIssueDetail } from "@/lib/jira";

export interface TaskIssueDetailSnapshot {
  task_id: string;
  source: "jira";
  issue_key: string;
  issue_url: string;
  summary: string;
  status: string | null;
  issue_type: string | null;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  labels: string[];
  source_created_at: string | null;
  source_updated_at: string | null;
  parent: JiraIssueDetail["parent"];
  description_html: string;
  comments: JiraIssueDetail["comments"];
}

export function mapIssueDetailToSnapshot(
  taskId: string,
  issue: JiraIssueDetail,
): TaskIssueDetailSnapshot {
  return {
    task_id: taskId,
    source: "jira",
    issue_key: issue.key,
    issue_url: issue.url,
    summary: issue.summary,
    status: issue.status,
    issue_type: issue.issueType,
    priority: issue.priority,
    assignee: issue.assignee,
    reporter: issue.reporter,
    labels: issue.labels,
    source_created_at: issue.created,
    source_updated_at: issue.updated,
    parent: issue.parent,
    description_html: issue.descriptionHtml,
    comments: issue.comments,
  };
}

export async function getTaskIssueDetail(taskId: string) {
  const { data, error } = await supabase
    .from("task_issue_details")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TaskIssueDetailSnapshot | null;
}
