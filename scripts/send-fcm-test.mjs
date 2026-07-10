import fs from "node:fs";
import crypto from "node:crypto";

const DEFAULT_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const DEFAULT_PROJECT_ID = "brigth-iq-notification-service";

function usage() {
  console.log(`\nUsage:\n  npm run fcm:test -- --token <FCM_TOKEN> --service-account ./service-account.json [--project-id ${DEFAULT_PROJECT_ID}]\n\nNotes:\n  - service-account.json should be downloaded from Firebase/Google Cloud and must NOT be committed.\n  - The FCM token should be copied from BrightIQ > Ayarlar > Bildirim Debug > Kopyala.\n`);
}

function getArg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1];
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(serviceAccount, scope = DEFAULT_SCOPE) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const assertion = signJwt(serviceAccount);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`OAuth token alınamadı: ${response.status} ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function main() {
  const token = getArg("token");
  const serviceAccountPath = getArg("service-account");
  const projectId = getArg("project-id", DEFAULT_PROJECT_ID);

  if (!token || !serviceAccountPath) {
    usage();
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  const accessToken = await getAccessToken(serviceAccount);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const payload = {
    message: {
      token,
      notification: {
        title: "BrightIQ FCM Direct Test",
        body: `FCM v1 test ${new Date().toISOString()}`,
      },
      data: {
        source: "manual-fcm-v1-test",
        projectId,
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: "BrightIQ FCM Direct Test",
              body: "APNs visible alert payload test",
            },
            sound: "default",
          },
        },
      },
    },
  };

  console.log("Sending FCM v1 test message...");
  console.log(`Project: ${projectId}`);
  console.log(`Token prefix: ${token.slice(0, 16)}...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  console.log("HTTP status:", response.status);
  console.log("Response:");
  console.dir(body, { depth: 10, colors: true });

  if (!response.ok) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
