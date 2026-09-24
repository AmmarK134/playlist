"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="dashboard-page">
      <div className="empty-state">
        <div className="eyebrow">LET’S GET BACK IN THE GROOVE</div>
        <h1>We hit a little static.</h1>
        <p>
          Something interrupted the studio. Try loading it again to pick up
          where you left off.
        </p>
        <button className="button button-primary" onClick={reset}>
          <RotateCcw size={16} />
          Try again
        </button>
        <Link href="/" className="text-link">
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
