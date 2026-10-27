import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createErpAuth, erpSessionFromVerifiedUser, LOGIN_SERVER_ERROR } from '../lib/erpAuth.js';

const user = (role = 'staff') => ({ id: 'fixture', email: 'fixture@example.invalid',
  email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { erp_role: role } });
let checks = 0;
for (const candidate of [null, {}, { ...user(), id: '' },
  { ...user(), app_metadata: {}, user_metadata: { erp_role: 'owner' } },
  { ...user(), app_metadata: {}, role: 'owner' }, user('unknown'), user('OWNER'),
  user('__proto__'), user(['owner']), { ...user(), email_confirmed_at: null },
  { ...user(), deleted_at: '2026-01-01' },
  { ...user(), banned_until: '2999-01-01T00:00:00Z' }]) {
  assert.equal(erpSessionFromVerifiedUser(candidate), null); checks++;
}
for (const role of ['owner', 'staff', 'tax']) {
  assert.equal(erpSessionFromVerifiedUser(user(role)).role, role); checks++;
}
let current = user(), loginError = null, verifyError = null, verifyThrows = false;
let cleanupError = null, cleanupThrows = false, loginThrows = false;
const calls = [];
const client = { auth: {
  async signInWithPassword(input) {
    calls.push(['login', input.email]);
    if (loginThrows) throw new Error('network');
    return { data: { user: user('owner') }, error: loginError };
  },
  async getUser() {
    calls.push(['verify']);
    if (verifyThrows) throw new Error('offline');
    return { data: { user: current }, error: verifyError };
  },
  async signOut(options) {
    calls.push(['cleanup', options]);
    if (cleanupThrows) throw new Error('storage unavailable');
    return { error: cleanupError };
  },
  getSession() { throw new Error('Cached sessions must not authorize'); }
}, storage: { from(bucket) {
  assert.equal(bucket, 'import-batch-files');
  return { async createSignedUrl(path, expiry) {
    calls.push(['signed', path, expiry]);
    return { data: { signedUrl: 'https://example.invalid/signed-fixture' }, error: null };
  } };
} } };
const auth = createErpAuth(client);
const session = await auth.signIn('  fixture@example.invalid  ', 'fixture-only');
assert.equal(session.role, 'staff', 'Ignore password-login response role');
assert.deepEqual(calls.slice(0, 2), [['login', 'fixture@example.invalid'], ['verify']]);
assert.deepEqual(Object.keys(session).sort(), ['name', 'role', 'userId', 'username']); checks += 3;
current = user('tax');
assert.equal((await auth.verifiedSession()).role, 'tax'); checks++;
for (const mode of ['role-removed', 'deleted', 'invalid-token', 'offline']) {
  current = mode === 'role-removed' ? user(null) : mode === 'deleted' ? null : user();
  verifyError = mode === 'invalid-token' ? { message: 'revoked' } : null;
  verifyThrows = mode === 'offline';
  assert.equal(await auth.verifiedSession(), null);
  assert.deepEqual(calls.at(-1), ['cleanup', { scope: 'local' }]); checks += 2;
}
verifyThrows = false; verifyError = null; current = user(null);
await assert.rejects(auth.signIn('fixture@example.invalid', 'fixture-only')); checks++;
current = user(); loginError = { message: 'denied' };
await assert.rejects(auth.signIn('fixture@example.invalid', 'fixture-only'));
assert.equal(calls.at(-1)[0], 'cleanup'); checks += 2;
loginError = null; loginThrows = true;
await assert.rejects(auth.signIn('fixture@example.invalid', 'fixture-only'));
assert.equal(calls.at(-1)[0], 'cleanup'); checks += 2;
loginThrows = false;
loginError = { status: 500, message: 'private database error' };
const cleanupEvents = [];
await assert.rejects(createErpAuth(client, { onCleanupChange: value => cleanupEvents.push(value) })
  .signIn('fixture@example.invalid', 'fixture-only'), { message: LOGIN_SERVER_ERROR });
assert.deepEqual(cleanupEvents, [true, false]); checks += 2;
loginError = null;
assert.equal(await auth.createImportAttachmentUrl('batch/document.pdf'), 'https://example.invalid/signed-fixture');
assert.deepEqual(calls.at(-1), ['signed', 'batch/document.pdf', 60]); checks += 2;
for (const [path, expiry] of [['../secret', 60], ['https://external', 60], ['', 60],
  ['/absolute', 60], ['batch/file', 301], ['batch/file', 0], ['batch/file', 1.5]]) {
  await assert.rejects(auth.createImportAttachmentUrl(path, expiry)); checks++;
}
current = user(null);
await assert.rejects(auth.createImportAttachmentUrl('batch/file')); checks++;
cleanupError = { message: 'cleanup failed' };
await assert.rejects(auth.verifiedSession(), /cleanup failed/); checks++;
cleanupError = null; cleanupThrows = true;
await assert.rejects(auth.verifiedSession()); checks++;
cleanupThrows = false;
await auth.signOut();
assert.deepEqual(calls.at(-1), ['cleanup', { scope: 'local' }]); checks++;

// Structural checks only; these do not execute Postgres policies.
const sql = await readFile(new URL('../supabase/migrations/20261021_erp_access.sql', import.meta.url), 'utf8');
assert(sql.indexOf("raw_app_meta_data ->> 'erp_role' = 'owner'") < sql.indexOf('revoke '));
assert.match(sql, /lock table auth\.users in share mode/);
assert.match(sql, /security definer set search_path = ''/);
assert.match(sql, /u\.id = \(select auth\.uid\(\)\)/);
assert.match(sql, /unexpected permissive policies/);
assert.equal((sql.match(/product_no <> '__GOUKA_ERP_GLOBAL_STATE__'/g) || []).length, 3);
assert.match(sql, /create policy erp_items_delete on public\.items for delete to authenticated\s+using \(\(select erp_access\.current_role\(\)\) = 'owner'\);/);
assert.match(sql, /create policy erp_storage_delete on storage\.objects for delete to authenticated\s+using \(bucket_id in \('product-images', 'import-batch-files'\) and\s+\(select erp_access\.current_role\(\)\) = 'owner'\);/);
assert.match(sql, /CUTOVER CANDIDATE/);
assert.match(sql, /'import-batch-files', 'import-batch-files', false/);
assert.match(sql, /grant select, insert, update, delete on public\.items, public\.erp_meta to authenticated/);
assert.match(sql, /revoke all privileges \(%I\)/);
assert.match(sql.trim(), /^--[\s\S]*begin;[\s\S]*commit;$/);
assert(!sql.includes('auth.jwt(')); checks += 14;
console.log(`PASS ${checks} auth, cleanup, signed-download and SQL structural checks (offline; no database touched).`);
