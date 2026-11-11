import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { google } from "googleapis";

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");
const GOOGLE_REDIRECT_URI = defineSecret("GOOGLE_REDIRECT_URI");

initializeApp();
setGlobalOptions({ maxInstances: 5, region: "europe-west1" });

const db = getFirestore();

function getOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID.value(),
    GOOGLE_CLIENT_SECRET.value(),
    GOOGLE_REDIRECT_URI.value()
  );
}

// Called by the frontend after the user completes the Google consent screen.
// Exchanges the one-time auth code for tokens and stores them server-side.
export const exchangeGmailToken = onRequest(
  { cors: [/leiteveien-d99b9\.web\.app$/, /localhost/], secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { code, uid } = req.body;
    if (!code || !uid) {
      res.status(400).send("Missing code or uid");
      return;
    }

    try {
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        res.status(400).send("No refresh token returned — user must re-authorize");
        return;
      }

      // Store only the refresh token, never the short-lived access token
      await db.collection("users").doc(uid).set(
        {
          gmail: {
            connected: true,
            refreshToken: tokens.refresh_token,
            connectedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );

      res.status(200).json({ success: true });
    } catch (err) {
      logger.error("Token exchange failed", err);
      res.status(500).send("Token exchange failed");
    }
  }
);

// Revokes Gmail access and removes stored tokens.
export const disconnectGmail = onRequest(
  { cors: [/leiteveien-d99b9\.web\.app$/, /localhost/], secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { uid } = req.body;
    if (!uid) {
      res.status(400).send("Missing uid");
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const refreshToken = userDoc.data()?.gmail?.refreshToken;

      if (refreshToken) {
        const oauth2Client = getOAuthClient();
        await oauth2Client.revokeToken(refreshToken);
      }

      await db.collection("users").doc(uid).update({
        "gmail.connected": false,
        "gmail.refreshToken": FieldValue.delete(),
      });

      res.status(200).json({ success: true });
    } catch (err) {
      logger.error("Disconnect failed", err);
      res.status(500).send("Disconnect failed");
    }
  }
);

const INVOICE_KEYWORDS = [
  "faktura", "invoice", "kvittering", "receipt",
  "betaling", "payment", "regning", "bill",
  "ordre", "order confirmation", "ordrebekreftelse",
];

function isInvoiceEmail(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase();
  return INVOICE_KEYWORDS.some((kw) => text.includes(kw));
}

function extractAmount(text: string): number | null {
  const match = text.match(/(?:kr|nok|,)\s*([\d\s,.]+)/i);
  if (!match) return null;
  const cleaned = match[1].replace(/\s/g, "").replace(",", ".");
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

// Runs every hour. Scans Gmail for invoice emails and saves them to Firestore.
export const scanGmailInvoices = onSchedule(
  { schedule: "every 1 hours", region: "europe-west1", secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI] },
  async () => {
    const usersSnap = await db
      .collection("users")
      .where("gmail.connected", "==", true)
      .get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const refreshToken = userDoc.data().gmail?.refreshToken;
      if (!refreshToken) continue;

      try {
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Only fetch emails since the last scan
        const lastScan = userDoc.data().gmail?.lastScan?.toDate();
        const after = lastScan
          ? Math.floor(lastScan.getTime() / 1000)
          : Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30; // 30 days on first scan

        const listRes = await gmail.users.messages.list({
          userId: "me",
          q: `after:${after} (faktura OR invoice OR kvittering OR receipt OR regning)`,
          maxResults: 50,
        });

        const messages = listRes.data.messages ?? [];

        for (const msg of messages) {
          if (!msg.id) continue;

          // Skip if already saved
          const existing = await db
            .collection("users")
            .doc(uid)
            .collection("invoices")
            .doc(msg.id)
            .get();
          if (existing.exists) continue;

          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "Date"],
          });

          const headers = full.data.payload?.headers ?? [];
          const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
          const from = headers.find((h) => h.name === "From")?.value ?? "";
          const date = headers.find((h) => h.name === "Date")?.value ?? "";
          const snippet = full.data.snippet ?? "";

          if (!isInvoiceEmail(subject, snippet)) continue;

          const amount = extractAmount(`${subject} ${snippet}`);

          await db
            .collection("users")
            .doc(uid)
            .collection("invoices")
            .doc(msg.id)
            .set({
              subject,
              from,
              date: date ? new Date(date) : FieldValue.serverTimestamp(),
              snippet,
              amount,
              gmailMessageId: msg.id,
              createdAt: FieldValue.serverTimestamp(),
            });
        }

        await db.collection("users").doc(uid).update({
          "gmail.lastScan": FieldValue.serverTimestamp(),
        });

        logger.info(`Scanned Gmail for ${uid}: ${messages.length} candidates`);
      } catch (err) {
        logger.error(`Gmail scan failed for user ${uid}`, err);
      }
    }
  }
);
