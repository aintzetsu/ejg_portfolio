import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GET as likesGet, POST as likesPost } from '../api/likes.js';
import { GET as contactGet, POST as contactPost, maskEmail, verifyDomainAcceptsMail } from '../api/contact.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createMockSql({ targets = {}, voters = new Set(), metrics = {}, challenges = new Map(), messages = [] } = {}) {
  return async (strings, ...values) => {
    const query = strings.join('?').replace(/\s+/g, ' ').trim();

    if (query.startsWith('SELECT target, total_likes FROM portfolio_like_targets')) {
      return Object.entries(targets).map(([target, total_likes]) => ({ target, total_likes }));
    }
    if (query.startsWith('SELECT target FROM portfolio_like_voters WHERE visitor_id = ?')) {
      const vid = values[0];
      return [...voters]
        .filter(k => k.endsWith(`|${vid}`))
        .map(k => ({ target: k.split('|')[0] }));
    }
    if (query.startsWith('SELECT metric, total_count FROM portfolio_site_metrics')) {
      return Object.entries(metrics).map(([metric, total_count]) => ({ metric, total_count }));
    }
    if (query.startsWith('INSERT INTO portfolio_site_metrics')) {
      const metricKey = values[0];
      metrics[metricKey] = (metrics[metricKey] || 0) + 1;
      return [];
    }
    if (query.startsWith('WITH ins AS')) {
      const [target, visitorId] = values;
      const key = `${target}|${visitorId}`;
      const changed = !voters.has(key);
      if (changed) {
        voters.add(key);
        targets[target] = (targets[target] || 0) + 1;
      }
      return [{ total_likes: targets[target] || 0, changed }];
    }
    if (query.startsWith('WITH del AS')) {
      const [target, visitorId] = values;
      const key = `${target}|${visitorId}`;
      const changed = voters.delete(key);
      if (changed) {
        targets[target] = Math.max(0, (targets[target] || 0) - 1);
      }
      return [{ total_likes: targets[target] || 0, changed }];
    }
    if (query.startsWith('SELECT created_at FROM portfolio_contact_challenges')) {
      const [email, visitorId] = values;
      const cutoff = Date.now() - 15 * 60 * 1000;
      return [...challenges.values()]
        .filter(c => (c.email === email || c.visitor_id === visitorId) && c.created_at.getTime() > cutoff)
        .sort((a, b) => b.created_at - a.created_at)
        .map(c => ({ created_at: c.created_at }));
    }
    if (query.startsWith('INSERT INTO portfolio_contact_challenges')) {
      const [id, email, visitor_id, sender_name, message, code_salt, code_hash] = values;
      challenges.set(id, {
        id,
        email,
        visitor_id,
        sender_name,
        message,
        code_salt,
        code_hash,
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        used_at: null,
        created_at: new Date(),
      });
      return [];
    }
    if (query.startsWith('DELETE FROM portfolio_contact_challenges WHERE id = ?')) {
      challenges.delete(values[0]);
      return [];
    }
    if (query.startsWith('SELECT id, email, visitor_id, sender_name')) {
      const c = challenges.get(values[0]);
      return c ? [c] : [];
    }
    if (query.startsWith('UPDATE portfolio_contact_challenges SET attempts = ?')) {
      const [attempts, id] = values;
      const c = challenges.get(id);
      if (c) c.attempts = attempts;
      return [];
    }
    if (query.startsWith('UPDATE portfolio_contact_challenges SET used_at = NOW()')) {
      const c = challenges.get(values[0]);
      if (c && !c.used_at) {
        c.used_at = new Date();
        return [{ id: c.id }];
      }
      return [];
    }
    if (query.startsWith('INSERT INTO portfolio_contact_messages')) {
      const [id, sender_name, sender_email, message, visitor_id] = values;
      messages.push({ id, sender_name, sender_email, message, visitor_id });
      return [];
    }
    throw new Error(`Unexpected query in mock SQL: ${query}`);
  };
}

test('api/likes GET & POST validate inputs, update counts, and preserve metrics', async () => {
  const sqlClient = createMockSql({
    targets: { portfolio: 114, 'project-saldo': 21 },
    voters: new Set(['portfolio|v_existing_visitor_1']),
    metrics: { visits: 316, cv_downloads: 78 },
  });

  const getResp = await likesGet(new Request('https://ejg-portfolio.vercel.app/api/likes?visitorId=v_existing_visitor_1'), { sqlClient });
  assert.equal(getResp.status, 200);
  const getData = await getResp.json();
  assert.equal(getData.portfolioLikes, 114);
  assert.equal(getData.counts['project-saldo'], 21);
  assert.deepEqual(getData.liked, ['portfolio']);
  assert.deepEqual(getData.metrics, { visits: 316, cvDownloads: 78 });

  const badTarget = await likesPost(
    new Request('https://ejg-portfolio.vercel.app/api/likes', {
      method: 'POST',
      body: JSON.stringify({ target: 'project-unknown', visitorId: 'v_new_visitor_001', action: 'like' }),
    }),
    { sqlClient }
  );
  assert.equal(badTarget.status, 400);

  const likeResp = await likesPost(
    new Request('https://ejg-portfolio.vercel.app/api/likes', {
      method: 'POST',
      body: JSON.stringify({ target: 'project-saldo', visitorId: 'v_new_visitor_001', action: 'like' }),
    }),
    { sqlClient }
  );
  assert.equal(likeResp.status, 200);
  const likeData = await likeResp.json();
  assert.equal(likeData.likes, 22);
  assert.equal(likeData.changed, true);

  const unlikeResp = await likesPost(
    new Request('https://ejg-portfolio.vercel.app/api/likes', {
      method: 'POST',
      body: JSON.stringify({ target: 'project-saldo', visitorId: 'v_new_visitor_001', action: 'unlike' }),
    }),
    { sqlClient }
  );
  assert.equal(unlikeResp.status, 200);
  assert.equal((await unlikeResp.json()).likes, 21);
});

