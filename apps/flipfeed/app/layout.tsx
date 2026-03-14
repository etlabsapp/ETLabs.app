import type { Metadata } from "next";
import "./globals.css";
import RemoveRootLoading from "./RemoveRootLoading";

export const metadata: Metadata = {
  title: "FlipFeed | Live split-flap displays",
  description: "Live split-flap displays for digital activity. Real-time ranked boards with mechanical flip animation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <style dangerouslySetInnerHTML={{ __html: `
          html,body{background:#0d0d0f!important;color:#e8e6e3!important;min-height:100%!important;margin:0!important;}
          #root-loading{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#0d0d0f!important;color:#9c9892!important;font-size:1rem!important;z-index:9999!important;font-family:system-ui,sans-serif!important;}
        ` }} />
        <div id="root-loading">Loading FlipFeed…</div>
        {children}
        <RemoveRootLoading />
      </body>
    </html>
  );
}
