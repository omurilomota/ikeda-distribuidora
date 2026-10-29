import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ikeda | Portal do Parceiro",
  description: "Seu estoque em dia, seu negócio mais longe. Portal B2B de pedidos, ofertas e gestão financeira. Ambiente de demonstração.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
