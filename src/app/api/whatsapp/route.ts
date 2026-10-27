
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    verifyToken &&
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Verificação não autorizada" },
    { status: 403 }
  );
}