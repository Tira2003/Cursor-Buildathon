"use client";

import { useConvexAuth } from "@convex-dev/auth/react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      {children}
      <Toaster richColors position="top-center" />
    </ConvexProviderWithAuth>
  );
}
