# WhatsApp Business / Supabase checklist

## Webhook
- Meta callback URL: `https://SEU-DOMINIO/api/whatsapp`.
- GET challenge uses `WHATSAPP_VERIFY_TOKEN` (same value configured in Meta).
- POST signature uses `WHATSAPP_APP_SECRET`, validated against the exact raw request body.
- Subscribe the WhatsApp Business Account to the `messages` webhook field.
- Configure the deployment's environment variables; never paste credentials into source control.

## Supabase
- Browser uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; webhook uses server-only `SUPABASE_SECRET_KEY`.
- Confirm `whatsapp_accounts(phone_number_id,user_id)` maps the Meta phone number ID to the correct tenant.
- Confirm unique constraints on `whatsapp_conversations(user_id,phone)` and `whatsapp_messages(whatsapp_message_id)` for upsert idempotency.
- Verify row-level security and access policies for the user-facing tables. Never expose the secret key to the browser.
- Check existing database migrations before adding constraints: duplicates must be resolved first.

## Meta authentication
- The Embedded Signup page receives a short-lived authorization code in the browser.
- A secure authenticated server endpoint must exchange the code with Meta and store credentials server-side.
- Do not treat the code callback alone as a completed connection.
- Confirm the Meta business onboarding result (WABA ID and phone number ID), account mapping, token scopes and expiration.
- This branch does not implement a token-exchange endpoint without confirmed account schema and session authorization.

## Test plan
1. GET with correct/incorrect verify token: 200 challenge / 403.
2. POST with valid/invalid HMAC: accepted / 401.
3. POST malformed JSON: 400.
4. POST message for registered phone number: conversation and message persisted once.
5. Retry identical message: no duplicate.
6. POST unknown phone number: 503 (retryable, not silently discarded).
7. POST status-only event: acknowledged, without inserting a fake inbound message.
8. Verify deployment secrets, Meta subscription, database schema and end-to-end test before merging.
