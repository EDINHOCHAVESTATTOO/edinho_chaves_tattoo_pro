
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

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
}export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Segredo não configurado" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const expected = "sha256=" + createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const received = signature
    ? Buffer.from(signature, "utf8")
    : Buffer.alloc(0);

  const calculated = Buffer.from(expected, "utf8");

  if (
    received.length !== calculated.length ||
    !timingSafeEqual(received, calculated)
  ) {
    return NextResponse.json(
      { error: "Assinatura inválida" },
      { status: 401 }
    );
  }

  try {
    const body = JSON.parse(rawBody);

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json(
        { error: "Evento não reconhecido" },
        { status: 400 }
      );
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida" },
      { status: 400 }
    );
  }
}