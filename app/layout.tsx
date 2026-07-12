import type { Metadata, Viewport } from "next";
import "./globals.css";

// TransitOps is an authenticated app — no page should be statically prerendered at
// build time (every route depends on the request's session). Force dynamic rendering
// for the whole app tree.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "TransitOps — Smart Transport Operations Platform",
    template: "%s · TransitOps",
  },
  description:
    "Digitize vehicle, driver, dispatch, maintenance, and expense management with enforced business rules and real-time operational insight.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
