import type { Metadata } from "next";
import "./globals.css";
import "./parent-access.css";
import "./demo.css";
import "./demo-features.css";
import "./demo-welcome.css";
import "./demo-contact.css";

export const metadata: Metadata = { title: "Invictus Hub", description: "Invictus Basketball Club operations hub" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
