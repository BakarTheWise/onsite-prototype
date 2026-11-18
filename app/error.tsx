"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("OnSite page failed", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="error-page">
      <section className="error-card">
        <span className="error-code">WORKSPACE ERROR</span>
        <h1>We couldn’t load this page</h1>
        <p>Your data is safe. Retry the request or return to the OnSite home screen.</p>
        <div className="form-actions">
          <button className="button button-outline" onClick={reset}>Try again</button>
          <Link className="button button-dark" href="/">Go to OnSite</Link>
        </div>
      </section>
    </main>
  );
}
