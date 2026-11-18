import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const CHALLENGE_ID_RE = /^chg_[a-f0-9]{16,64}$/;
const CODE_RE = /^\d{6}$/;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'invalid',
  'localhost',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'yopmail.com',
  '10minutemail.com',
  'sharklasers.com',
  'trashmail.com',
  'throwawaymail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'maildrop.cc',
]);

let contactSchemaPromise = null;

function jsonResponse(payload, status = 200) {
  return Response.json(payload, { status, headers: NO_STORE_HEADERS });
}

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(connectionString);
}

async function ensureContactSchema(sql) {
  if (!contactSchemaPromise) {
    contactSchemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_contact_challenges (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          visitor_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          message TEXT NOT NULL,
          code_salt TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_contact_messages (
          id TEXT PRIMARY KEY,
          sender_name TEXT NOT NULL,
          sender_email TEXT NOT NULL,
          message TEXT NOT NULL,
          visitor_id TEXT NOT NULL,
          verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch(err => {
      contactSchemaPromise = null;
      throw err;
    });
  }
  await contactSchemaPromise;
}

export function getMailProvider() {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  return null;
}

export function maskEmail(email) {
  const [local = '', domain = ''] = String(email).split('@');
  if (!local || !domain) return email;
  const shown = local.length <= 2 ? local[0] : `${local.slice(0, 2)}***`;
  return `${shown}@${domain}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hashOtpCode(code, salt) {
  return crypto.scryptSync(code, salt, 32).toString('hex');
}

function constantTimeMatch(expectedHex, candidateHex) {
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(candidateHex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timeout')), ms)),
  ]);
}

export async function verifyDomainAcceptsMail(domain, resolver = dns) {
  const cleanDomain = String(domain || '').trim().toLowerCase();
  if (!cleanDomain || cleanDomain.includes('..') || BLOCKED_EMAIL_DOMAINS.has(cleanDomain)) {
    return { valid: false, reason: 'disposable_or_blocked' };
  }

  try {
    const mxRecords = await withTimeout(resolver.resolveMx(cleanDomain));
    const activeMx = Array.isArray(mxRecords)
      ? mxRecords.filter(r => r && r.exchange && r.exchange !== '.')
      : [];
    if (activeMx.length > 0) {
      return { valid: true, via: 'mx' };
    }
    return { valid: false, reason: 'no_mx' };
  } catch (err) {
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') {
      try {
        const aRecords = await withTimeout(resolver.resolve4(cleanDomain));
        if (Array.isArray(aRecords) && aRecords.length > 0) {
          return { valid: true, via: 'a' };
        }
      } catch {
        // Fall through to domain rejection
      }
      return { valid: false, reason: err.code || 'not_found' };
    }
    // Fail open on transient DNS timeouts rather than blocking valid mail servers
    return { valid: true, via: 'dns_timeout_bypass' };
  }
}

async function sendMail({ to, subject, text, html, replyTo }) {
  const provider = getMailProvider();
  if (!provider) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  if (provider === 'resend') {
    const from = process.env.RESEND_FROM || 'Edison Gaudicos Portfolio <onboarding@resend.dev>';
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`Resend HTTP ${resp.status}: ${errBody.slice(0, 160)}`);
    }
    return;
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Edison Gaudicos Portfolio" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
}

export async function GET() {
  const provider = getMailProvider();
  return jsonResponse({
    ok: true,
    otpReady: Boolean(provider),
    provider: provider || null,
  });
}

export async function POST(request, { verifyDomain = verifyDomainAcceptsMail, mailer = sendMail, sqlClient = null } = {}) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    if (typeof body?.website === 'string' && body.website.trim().length > 0) {
      return jsonResponse({ ok: false, error: 'Unable to process request.' }, 400);
    }

    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.trim() : '';

    if (!VISITOR_ID_RE.test(visitorId)) {
      return jsonResponse({ ok: false, error: 'Valid visitorId is required.' }, 400);
    }

    if (action === 'request-code') {
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const message = typeof body?.message === 'string' ? body.message.trim() : '';

      if (name.length < 2 || name.length > 100) {
        return jsonResponse({ ok: false, error: 'Please enter your name (2–100 characters).' }, 400);
      }
      if (email.length > 254 || !EMAIL_RE.test(email)) {
        return jsonResponse({ ok: false, error: 'Please enter a valid email address.' }, 400);
      }
      if (message.length < 10 || message.length > 5000) {
        return jsonResponse({ ok: false, error: 'Please enter a message (10–5000 characters).' }, 400);
      }

      const domain = email.split('@')[1];
      const domainCheck = await verifyDomain(domain);
      if (!domainCheck.valid) {
        return jsonResponse({
          ok: false,
          error: 'This email domain does not accept mail or uses a disposable provider. Please enter a real email address.',
        }, 400);
      }

      if (!getMailProvider() && mailer === sendMail) {
        return jsonResponse({
          ok: false,
          emailNotConfigured: true,
          error: 'Email verification delivery needs SMTP (Gmail App Password) or Resend env vars on Vercel. Please use Open in Gmail or Use Email App below for now.',
        }, 503);
      }

      const sql = sqlClient || getSql();
      if (!sqlClient) await ensureContactSchema(sql);

      const recentRows = await sql`
        SELECT created_at
        FROM portfolio_contact_challenges
        WHERE (email = ${email} OR visitor_id = ${visitorId})
          AND created_at > NOW() - INTERVAL '15 minutes'
        ORDER BY created_at DESC
      `;

      if (recentRows.length >= 3) {
        return jsonResponse({
          ok: false,
          error: 'Too many verification requests. Please wait a few minutes before requesting another code.',
        }, 429);
      }
      if (recentRows.length > 0) {
        const lastMs = new Date(recentRows[0].created_at).getTime();
        const elapsedSec = Math.floor((Date.now() - lastMs) / 1000);
        if (elapsedSec < 45) {
          return jsonResponse({
            ok: false,
            error: `Please wait ${45 - elapsedSec}s before requesting another verification code.`,
          }, 429);
        }
      }

      const challengeId = `chg_${crypto.randomUUID().replaceAll('-', '')}`;
      const code = String(crypto.randomInt(100000, 1000000));
      const salt = crypto.randomBytes(16).toString('hex');
      const codeHash = hashOtpCode(code, salt);

      await sql`
        INSERT INTO portfolio_contact_challenges (
          id, email, visitor_id, sender_name, message, code_salt, code_hash, expires_at
        )
        VALUES (
          ${challengeId},
          ${email},
          ${visitorId},
          ${name},
          ${message},
          ${salt},
          ${codeHash},
          NOW() + INTERVAL '10 minutes'
        )
      `;

      try {
        await mailer({
          to: email,
          subject: `${code} is your verification code — Edison Gaudicos Portfolio`,
          text: [
            `Hi ${name},`,
            '',
            `Use this 6-digit code to verify your email and send your message to Edison Gaudicos:`,
            '',
            `${code}`,
            '',
            'This code expires in 10 minutes. If you did not request this, you can safely ignore this email.',
          ].join('\n'),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1b1a17;">
              <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#b74700;font-weight:700;margin:0 0 8px;">EJG PORTFOLIO · EMAIL VERIFICATION</p>
              <h2 style="margin:0 0 12px;font-size:20px;">Verify your email to send your message</h2>
              <p style="margin:0 0 16px;line-height:1.5;">Hi ${escapeHtml(name)}, enter this 6-digit code in the contact form to confirm <strong>${escapeHtml(email)}</strong>:</p>
              <div style="font-size:28px;font-weight:800;letter-spacing:0.22em;padding:14px 18px;border-radius:10px;background:#f5f4f1;border:1px solid #ddd9cf;text-align:center;font-family:monospace;">${code}</div>
              <p style="margin:16px 0 0;font-size:13px;color:#666;">This code expires in 10 minutes. If you didn’t request it, ignore this email.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error('Failed sending OTP email:', mailErr);
        await sql`DELETE FROM portfolio_contact_challenges WHERE id = ${challengeId}`;
        return jsonResponse({
          ok: false,
          error: 'Could not deliver the verification email right now. Please check your email address or use Open in Gmail below.',
        }, 502);
      }

      return jsonResponse({
        ok: true,
        step: 'verify',
        challengeId,
        maskedEmail: maskEmail(email),
        expiresInSeconds: 600,
      });
    }

    if (action === 'verify-code') {
      const challengeId = typeof body?.challengeId === 'string' ? body.challengeId.trim() : '';
      const code = typeof body?.code === 'string' ? body.code.trim() : '';

      if (!CHALLENGE_ID_RE.test(challengeId)) {
        return jsonResponse({ ok: false, error: 'Valid verification session is required.' }, 400);
      }
      if (!CODE_RE.test(code)) {
        return jsonResponse({ ok: false, error: 'Enter the 6-digit numeric verification code.' }, 400);
      }

      const sql = sqlClient || getSql();
      if (!sqlClient) await ensureContactSchema(sql);

      const rows = await sql`
        SELECT id, email, visitor_id, sender_name, message, code_salt, code_hash, attempts, expires_at, used_at
        FROM portfolio_contact_challenges
        WHERE id = ${challengeId}
      `;
      const row = rows[0];
      if (!row) {
        return jsonResponse({ ok: false, error: 'Verification session not found. Please request a new code.' }, 404);
      }
      if (row.visitor_id !== visitorId) {
        return jsonResponse({ ok: false, error: 'Verification session mismatch. Request a fresh code.' }, 403);
      }
      if (row.used_at) {
        return jsonResponse({ ok: false, error: 'This verification code has already been used.' }, 409);
      }
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        return jsonResponse({ ok: false, error: 'Verification code expired. Please request a new code.' }, 410);
      }
      if (Number(row.attempts) >= 5) {
        return jsonResponse({ ok: false, error: 'Too many failed attempts. Please request a new code.' }, 429);
      }

      const candidateHash = hashOtpCode(code, row.code_salt);
      if (!constantTimeMatch(row.code_hash, candidateHash)) {
        const nextAttempts = Number(row.attempts) + 1;
        await sql`
          UPDATE portfolio_contact_challenges
          SET attempts = ${nextAttempts}
          WHERE id = ${challengeId}
        `;
        const remaining = Math.max(0, 5 - nextAttempts);
        return jsonResponse({
          ok: false,
          remainingAttempts: remaining,
          error: remaining > 0
            ? `Incorrect verification code (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left).`
            : 'Too many failed attempts. Please request a new code.',
        }, 400);
      }

      const updatedRows = await sql`
        UPDATE portfolio_contact_challenges
        SET used_at = NOW()
        WHERE id = ${challengeId} AND used_at IS NULL
        RETURNING id
      `;
      if (updatedRows.length === 0) {
        return jsonResponse({ ok: false, error: 'This verification code has already been used.' }, 409);
      }

      const messageId = `msg_${crypto.randomUUID().replaceAll('-', '')}`;
      await sql`
        INSERT INTO portfolio_contact_messages (
          id, sender_name, sender_email, message, visitor_id, verified_at
        )
        VALUES (
          ${messageId},
          ${row.sender_name},
          ${row.email},
          ${row.message},
          ${row.visitor_id},
          NOW()
        )
      `;

      const notifyTo = process.env.CONTACT_NOTIFY_TO || process.env.SMTP_USER || 'gaudicosmedisonjr@gmail.com';
      try {
        await mailer({
          to: notifyTo,
          replyTo: row.email,
          subject: `[Verified Portfolio Message] From ${row.sender_name}`,
          text: [
            `Verified inquiry from ${row.sender_name} (${row.email})`,
            `Message ID: ${messageId}`,
            '',
            row.message,
          ].join('\n'),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1b1a17;">
              <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#b74700;font-weight:700;margin:0 0 8px;">VERIFIED PORTFOLIO INQUIRY</p>
              <h2 style="margin:0 0 12px;">New verified message from ${escapeHtml(row.sender_name)}</h2>
              <p style="margin:0 0 14px;"><strong>Reply-To (OTP Verified):</strong> ${escapeHtml(row.email)}</p>
              <div style="padding:14px 16px;border-radius:10px;background:#f5f4f1;border:1px solid #ddd9cf;white-space:pre-wrap;line-height:1.55;">${escapeHtml(row.message)}</div>
              <p style="margin:14px 0 0;font-size:12px;color:#666;">Saved in Neon Postgres · ${escapeHtml(messageId)}</p>
            </div>
          `,
        });
      } catch (notifyErr) {
        // Message is already verified and safely saved in Neon Postgres even if forwarding fails
        console.error('Verified contact forward failed:', notifyErr);
      }

      return jsonResponse({
        ok: true,
        step: 'sent',
        messageId,
        email: row.email,
      });
    }

    return jsonResponse({ ok: false, error: 'Action must be "request-code" or "verify-code".' }, 400);
  } catch (err) {
    console.error('POST /api/contact failed:', err);
    return jsonResponse({ ok: false, error: 'Unable to process contact request right now.' }, 500);
  }
}
