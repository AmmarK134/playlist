"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

export function AuthNotice() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const error = params.get("error");
  if (!error) return null;
  const message =
    error === "AccessDenied"
      ? "Spotify connection wasn’t completed. You can try again whenever you’re ready."
      : error === "Configuration"
        ? "Spotify connection isn’t available yet. Explore the demo while it’s being set up."
        : "We couldn’t connect to Spotify. Please try again and allow the requested playlist permissions.";
  return (
    <div role="alert" className="error-banner auth-notice">
      <p>{message}</p>
      <button
        className="icon-button"
        aria-label="Dismiss connection error"
        onClick={() => {
          const next = new URLSearchParams(params);
          next.delete("error");
          router.replace(`${path}${next.size ? `?${next}` : ""}`, {
            scroll: false,
          });
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
