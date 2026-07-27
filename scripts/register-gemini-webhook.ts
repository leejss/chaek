import "../env.config";

import { GoogleGenAI } from "@google/genai";

const uriValue = process.argv[2];

if (!uriValue) {
  throw new Error(
    "Usage: npm run gemini:webhook:create -- https://example.com/api/webhooks/gemini",
  );
}

const uri = new URL(uriValue);

if (uri.protocol !== "https:") {
  throw new Error("The Gemini webhook URI must use HTTPS.");
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not configured.");
}

const client = new GoogleGenAI({ apiKey });
const webhook = await client.webhooks.create({
  name: "chaek-content-compiler",
  subscribed_events: [
    "interaction.requires_action",
    "interaction.completed",
    "interaction.failed",
  ],
  uri: uri.toString(),
});

console.log(
  JSON.stringify(
    {
      id: webhook.id,
      name: webhook.name,
      uri: webhook.uri,
      signingSecret: webhook.new_signing_secret,
      warning:
        "The signing secret is returned once. Store it as GEMINI_WEBHOOK_SIGNING_SECRET.",
    },
    null,
    2,
  ),
);
