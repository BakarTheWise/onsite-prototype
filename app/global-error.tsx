"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f7f8f6", color: "#1c211e", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(100%, 460px)", padding: 32, border: "1px solid #e7eae7", borderRadius: 14, background: "#fff" }}>
            <p style={{ color: "#b9853d", fontSize: 10, fontWeight: 800, letterSpacing: ".15em" }}>SERVICE ERROR</p>
            <h1 style={{ fontSize: 26, letterSpacing: "-.04em" }}>OnSite is temporarily unavailable</h1>
            <p style={{ color: "#788079", fontSize: 13, lineHeight: 1.6 }}>Your information is safe. Try again in a moment.</p>
            <button onClick={reset} style={{ minHeight: 42, padding: "0 16px", border: 0, borderRadius: 9, color: "#fff", background: "#263d32", fontWeight: 700 }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
