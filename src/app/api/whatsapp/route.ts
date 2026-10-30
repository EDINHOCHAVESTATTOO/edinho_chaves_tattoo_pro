
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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
    challenge !== null
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Verificação não autorizada" },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!secret || !supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Configuração incompleta" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const expected =
    "sha256=" +
    createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

  const received = Buffer.from(signature || "", "utf8");
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

  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json(
      { error: "Evento não reconhecido" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (!phoneNumberId) continue;
        console.log("WhatsApp Phone Number ID recebido:", phoneNumberId);

        const { data: account, error: accountError } =
          await supabase
            .from("whatsapp_accounts")
            .select("user_id")
            .eq("phone_number_id", phoneNumberId)
            .single();

        if (accountError || !account) {
          throw new Error("Conta WhatsApp não encontrada");
        }

        for (const message of value.messages || []) {
          if (!message.id || !message.from) continue;

          const phone = String(message.from);

          const contact = (value.contacts || []).find(
            (item: any) => item.wa_id === phone
          );

          const contactName = contact?.profile?.name || null;

          const { data: conversation, error: conversationError } =
            await supabase
              .from("whatsapp_conversations")
              .upsert(
                {
                  user_id: account.user_id,
                  phone,
                  contact_name: contactName,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,phone" }
              )
              .select("id")
              .single();

          if (conversationError || !conversation) {
            throw new Error("Erro ao salvar conversa");
          }

          const { error: messageError } = await supabase
            .from("whatsapp_messages")
            .upsert(
              {
                user_id: account.user_id,
                conversation_id: conversation.id,
                whatsapp_message_id: message.id,
                direction: "incoming",
                message_type: message.type || "unknown",
                message_text:
                  message.type === "text"
                    ? message.text?.body || ""
                    : null,
                status: "received",
              },
              {
                onConflict: "whatsapp_message_id",
                ignoreDuplicates: true,
              }
            );

          if (messageError) {
            throw new Error("Erro ao salvar mensagem");
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook do WhatsApp:", error);

    return NextResponse.json(
      { error: "Falha ao processar evento" },
      { status: 500 }
    );
  }
}
