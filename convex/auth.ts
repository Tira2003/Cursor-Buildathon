import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      profile(profile) {
        const email = profile.email?.trim();
        if (!email) {
          throw new Error("Google account did not provide an email address");
        }
        const doc: { email: string; name?: string; image?: string } = {
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
