import { NextResponse } from "next/server";
import feedA from "@/data/feed-a.json";
import feedB from "@/data/feed-b.json";

type FeedRow = { rank: string; name: string; country: string; category: string };
const feeds: FeedRow[][] = [feedA as FeedRow[], feedB as FeedRow[]];

let cycleIndex = 0;

export async function GET() {
  const feed = feeds[cycleIndex % feeds.length];
  cycleIndex += 1;
  return NextResponse.json(feed);
}
