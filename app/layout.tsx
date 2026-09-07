import "./globals.css";
import type { Metadata } from "next";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";
import { SiteHeader } from "@/src/components/layout/SiteHeader";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: "MCPserver.in — MCP Server Directory, Guides & Evidence",
    template: "%s — MCPserver.in",
  },
  description:
    "Explore Model Context Protocol servers, client setup guides, security guidance, troubleshooting and evidence-backed MCP ecosystem research.",
  openGraph: {
    siteName: "MCPserver.in",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
          <SiteHeader />
          <main className="container mx-auto py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
