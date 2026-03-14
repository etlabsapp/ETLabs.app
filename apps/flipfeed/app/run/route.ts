import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>FlipFeed</title></head>
<body style="margin:0;min-height:100vh;background:#0d0d0f;color:#e8e6e3;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;">
  <h1 style="font-size:1.5rem;">FlipFeed is running</h1>
  <p style="color:#9c9892;">If you see this, the server is working.</p>
  <a href="/" style="color:#e8e6e3;margin-top:1rem;">Go to board</a>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
