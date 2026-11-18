import nodemailer from "nodemailer";

type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const host = SMTP_HOST?.trim();

  if (!host && process.env.NODE_ENV === "development") {
    console.info(
      ["[OnSite development email preview]", `To: ${message.to}`, `Subject: ${message.subject}`, "", message.text].join("\n")
    );
    return;
  }

  if (!host || !SMTP_PORT || !SMTP_FROM) {
    throw new Error("SMTP_HOST, SMTP_PORT, and SMTP_FROM must be configured.");
  }
  if (Boolean(SMTP_USER) !== Boolean(SMTP_PASSWORD)) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must both be configured.");
  }

  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: SMTP_USER && SMTP_PASSWORD
      ? { user: SMTP_USER, pass: SMTP_PASSWORD }
      : undefined
  });

  await transport.sendMail({ from: SMTP_FROM, ...message });
}
