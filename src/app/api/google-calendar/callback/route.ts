import { createCipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
function same(a: string, b: string) { const x=Buffer.from(a); const y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
function encrypt(token: string, secret: string) {
  const key = Buffer.from(secret, 'base64url');
  if (key.length !== 32) throw new Error('Chave de criptografia inválida');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}
export async function GET(request: NextRequest) {
  const back = new URL('/', request.url);
  const redirect = (result: string) => {
    back.searchParams.set('google_calendar', result);
    const response = NextResponse.redirect(back);
    for (const name of ['gc_state','gc_verifier','gc_auth']) response.cookies.set(name,'',{path:'/api/google-calendar',maxAge:0});
    return response;
  };
  const state = request.nextUrl.searchParams.get('state') || '';
  const code = request.nextUrl.searchParams.get('code');
  const saved = request.cookies.get('gc_state')?.value || '';
  const verifier = request.cookies.get('gc_verifier')?.value || '';
  const token = request.cookies.get('gc_auth')?.value || '';
  if (!code || !state || !saved || !same(state,saved) || !verifier || !token) return redirect('authorization_failed');
  const clientId=process.env.GOOGLE_CALENDAR_CLIENT_ID, secret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET, uri=process.env.GOOGLE_CALENDAR_REDIRECT_URI, key=process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!clientId || !secret || !uri || !key || !url || !anon || new URL(uri).origin !== new URL(request.url).origin) return redirect('configuration_error');
  const supabase=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const {data:{user},error}=await supabase.auth.getUser(token);
  if (error || !user) return redirect('session_expired');
  try {
    const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId,client_secret:secret,redirect_uri:uri,grant_type:'authorization_code',code_verifier:verifier}),cache:'no-store'});
    if(!res.ok) return redirect('token_exchange_failed');
    const json=await res.json();
    if(typeof json.refresh_token!=='string' || !json.refresh_token) return redirect('refresh_token_missing');
    const encrypted=encrypt(json.refresh_token,key);
    const {error:saveError}=await supabase.from('google_calendar_connections').upsert({user_id:user.id,encrypted_refresh_token:encrypted,calendar_id:'primary',updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(saveError) return redirect('save_failed');
    return redirect('connected');
  } catch { return redirect('authorization_failed'); }
}
