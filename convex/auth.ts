import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

function guestDisplayName(): string {
  return `Guest ${Math.floor(Math.random() * 10_000)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous({
      profile() {
        return {
          isAnonymous: true,
          name: guestDisplayName(),
        };
      },
    }),
    Google({
      profile(profile) {
        const sub = typeof profile.sub === "string" ? profile.sub : "";
        const email = profile.email?.trim();
        if (!email) {
          throw new Error("Google account did not provide an email address");
        }
        if (!sub) {
          throw new Error("Google account did not provide a stable id (sub)");
        }
        const doc: {
          id: string;
          email: string;
          name?: string;
          image?: string;
        } = {
          id: sub,
          email: normalizeEmail(email),
        };
        const name = profile.name?.trim();
        if (name) doc.name = name;
        const image = profile.picture?.trim();
        if (image) doc.image = image;
        return doc;
      },
    }),
    Password({
      profile(params) {
        const email = normalizeEmail(params.email as string);
        const rawName =
          typeof params.name === "string" ? params.name.trim() : "";
        const doc: { email: string; name?: string } = { email };
        if (rawName) {
          doc.name = rawName;
        }
        return doc;
      },
    }),
  ],
});
