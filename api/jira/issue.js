import { getFreshConnection, jiraApiRequest } from "../_lib/jira.js";
import { sendJson } from "../_lib/http.js";
import { requireSupabaseUser } from "../_lib/supabase.js";

function normalizeIssueDetail(issue, siteUrl) {
  const comments = issue.fields?.comment?.comments || [];

  return {
    id: issue.id,
    key: issue.key,
    url: `${siteUrl}/browse/${issue.key}`,
    summary: issue.fields?.summary || issue.key,
    status: issue.fields?.status?.name || null,
    issueType: issue.fields?.issuetype?.name || null,
    priority: issue.fields?.priority?.name || null,
    assignee: issue.fields?.assignee?.displayName || null,
    reporter: issue.fields?.reporter?.displayName || null,
    labels: issue.fields?.labels || [],
    created: issue.fields?.created || null,
    updated: issue.fields?.updated || null,
    parent: issue.fields?.parent
      ? {
          key: issue.fields.parent.key,
          summary:
            issue.fields.parent.fields?.summary || issue.fields.parent.key,
        }
      : null,
    descriptionHtml: issue.renderedFields?.description || "",
    comments: comments.map((comment) => ({
      id: comment.id,
      author: comment.author?.displayName || "Unknown user",
      created: comment.created || null,
      bodyHtml: comment.renderedBody || "",
    })),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { supabase, user } = await requireSupabaseUser(req);
    const connection = await getFreshConnection(supabase, user.id);

    if (!connection) {
      return sendJson(res, 404, { error: "No Jira connection found" });
    }

    const cloudId =
      typeof req.query.cloudId === "string" && req.query.cloudId
        ? req.query.cloudId
        : connection.selectedCloudId;
    const issueIdOrKey =
      typeof req.query.issueIdOrKey === "string" ? req.query.issueIdOrKey : "";
    const site = connection.resources.find(
      (resource) => resource.id === cloudId,
    );

    if (!cloudId || !site) {
      return sendJson(res, 400, { error: "Invalid Jira site" });
    }

    if (!issueIdOrKey) {
      return sendJson(res, 400, { error: "Missing issue identifier" });
    }

    const issue = await jiraApiRequest({
      accessToken: connection.accessToken,
      cloudId,
      path: `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}?fields=summary,description,status,issuetype,priority,assignee,reporter,labels,created,updated,parent,comment&expand=renderedFields`,
    });

    return sendJson(res, 200, {
      issue: normalizeIssueDetail(issue, site.url),
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    return sendJson(res, 500, { error: error.message });
  }
}
