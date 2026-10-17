// Byte-range (206) support for Junior media on the preview; iOS Safari needs it to play <video>.
import { withByteRanges } from "../../_lib/range.js";
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  return withByteRanges(request, res);
}
