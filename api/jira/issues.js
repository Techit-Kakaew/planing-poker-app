import {
  getFreshConnection,
  jiraApiRequest,
  normalizeIssue,
} from "../_lib/jira.js";
import { sendJson } from "../_lib/http.js";
import { requireSupabaseUser } from "../_lib/supabase.js";

function escapeJqlTerm(term) {
  return term.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildIssueSearchJql(query, projectKeys = []) {
  const trimmed = query.trim();
  const projectClause =
    projectKeys.length > 0
      ? `project in (${projectKeys.map((k) => `"${k}"`).join(", ")})`
      : null;

  const dateClause = "updatedDate >= -30d";

  if (!trimmed) {
    // If filtering by project, don't restrict to currentUser — show all issues in that project
    if (projectClause) {
      return `${projectClause} AND ${dateClause} ORDER BY updated DESC`;
    }
    return `${dateClause} ORDER BY updated DESC`;
  }

  const terms = trimmed.split(/\s+/).filter(Boolean).map(escapeJqlTerm);
  const clauses = [];

  if (/^[A-Za-z][A-Za-z0-9]+-\d+$/.test(trimmed)) {
    // Full issue key e.g. LP-4657
    clauses.push(`issuekey = "${trimmed.toUpperCase()}"`);
  } else if (/^\d+$/.test(trimmed)) {
    // Number only e.g. 4657 — match any project key ending with that number
    if (projectKeys.length > 0) {
      projectKeys.forEach((k) => clauses.push(`issuekey = "${k}-${trimmed}"`));
    } else {
      clauses.push(`issuekey ~ "-${trimmed}"`);
    }
  }

  if (terms.length > 0) {
    clauses.push(
      terms.map((term) => `summary ~ "\\"${term}*\\""`).join(" AND "),
    );
  }

  const searchClause = `(${clauses.join(" OR ")})`;
  const filters = [searchClause, dateClause];
  if (projectClause) filters.push(projectClause);

  return `${filters.join(" AND ")} ORDER BY updated DESC`;
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
    const query = typeof req.query.query === "string" ? req.query.query : "";
    const projectKeys =
      typeof req.query.projectKeys === "string" && req.query.projectKeys
        ? req.query.projectKeys.split(",").filter(Boolean)
        : [];
    const site = connection.resources.find(
      (resource) => resource.id === cloudId,
    );

    if (!cloudId || !site) {
      return sendJson(res, 400, { error: "Invalid Jira site" });
    }

    const searchResult = await jiraApiRequest({
      accessToken: connection.accessToken,
      cloudId,
      path: "/rest/api/3/search/jql",
      method: "POST",
      body: {
        fields: ["summary", "status", "issuetype", "priority"],
        jql: buildIssueSearchJql(query, projectKeys),
        maxResults: 35,
      },
    });

    return sendJson(res, 200, {
      issues: (searchResult.issues || []).map((issue) =>
        normalizeIssue(issue, site.url),
      ),
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    return sendJson(res, 500, { error: error.message });
  }
}
