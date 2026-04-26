import {
  exchangeCodeForTokens,
  fetchAccessibleResources,
  getOauthCookieName,
  parseOauthStateCookie,
  persistConnection,
} from "../_lib/jira.js";
import {
  parseCookies,
  redirect,
  serializeCookie,
  setCookie,
} from "../_lib/http.js";
import { getSupabaseAdmin } from "../_lib/supabase.js";

function withStatus(urlPath, status) {
  const target = new URL(urlPath, "http://localhost");
  target.searchParams.set("jira", status);
  return `${target.pathname}${target.search}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const cookies = parseCookies(req);
  const stateCookie = parseOauthStateCookie(cookies[getOauthCookieName()]);

  setCookie(
    res,
    serializeCookie(getOauthCookieName(), "", {
      sameSite: "Lax",
      secure: process.env.NODE_ENV !== "development",
      maxAge: 0,
    }),
  );

  if (!stateCookie) {
    return redirect(res, withStatus("/", "invalid_state"));
  }

  const returnTo = stateCookie.returnTo || "/";

  if (
    typeof req.query.state !== "string" ||
    req.query.state !== stateCookie.nonce ||
    typeof req.query.code !== "string"
  ) {
    return redirect(res, withStatus(returnTo, "invalid_state"));
  }

  try {
    const supabase = getSupabaseAdmin();
    const tokens = await exchangeCodeForTokens(req.query.code);
    const resources = await fetchAccessibleResources(tokens.access_token);

    await persistConnection({
      supabase,
      userId: stateCookie.userId,
      tokens,
      resources,
    });

    return redirect(res, withStatus(returnTo, "connected"));
  } catch (error) {
    return redirect(res, withStatus(returnTo, "error"));
  }
}
