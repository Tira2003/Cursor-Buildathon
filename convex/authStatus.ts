import { query } from "./_generated/server";
import { v } from "convex/values";

function googleRedirectUri(): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) return "";
  return `${siteUrl.replace(/\/$/, "")}/api/auth/callback/google`;
}

export const googleOAuthConfigured = query({
  args: {},
  returns: v.boolean(),
  handler: async () => {
    return Boolean(
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
    );
  },
});

export const googleOAuthSetup = query({
  args: {},
  returns: v.object({
    configured: v.boolean(),
    redirectUri: v.string(),
    siteUrl: v.optional(v.string()),
  }),
  handler: async () => {
    return {
      configured: Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      ),
      redirectUri: googleRedirectUri(),
      siteUrl: process.env.SITE_URL,
    };
  },
});
