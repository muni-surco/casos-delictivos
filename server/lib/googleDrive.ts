import fs from "fs";
import { Buffer } from "buffer";
import crypto from "crypto";

type ServiceAccount = {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
};

function base64url(input: Buffer | string) {
  const b = typeof input === "string" ? Buffer.from(input) : input as Buffer;
  return b.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(saJson: string) {
  const sa: ServiceAccount = JSON.parse(saJson);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));

  const scope = ["https://www.googleapis.com/auth/drive"].join(" ");
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope,
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    exp,
    iat,
  }));

  const toSign = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(toSign);
  const signature = base64url(sign.sign(sa.private_key));
  const jwt = `${toSign}.${signature}`;

  const tokenUrl = sa.token_uri || "https://oauth2.googleapis.com/token";
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to obtain access token: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

export async function uploadFileToDrive(filename: string, buffer: Buffer, mimeType: string, folderId?: string, saJson?: string) {
  if (!saJson) throw new Error("Google service account JSON not provided");
  const accessToken = await getAccessToken(saJson);

  const metadata: any = { name: filename };
  if (folderId) metadata.parents = [folderId];

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const filePartHeader = `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;

  // Build multipart body
  const bodyChunks: (string | Buffer)[] = [];
  bodyChunks.push(delimiter);
  bodyChunks.push(metaPart);
  bodyChunks.push(delimiter);
  bodyChunks.push(filePartHeader);
  bodyChunks.push(buffer);
  bodyChunks.push(closeDelimiter);

  const multipartBody = Buffer.concat(bodyChunks.map((c) => (typeof c === "string" ? Buffer.from(c) : c)));

  // Request webViewLink and webContentLink; include supportsAllDrives for shared drives
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink,thumbnailLink&supportsAllDrives=true`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Drive upload failed: ${res.status} ${res.statusText} ${txt}`);
  }

  const data = await res.json();
  const fileId = data.id as string;
  const webViewLink = data.webViewLink as string | undefined;
  const webContentLink = data.webContentLink as string | undefined;
  const thumbnailLink = data.thumbnailLink as string | undefined;

  // Make file public (anyone with link) so direct content links are accessible
  try {
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone", allowFileDiscovery: false }),
    });
    if (!permRes.ok) {
      // continue; don't fail on permission errors
    }
  } catch (e) {
    // ignore
  }

  // Fetch metadata to gather all possible links
  let meta: any = {};
  try {
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,webContentLink,webViewLink,thumbnailLink,mimeType&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (metaRes.ok) meta = await metaRes.json();
  } catch (e) {
    // ignore
  }

  const result = {
    id: fileId,
    webContentLink: meta.webContentLink || webContentLink,
    webViewLink: meta.webViewLink || webViewLink,
    thumbnailLink: meta.thumbnailLink || thumbnailLink,
    mimeType: meta.mimeType || mimeType,
    embeddable: meta.webContentLink || webContentLink || meta.thumbnailLink || thumbnailLink || `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
  } as any;

  return result;
}
