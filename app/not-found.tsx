import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <section className="error-card">
        <span className="error-code">404 · NOT FOUND</span>
        <h1>This page isn’t here</h1>
        <p>The link may be incorrect, or you may not have access to this project.</p>
        <Link className="button button-dark" href="/">Return to OnSite</Link>
      </section>
    </main>
  );
}