test('api/contact validates domains, honeypot, OTP failures, and verified submission', async () => {
  const health = await contactGet();
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  assert.equal(maskEmail('edison@gmail.com'), 'ed***@gmail.com');
  assert.deepEqual(await verifyDomainAcceptsMail('mailinator.com'), { valid: false, reason: 'disposable_or_blocked' });

  const state = { challenges: new Map(), messages: [] };
  const sqlClient = createMockSql(state);
  const sentEmails = [];
  const mailer = async payload => { sentEmails.push(payload); };
  const verifyDomain = async () => ({ valid: true, via: 'mx' });

  const honeypot = await contactPost(
    new Request('https://ejg-portfolio.vercel.app/api/contact', {
      method: 'POST',
      body: JSON.stringify({ action: 'request-code', visitorId: 'v_tester_0001', website: 'https://spam.invalid' }),
    }),
    { verifyDomain, mailer, sqlClient }
  );
  assert.equal(honeypot.status, 400);

  const reqResp = await contactPost(
    new Request('https://ejg-portfolio.vercel.app/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        action: 'request-code',
        visitorId: 'v_tester_0001',
        name: 'Recruiter',
        email: 'recruiter@company.com',
        message: 'Interested in discussing an IT / Web Developer role.',
      }),
    }),
    { verifyDomain, mailer, sqlClient }
  );
  assert.equal(reqResp.status, 200);
  const { challengeId } = await reqResp.json();
  assert.equal(sentEmails.length, 1);

  const otpMatch = sentEmails[0].text.match(/\b(\d{6})\b/);
  assert.ok(otpMatch, 'Verification code should be included in OTP email');
  const code = otpMatch[1];

  const wrongCode = code === '000000' ? '111111' : '000000';
  const badVerify = await contactPost(
    new Request('https://ejg-portfolio.vercel.app/api/contact', {
      method: 'POST',
      body: JSON.stringify({ action: 'verify-code', visitorId: 'v_tester_0001', challengeId, code: wrongCode }),
    }),
    { verifyDomain, mailer, sqlClient }
  );
  assert.equal(badVerify.status, 400);
  assert.equal((await badVerify.json()).remainingAttempts, 4);

  const okVerify = await contactPost(
    new Request('https://ejg-portfolio.vercel.app/api/contact', {
      method: 'POST',
      body: JSON.stringify({ action: 'verify-code', visitorId: 'v_tester_0001', challengeId, code }),
    }),
    { verifyDomain, mailer, sqlClient }
  );
  assert.equal(okVerify.status, 200);
  assert.equal((await okVerify.json()).step, 'sent');
  assert.equal(state.messages.length, 1);
  assert.equal(sentEmails.length, 2);
});

test('HTML CSP hashes, manifest icons, assets, anchors, and project bindings are valid', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  const cspHeader = vercel.headers[0].headers.find(h => h.key === 'Content-Security-Policy')?.value || '';
  assert.ok(cspHeader.includes("'sha256-"));

  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(ROOT, icon.src)), `Missing manifest icon ${icon.src}`);
  }

  const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
  const catalogMatch = js.match(/const projectCatalog = \{([\s\S]*?)\n\};/);
  assert.ok(catalogMatch, 'projectCatalog found in script.js');
  const catalogKeys = new Set([...catalogMatch[1].matchAll(/^\s*"?([a-zA-Z0-9_]+)"?\s*:\s*\{/gm)].map(m => m[1]));

  for (const page of ['index.html', '404.html', 'resume.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const scripts = [...html.matchAll(/<script(?![^>]*src=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
    for (const [, body] of scripts) {
      const hash = 'sha256-' + crypto.createHash('sha256').update(body, 'utf8').digest('base64');
      const lfHash = 'sha256-' + crypto.createHash('sha256').update(body.replaceAll('\r\n', '\n'), 'utf8').digest('base64');
      assert.ok(cspHeader.includes(hash) && cspHeader.includes(lfHash), `${page} hashes (${hash}, ${lfHash}) missing from vercel.json CSP`);
    }

    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicate IDs in ${page}`);

    for (const [, asset] of html.matchAll(/(?:src|href)=["']([^"'#?:]+\.(?:png|webp|ico|svg|pdf|css|js|webmanifest))["']/g)) {
      const clean = asset.replace(/^\//, '');
      assert.ok(fs.existsSync(path.join(ROOT, clean)), `${page} references missing asset: ${asset}`);
    }

    if (page === 'index.html') {
      const idSet = new Set(ids);
      for (const [, anchor] of html.matchAll(/href=["']#([^"']+)["']/g)) {
        assert.ok(idSet.has(anchor), `Broken anchor #${anchor} in index.html`);
      }
      for (const [, key] of html.matchAll(/data-(?:preview|casestudy)=["']([^"']+)["']/g)) {
        assert.ok(catalogKeys.has(key), `Key ${key} missing from projectCatalog`);
      }
    }
  }
});
