import crypto from "node:crypto";
import { getRequiredEnv } from "./env.js";

const OAUTH_COOKIE_NAME = "jira_oauth_state";
const TOKEN_SKEW_MS = 60 * 1000;

function getCipherKey() {
  const rawKey = getRequiredEnv("JIRA_TOKEN_ENCRYPTION_KEY");

  if (rawKey.length === 64 && /^[0-9a-f]+$/i.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  return crypto.createHash("sha256").update(rawKey).digest();
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

function signValue(value) {
  return toBase64Url(
    crypto.createHmac("sha256", getCipherKey()).update(value).digest(),
  );
}

export function createOauthStatePayload({ userId, returnTo }) {
  const nonce = crypto.randomBytes(24).toString("hex");
  const payload = JSON.stringify({
    nonce,
    userId,
    returnTo,
    createdAt: Date.now(),
  });

  return {
    state: nonce,
    cookieValue: `${toBase64Url(payload)}.${signValue(payload)}`,
  };
}

export function parseOauthStateCookie(cookieValue) {
  if (!cookieValue) {
    return null;
  }

  const [payloadPart, signature] = cookieValue.split(".");

  if (!payloadPart || !signature) {
    return null;
  }

  const payload = fromBase64Url(payloadPart).toString("utf8");

  if (signValue(payload) !== signature) {
    return null;
  }

  return JSON.parse(payload);
}

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: getRequiredEnv("ATLASSIAN_CLIENT_ID"),
    scope: ["offline_access", "read:jira-work", "read:jira-user"].join(" "),
    redirect_uri: getRequiredEnv("ATLASSIAN_REDIRECT_URI"),
    state,
    response_type: "code",
    prompt: "consent",
  });

  return `https://auth.atlassian.com/authorize?${params.toString()}`;
}

async function exchangeToken(payload) {
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: getRequiredEnv("ATLASSIAN_CLIENT_ID"),
      client_secret: getRequiredEnv("ATLASSIAN_CLIENT_SECRET"),
      ...payload,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Unable to complete Jira OAuth");
  }

  return data;
}

export async function exchangeCodeForTokens(code) {
  return exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRequiredEnv("ATLASSIAN_REDIRECT_URI"),
  });
}

export async function refreshTokens(refreshToken) {
  return exchangeToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(value) {
  const [ivPart, tagPart, contentPart] = value.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCipherKey(),
    Buffer.from(ivPart, "base64"),
  );

  decipher.setAuthTag(Buffer.from(tagPart, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(contentPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function fetchAccessibleResources(accessToken) {
  const response = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch Jira sites");
  }

  const resources = await response.json();
  return resources.filter(
    (resource) =>
      Array.isArray(resource.scopes) &&
      resource.scopes.some((scope) => scope.startsWith("read:jira")),
  );
}

export async function persistConnection({
  supabase,
  userId,
  tokens,
  resources,
  selectedCloudId,
}) {
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();

  const { error } = await supabase.from("jira_connections").upsert(
    {
      user_id: userId,
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : null,
      expires_at: expiresAt,
      scope: tokens.scope || null,
      accessible_resources: resources,
      selected_cloud_id: selectedCloudId || resources[0]?.id || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getConnectionRecord(supabase, userId) {
  const { data, error } = await supabase
    .from("jira_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateSelectedCloudId(supabase, userId, selectedCloudId) {
  const { error } = await supabase
    .from("jira_connections")
    .update({
      selected_cloud_id: selectedCloudId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteConnection(supabase, userId) {
  const { error } = await supabase
    .from("jira_connections")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getFreshConnection(supabase, userId) {
  const record = await getConnectionRecord(supabase, userId);

  if (!record) {
    return null;
  }

  let accessToken = decryptSecret(record.access_token_encrypted);
  let refreshToken = record.refresh_token_encrypted
    ? decryptSecret(record.refresh_token_encrypted)
    : null;
  let resources = Array.isArray(record.accessible_resources)
    ? record.accessible_resources
    : [];

  if (
    refreshToken &&
    record.expires_at &&
    new Date(record.expires_at).getTime() <= Date.now() + TOKEN_SKEW_MS
  ) {
    const refreshed = await refreshTokens(refreshToken);
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token || refreshToken;
    resources = await fetchAccessibleResources(accessToken);

    await persistConnection({
      supabase,
      userId,
      tokens: {
        ...refreshed,
        refresh_token: refreshToken,
      },
      resources,
      selectedCloudId: record.selected_cloud_id,
    });
  }

  return {
    accessToken,
    refreshToken,
    resources,
    selectedCloudId: record.selected_cloud_id || resources[0]?.id || null,
  };
}

export async function jiraApiRequest({
  accessToken,
  cloudId,
  path,
  method = "GET",
  body,
}) {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.errorMessages?.join(", ") || data.message || "Jira request failed",
    );
  }

  return data;
}

export function getOauthCookieName() {
  return OAUTH_COOKIE_NAME;
}

export function normalizeIssue(issue, siteUrl) {
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields?.summary || issue.key,
    status: issue.fields?.status?.name || null,
    issueType: issue.fields?.issuetype?.name || null,
    priority: issue.fields?.priority?.name || null,
    url: `${siteUrl}/browse/${issue.key}`,
  };
}
