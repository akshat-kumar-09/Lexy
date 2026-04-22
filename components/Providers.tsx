"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function Providers({ children }: { children: React.ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) {
    return <>{children}</>;
  }
  return <ClerkProvider publishableKey={pk}>{children}</ClerkProvider>;
}
