import assert from "node:assert/strict";
import test from "node:test";
import { sendTransactionalEmail } from "../lib/email";

test("development prints an email preview when SMTP is not configured", async (context) => {
  const keys = ["NODE_ENV", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  const originalInfo = console.info;
  let output = "";

  context.after(() => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else Reflect.set(process.env, key, value);
    }
    console.info = originalInfo;
  });

  Reflect.set(process.env, "NODE_ENV", "development");
  delete process.env.SMTP_HOST;
  process.env.SMTP_PORT = "587";
  process.env.SMTP_FROM = "OnSite <no-reply@example.com>";
  console.info = (...args: unknown[]) => {
    output = args.join("\n");
  };

  await sendTransactionalEmail({
    to: "user@example.com",
    subject: "Verify your OnSite account",
    text: "Open http://localhost:3000/api/auth/verify-email?token=development-token"
  });

  assert.match(output, /development email preview/);
  assert.match(output, /development-token/);
});
