import {
  buildAuthorizeUrl,
  createOauthStatePayload,
  getOauthCookieName,
} from "../_lib/jira.js";
import { sendJson, serializeCookie, setCookie } from "../_lib/http.js";
import { requireSupabaseUser } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { user } = await requireSupabaseUser(req);
    const returnTo =
      typeof req.query.returnTo === "string" &&
      req.query.returnTo.startsWith("/")
        ? req.query.returnTo
        : "/";

    const { state, cookieValue } = createOauthStatePayload({
      userId: user.id,
      returnTo,
    });

    setCookie(
      res,
      serializeCookie(getOauthCookieName(), cookieValue, {
        sameSite: "Lax",
        secure: process.env.NODE_ENV !== "development",
        maxAge: 60 * 10,
      }),
    );

    return sendJson(res, 200, {
      url: buildAuthorizeUrl(state),
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    return sendJson(res, 500, { error: error.message });
  }
}
