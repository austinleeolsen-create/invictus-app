import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";

function required(name: "QBO_CLIENT_ID" | "QBO_CLIENT_SECRET" | "QBO_REDIRECT_URI" | "QBO_TOKEN_ENCRYPTION_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function encryptionKey() {
  const key = Buffer.from(required("QBO_TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("QBO_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function authorizationUrl(state: string) {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", required("QBO_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  url.searchParams.set("redirect_uri", required("QBO_REDIRECT_URI"));
  url.searchParams.set("state", state);
  return url.toString();
}

export type QboTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
};

export async function exchangeAuthorizationCode(code: string) {
  const credentials = Buffer.from(`${required("QBO_CLIENT_ID")}:${required("QBO_CLIENT_SECRET")}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: required("QBO_REDIRECT_URI") }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description ?? result.error ?? "QuickBooks token exchange failed.");
  return result as QboTokenResponse;
}
