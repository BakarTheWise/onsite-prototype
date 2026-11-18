import Link from "next/link";

export function AuthPage({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="simple-auth-page">
      <div className="simple-auth-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>OnSite</span>
        </Link>
      </div>
      <section className="simple-auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
        {children}
      </section>
      <p className="auth-page-footer">OnSite · Construction project workspace</p>
    </main>
  );
}
