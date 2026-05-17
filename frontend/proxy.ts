import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

/** Convex Auth request handler (Next.js 16+ `proxy` convention). */
export default convexAuthNextjsMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
