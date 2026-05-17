import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
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
