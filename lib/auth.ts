import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { sanitizeText } from "@/lib/validation";

const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";

function sanitizeImage(value: string | null | undefined) {
  if (value == null) return value;
  const image = sanitizeText(value);
  if (image.length > 2048) throw new Error("The profile image URL is too long.");

  const url = new URL(image);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("The profile image URL must use HTTP or HTTPS.");
  }
  return url.toString();
}

export const auth = betterAuth({
  appName: "OnSite",
  baseURL: appOrigin,
  trustedOrigins: [appOrigin],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true
  }),
  advanced: {
    database: {
      generateId: "uuid"
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"]
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const name = sanitizeText(user.name);
          if (name.length < 2) throw new Error("A valid name is required.");
          return {
            data: {
              ...user,
              name,
              email: user.email.trim().toLowerCase(),
              image: sanitizeImage(user.image)
            }
          };
        }
      },
      update: {
        before: async (user) => {
          const data = { ...user };
          if (typeof data.name === "string") {
            data.name = sanitizeText(data.name);
            if (data.name.length < 2) throw new Error("A valid name is required.");
          }
          if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();
          data.image = sanitizeImage(data.image);
          return { data };
        }
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your OnSite password",
        text: `This password reset link expires in 30 minutes. If you did not request it, ignore this email.\n\n${url}`
      });
    },
    onPasswordReset: async ({ user }) => {
      console.info("Password reset completed", { userId: user.id });
    }
  },
  emailVerification: {
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verify your OnSite account",
        text: `Verify your email address using this link: ${url}`
      });
    }
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/request-password-reset": { window: 3600, max: 3 }
    }
  },
  plugins: [nextCookies()]
});
