import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && params.get("hub.mode") === "subscribe" &&
      params.get("hub.verify_token") === token && params.has("hub.challenge")) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verificação não autorizada" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!secret || !url || !key) {
    console.error("Webhook: variáveis de ambiente obrigatórias ausentes");
    return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signature ?? "", "utf8");
  const calculated = Buffer.from(expected, "utf8");
  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ error: "Evento não reconhecido" }, { status: 400 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    for (const entry of asRecords(payload.entry)) {
      for (const change of asRecords(entry.changes)) {
        if (change.field !== "messages" || !isRecord(change.value)) continue;
        const value = change.value;
        const metadata = isRecord(value.metadata) ? value.metadata : {};
        const phoneNumberId = metadata.phone_number_id;
        if (typeof phoneNumberId !== "string" || !phoneNumberId) continue;

        // Status notifications are acknowledged; updating outgoing message
        // status requires a matching outgoing-message schema and is handled separately.
        const messages = asRecords(value.messages);
        const statuses = asRecords(value.statuses);
        if (!messages.length && !statuses.length) continue;

        const { data: account, error: accountError } = await supabase
          .from("whatsapp_accounts")
          .select("user_id")
          .eq("phone_number_id", phoneNumberId)
          .maybeSingle();

        if (accountError) throw accountError;
        if (!account) {
          console.warn("Webhook: phone_number_id não cadastrado", phoneNumberId);
          // Do not acknowledge a message we could not persist: Meta may retry.
          return NextResponse.json({ error: "Conta WhatsApp não configurada" }, { status: 503 });
        }

        for (const event of statuses) {
          if (typeof event.id !== "string" || typeof event.status !== "string") continue;
          if (!["sent", "delivered", "read", "failed"].includes(event.status)) continue;
          const { error: statusError } = await supabase
            .from("whatsapp_messages")
            .update({ status: event.status })
            .eq("whatsapp_message_id", event.id)
            .eq("user_id", account.user_id)
            .eq("direction", "outgoing");
          if (statusError) throw statusError;
        }

        for (const message of messages) {
          if (typeof message.id !== "string" || typeof message.from !== "string") continue;
          const phone = message.from;
          const contact = asRecords(value.contacts).find(item => item.wa_id === phone);
          const profile = contact && isRecord(contact.profile) ? contact.profile : {};
          const contactName = typeof profile.name === "string" ? profile.name : null;

          const conversationRow: Record<string, string> = {
            user_id: account.user_id,
            phone,
            updated_at: new Date().toISOString(),
          };
          if (contactName) conversationRow.contact_name = contactName;
          const { data: conversation, error: conversationError } = await supabase
            .from("whatsapp_conversations")
            .upsert(conversationRow, { onConflict: "user_id,phone" })
            .select("id")
            .single();
          if (conversationError || !conversation) throw conversationError ?? new Error("Conversa não retornada");

          const type = typeof message.type === "string" ? message.type : "unknown";
          const textPayload = isRecord(message.text) ? message.text : {};
          const messageText = type === "text" && typeof textPayload.body === "string"
            ? textPayload.body : null;
          const { error: messageError } = await supabase.from("whatsapp_messages").upsert({
            user_id: account.user_id,
            conversation_id: conversation.id,
            whatsapp_message_id: message.id,
            direction: "incoming",
            message_type: type,
            message_text: messageText,
            status: "received",
          }, { onConflict: "whatsapp_message_id", ignoreDuplicates: true });
          if (messageError) throw messageError;
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook do WhatsApp:", error);
    return NextResponse.json({ error: "Falha ao processar evento" }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
