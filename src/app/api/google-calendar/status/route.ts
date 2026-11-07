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
      ? 'Integração configurada. Verifique sua conexão após entrar no aplicativo. O envio automático está desativado.'
      : 'Configuração Google Cloud pendente. A sincronização automática permanece desativada.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
