import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ALLOWED_REDIRECT_URIS = [
  "http://localhost:5173/gmail-callback",
  "https://leiteveien-d99b9.web.app/gmail-callback",
  "https://leiteveien-d99b9.firebaseapp.com/gmail-callback",
];

initializeApp();
setGlobalOptions({ maxInstances: 5, region: "europe-west1" });

const db = getFirestore();

function getOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID.value(),
    GOOGLE_CLIENT_SECRET.value()
  );
}

// Called by the frontend after the user completes the Google consent screen.
// Exchanges the one-time auth code for tokens and stores them server-side.
export const exchangeGmailToken = onRequest(
  { cors: [/leiteveien-d99b9\.web\.app$/, /localhost/], secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { code, uid, redirectUri } = req.body;
    if (!code || !uid || !redirectUri) {
      res.status(400).send("Missing code, uid, or redirectUri");
      return;
    }

    if (!ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
      res.status(400).send("Invalid redirect URI");
      return;
    }

    try {
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken({ code, redirect_uri: redirectUri });

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
    } catch (err: any) {
      const detail = err?.response?.data?.error_description
        || err?.response?.data?.error
        || err?.message
        || "unknown";
      logger.error("Token exchange failed", err);
      res.status(500).send(`Token exchange failed: ${detail}`);
    }
  }
);

// Revokes Gmail access and removes stored tokens.
export const disconnectGmail = onRequest(
  { cors: [/leiteveien-d99b9\.web\.app$/, /localhost/], secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
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
  "purchase", "kjøp", "your order", "order receipt",
  "thank you for your purchase", "subscription",
];

function isInvoiceEmail(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase();
  return INVOICE_KEYWORDS.some((kw) => text.includes(kw));
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractBodyText(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    const text = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(text) : text;
  }

  if (payload.parts) {
    let plain = "";
    let html = "";
    for (const part of payload.parts) {
      const content = extractBodyText(part);
      if (part.mimeType === "text/plain" || part.mimeType?.startsWith("multipart/")) plain += content;
      else if (part.mimeType === "text/html") html += content;
    }
    return plain || html;
  }

  return "";
}

function extractAmount(text: string): number | null {
  // Only match amounts that appear with explicit payment context labels.
  // Deliberately excludes bare "kr X" patterns to avoid matching account
  // numbers, KID codes, order numbers, and loyalty points.
  const patterns = [
    /(?:totalt?|total amount|grand total|amount charged)[:\s]+([\d\s]+(?:[.,]\d{1,2})?)/i,
    /(?:beløp|å betale|fakturabeløp|forfallsbeløp|amount due|order total)[:\s]+([\d\s]+(?:[.,]\d{1,2})?)/i,
    /(?:sum|subtotal)[:\s]+([\d\s]+(?:[.,]\d{1,2})?)/i,
    // USD/EUR only when explicitly labeled as total
    /(?:total|amount)[:\s]+\$\s*([\d.,]+)/i,
    /(?:total|amount)[:\s]+€\s*([\d.,]+)/i,
    /\$\s*([\d.,]+)\s*(?:usd)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    let raw = match[1].trim().replace(/\s/g, "");
    if (/[.,]\d{1,2}$/.test(raw)) {
      raw = raw.replace(/[.,](\d{1,2})$/, ".$1").replace(/[.,]/g, "");
    } else {
      raw = raw.replace(/[.,]/g, "");
    }
    const amount = parseFloat(raw);
    if (!isNaN(amount) && amount >= 20 && amount < 500000) return amount;
  }
  return null;
}

function extractDueDate(text: string): Date | null {
  const patterns = [
    /(?:forfallsdato|forfall|betales innen|due date|payment due)[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const parts = match[1].split(/[./-]/);
    if (parts.length !== 3) continue;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getFullYear() > 2000) return date;
  }
  return null;
}

function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /faktura(?:nr|nummer)?[.:\s#]*(\w{3,20})/i,
    /invoice\s*(?:no|number|#)?[.:\s]*(\w{3,20})/i,
    /ordrenr[.:\s#]*(\w{3,20})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVendor(from: string): string {
  const displayMatch = from.match(/^"?([^"<]+?)"?\s*</);
  if (displayMatch) return displayMatch[1].trim();
  const emailMatch = from.match(/([^@\s]+)@([^\s>]+)/);
  if (emailMatch) {
    const domain = emailMatch[2].replace(/^(mail|post|noreply|no-reply|info|invoice|faktura)\./, "");
    return domain.split(".").slice(-2, -1)[0] || domain;
  }
  return from;
}

interface GeminiResult {
  isPayment: boolean;
  vendor: string | null;
  amount: number | null;
  currency: string | null;
}

async function classifyWithGemini(
  from: string,
  subject: string,
  bodyText: string
): Promise<GeminiResult> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are classifying emails to find ACTUAL payment transactions.

From: ${from}
Subject: ${subject}
Email body:
${bodyText.slice(0, 1500)}

Return isPayment=TRUE only if this email confirms a completed purchase, charge, or is an invoice requesting payment.
Return isPayment=FALSE for: marketing emails, newsletters, promotions, loyalty/membership updates, or any email that does not confirm money was or must be paid.

For amount: find the TOTAL amount paid or due. Ignore account numbers, KID numbers, customer IDs, loyalty points, and partial line items. The total is usually labeled "Total", "Totalt", "Beløp", "Å betale", "Fakturabeløp", or similar.

Reply with ONLY this JSON (no markdown):
{"isPayment":true or false,"vendor":"company name or null","amount":number or null,"currency":"NOK/USD/EUR/etc or null"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return JSON.parse(text) as GeminiResult;
  } catch {
    return { isPayment: false, vendor: null, amount: null, currency: null };
  }
}

// Runs every hour. Scans Gmail for invoice emails and saves them to Firestore.
export const scanGmailInvoices = onSchedule(
  { schedule: "every 1 hours", region: "europe-west1", secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GEMINI_API_KEY] },
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
          q: `after:${after} (category:updates OR category:promotions OR faktura OR invoice OR receipt OR kvittering OR purchase OR ordre OR subscription)`,
          maxResults: 75,
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

          // Fetch full message immediately so Gemini has body context for classification + amount
          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "full",
          });

          const headers = full.data.payload?.headers ?? [];
          const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
          const from = headers.find((h) => h.name === "From")?.value ?? "";
          const date = headers.find((h) => h.name === "Date")?.value ?? "";
          const snippet = full.data.snippet ?? "";
          const bodyText = extractBodyText(full.data.payload);

          // Single Gemini call with full body — accurate classification + amount extraction
          const gemini = await classifyWithGemini(from, subject, bodyText);
          if (!gemini.isPayment && !isInvoiceEmail(subject, snippet)) continue;

          const fullText = `${subject} ${snippet} ${bodyText}`;
          // Trust Gemini for amount (it has full context), regex only as last resort
          const amount = gemini.amount && gemini.amount >= 20 ? gemini.amount : extractAmount(fullText);
          const dueDate = extractDueDate(fullText);
          const invoiceNumber = extractInvoiceNumber(fullText);
          const vendor = gemini.vendor ?? extractVendor(from);

          await db
            .collection("users")
            .doc(uid)
            .collection("invoices")
            .doc(msg.id)
            .set({
              subject,
              from,
              vendor,
              date: date ? new Date(date) : FieldValue.serverTimestamp(),
              dueDate: dueDate ?? null,
              snippet,
              amount,
              invoiceNumber,
              category: null,
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
