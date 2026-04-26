import fs from "node:fs";
import path from "node:path";

let cachedEnv = null;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const text = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");

    result[key] = value;
  }

  return result;
}

function loadLocalEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const projectRoot = process.cwd();
  const files = [".env.local", ".env"];
  const merged = {};

  for (const file of files) {
    Object.assign(merged, parseEnvFile(path.join(projectRoot, file)));
  }

  cachedEnv = merged;
  return cachedEnv;
}

export function getEnv(name) {
  return process.env[name] || loadLocalEnv()[name] || null;
}

export function getRequiredEnv(name) {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
