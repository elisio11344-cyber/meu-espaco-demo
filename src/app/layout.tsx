import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Meu espaço", template: "%s | Meu espaço" }, description: "Sua plataforma pessoal de produtividade." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><I18nProvider storageKey="foco:language">{children}</I18nProvider></body></html>;
}
