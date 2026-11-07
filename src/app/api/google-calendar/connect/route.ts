import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const base64url = (b: Buffer) => b.toString('base64url');

export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  const encryptionKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey || !url || !anonKey)
    return NextResponse.json({ error: 'Configuração OAuth incompleta.' }, { status: 503 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: 'Faça login no aplicativo.' }, { status: 401 });
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(32));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'https://www.googleapis.com/auth/calendar.events', access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256' });
  const response = NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api/google-calendar', maxAge: 600 };
  response.cookies.set('gc_state', state, cookie);
  response.cookies.set('gc_verifier', verifier, cookie);
  response.cookies.set('gc_auth', token, cookie);
  return response;
}
