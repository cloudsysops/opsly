import type { NextRequest } from "next/server";
import { handleFeedbackGet, handleFeedbackPost } from "../../../lib/feedback/service";

export async function POST(req: NextRequest): Promise<Response> {
  return handleFeedbackPost(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleFeedbackGet(req);
}
