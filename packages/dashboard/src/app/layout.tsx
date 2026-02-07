import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Project Manager",
  description: "Project management dashboard for Claude Code workflows",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <QueryProvider>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
