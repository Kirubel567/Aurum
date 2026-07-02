"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { PageTransition } from "@/src/shared/animations/PageTransition";
import { ToastContainer } from "@/src/shared/feedback/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PageTransition className="h-full">{children}</PageTransition>
      <ToastContainer />
    </QueryClientProvider>
  );
}
