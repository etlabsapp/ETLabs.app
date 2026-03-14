import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  if (!location?.trim()) {
    return NextResponse.json({ error: "location required" }, { status: 400 });
  }
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    return NextResponse.json(
      { temp: "—", conditions: "Set OPENWEATHER_API_KEY", location: location.trim() },
      { status: 200 }
    );
  }
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.trim())}&units=imperial&appid=${key}`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) {
      return NextResponse.json(
        { temp: "—", conditions: "Not found", location: location.trim() },
        { status: 200 }
      );
    }
    const data = await res.json();
    const temp = Math.round(data.main?.temp ?? 0);
    const conditions = (data.weather?.[0]?.main ?? "—").toUpperCase();
    return NextResponse.json({
      temp,
      conditions,
      location: data.name ?? location.trim(),
    });
  } catch {
    return NextResponse.json(
      { temp: "—", conditions: "Error", location: location.trim() },
      { status: 200 }
    );
  }
}
