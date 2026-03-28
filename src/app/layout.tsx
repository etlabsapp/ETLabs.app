import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ET Labs | Software Should Support Life, Not Consume It",
  description:
    "Calm, intentional software—including SleepTight: DreamWrite for sleep and nap guidance—from a small independent studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
