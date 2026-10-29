"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><section className="panel" style={{ maxWidth: 440, padding: 36, textAlign: "center" }}><span className="footer-brand" style={{ color: "#ed6b32", fontSize: 42 }}>ikeda</span><h1 style={{ fontSize: 23, fontWeight: 600, marginTop: 24 }}>Uma pequena pausa por aqui.</h1><p style={{ color: "#939da5", fontSize: 12, lineHeight: 1.9, margin: "14px 0 24px" }}>Não foi possível carregar o portal agora. Seus dados continuam salvos. Tente novamente em instantes.</p><button className="button primary" onClick={reset}>Tentar novamente</button></section></main>;
}
