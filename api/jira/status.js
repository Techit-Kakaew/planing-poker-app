import {
  deleteConnection,
  getConnectionRecord,
  getFreshConnection,
  updateSelectedCloudId,
} from "../_lib/jira.js";
import { readJsonBody, sendJson } from "../_lib/http.js";
import { requireSupabaseUser } from "../_lib/supabase.js";

function formatSites(resources) {
  return resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    url: resource.url,
    avatarUrl: resource.avatarUrl || null,
  }));
}

export default async function handler(req, res) {
  try {
    const { supabase, user } = await requireSupabaseUser(req);

    if (req.method === "GET") {
      const connection = await getFreshConnection(supabase, user.id);

      if (!connection) {
        return sendJson(res, 200, {
          connected: false,
          sites: [],
          selectedCloudId: null,
        });
      }

      return sendJson(res, 200, {
        connected: true,
        sites: formatSites(connection.resources),
        selectedCloudId: connection.selectedCloudId,
      });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const record = await getConnectionRecord(supabase, user.id);

      if (!record) {
        return sendJson(res, 404, { error: "No Jira connection found" });
      }

      const resources = Array.isArray(record.accessible_resources)
        ? record.accessible_resources
        : [];
      const selectedCloudId = body.selectedCloudId;

      if (!resources.some((resource) => resource.id === selectedCloudId)) {
        return sendJson(res, 400, { error: "Invalid Jira site selection" });
      }

      await updateSelectedCloudId(supabase, user.id, selectedCloudId);

      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "DELETE") {
      await deleteConnection(supabase, user.id);
      return sendJson(res, 200, { ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    return sendJson(res, 500, { error: error.message });
  }
}
