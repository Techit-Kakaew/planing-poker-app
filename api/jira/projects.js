import { getFreshConnection, jiraApiRequest } from "../_lib/jira.js";
import { sendJson } from "../_lib/http.js";
import { requireSupabaseUser } from "../_lib/supabase.js";

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

    if (!cloudId) {
      return sendJson(res, 400, { error: "Invalid Jira site" });
    }

    const result = await jiraApiRequest({
      accessToken: connection.accessToken,
      cloudId,
      path: "/rest/api/3/project/search?maxResults=50&orderBy=name",
    });

    const projects = (result.values || []).map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.["24x24"] || null,
    }));

    return sendJson(res, 200, { projects });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    return sendJson(res, 500, { error: error.message });
  }
}
