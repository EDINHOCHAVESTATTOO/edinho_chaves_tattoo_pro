import { NextResponse } from 'next/server';

// Endpoint sem credenciais ou dados pessoais: apenas informa se a integração
// pode ser iniciada. Nunca interpreta variáveis públicas como segredos.
export async function GET() {
  const configured = Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY &&
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );

  return NextResponse.json({
    configured,
    connected: false,
    syncEnabled: false,
    message: configured
      ? 'Credenciais presentes; autorização e armazenamento seguro ainda precisam ser habilitados.'
      : 'Configuração Google Cloud pendente. A sincronização automática permanece desativada.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
