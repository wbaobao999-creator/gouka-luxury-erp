ERP ACCESS - FORMAL CUTOVER COMPLETED
=======================================
Updated 2026-10-21. Formal release and full access migration are now applied.
Production: https://gouka-luxury-erp.vercel.app/
Commit: 5a57427bb69c9df70ad5712a6eeb2c97b23a9abd (Vercel successful).
The user confirmed the formal URL opens. Human production sign-in/attachment
confirmation remains pending; do not equate page-open confirmation with login.
Live owner-role transaction verified read access, one rolled-back no-op update,
13 private attachments and the protected seal. Actual anonymous REST item reads
return 401; private import public URL returns 400; product image read returns 206.
Counts remain 146 item rows and 225 storage originals. No prices were changed.
First full migration attempt rolled back due to unnecessary ALTER on the managed
storage.objects table. Removed that statement and redundant managed-table GRANTs;
kept enabled RLS and existing platform grants, then applied supported policy DDL.
No managed ownership or role membership was changed or elevated.
Follow-up erp_consolidate_read_policies preserves the exact access matrix while
removing duplicate permissive SELECT evaluations. In-memory Postgres tests now
cover 115 cases, including protected data, logs, upsert, normalized tables and RLS.
Remaining Auth advisory: leaked-password detection disabled (Pro+ feature).
No paid upgrade or Auth password/configuration change was made.
The original local 5194 legacy app must no longer be used: anonymous business
access is revoked. Port 5195 is a read-only verification environment only.

The material below records implementation and the completed rollout sequence;
historical 'candidate/not deployed' statements refer to the pre-cutover phase.
Do not execute selected SQL fragments or run historical public-access scripts.

Completed
---------
- Correct Tokyo project: duaaijqbngltmlgbzrvt. Never modify the unrelated
  inactive project lkrztdewycwcqjycusay.
- Safe indexes, trigger search_paths and unnecessary public table grants fixed.
- User-created confirmed owner configured server-side; user tested actual login
  to the independent read-only preview on http://127.0.0.1:5195/.
- 146 item rows (145 products + global metadata) and all 225 storage originals
  backed up. 51,839,615 original-file bytes were re-read and checksummed.
- Separate offline restore drill reconstructed every file and data snapshot.
- Portable ERP import backup also generated from locally retained originals.
- Protected erp_company_assets table and private erp_access.current_role helper
  installed additively. Existing business RLS and bucket visibility unchanged.
- Existing company seal copied unchanged into the protected table. Anonymous
  SELECT denied by both grants and live REST API. Owner/tax read; owner write.
  Historical public copies/commits cannot be recalled by this change.

Local source and generated applications
--------------------------------------
The original source main.jsx and local port 5194 retain legacy login for now.
verification/prepare-secure-preview.mjs generates independent managed copies:
- default: work/erp-secure-preview-20261021, business mutations throw, port 5195.
- --release: work/erp-secure-release-20261021, not deployed or started for users.
Both copies remove legacy USERS/LoginPage, ignore cached local identity, accept
only server-verified owner/staff/tax, and remove the inline company seal.
Release candidate loads the seal after authorization; PDF export stops clearly
if it is unavailable. No password/token/seal is put into static source or build.
Do NOT publish the original main.jsx, its backups, outputs or fixture artifacts.
Use a reviewed explicit candidate file list, never blanket-upload this workspace.

SecureErpAccess verifies through auth.getUser, serializes operations and rechecks
focus/token events. During checks, the same identity's content stays mounted but
hidden/inert to preserve drafts. Failure/logout removes it; identity/role changes
remount a fresh subtree. This does not cancel in-flight requests or replace RLS.

lib/importAttachments.js supports both historical public-link records and saved
bucket/object paths through authorized Storage.download. New candidate uploads
store stable paths, not public/signed bearer URLs. ImportAttachmentLink downloads
original bytes as a file rather than executing uploaded documents in this app.
Complete backup uses this reader for private attachments. Existing external
HTTPS references still require the source host's CORS permission for backup.

Candidate server rules
----------------------
The entire migrations/20261021_erp_access.sql executes atomically:
- Requires a confirmed, active configured owner before any access changes.
- Uses fresh auth.users app_metadata through a private helper, never editable
  user_metadata, cached email roles or stale JWT erp_role claims.
- Removes only exact observed legacy policies; unknown permissive policies cause
  full rollback. Standard Storage DML grants are narrowed by enabled bucket RLS;
  dangerous TRUNCATE or unexpected bucket policies abort.
- Anonymous business access disabled; authenticated identities without a configured
  role cannot read/write. Owner/staff/tax read products; tax cannot write.
- Staff can insert/update ordinary products, not global state, identity changes,
  deletion/tombstones, ledger status/reason, batch links or allocated import costs.
- BEFORE trigger covers INSERT, UPDATE and upsert, memo audit aliases, immutable
  old history prefix and allowed ordinary history appends. Existing import values
  may be retained in legitimate upserts; new privileged values cannot be added.
- Server-written erp_audit_log captures actor UUID and old/new row data. Owner/tax
  may read; API roles cannot insert/update/delete logs, including owner.
- Unused normalized tables are owner-write only. Staff/tax can read the nonemployee
  tables; employees are owner-only. No anonymous alternate write path remains.
- Product images remain intentionally public-read. Owner/staff upload/replace;
  owner-only delete. Import documents become private, role-readable, owner-write.
- Role removal/ban/delete denies subsequent statements (snapshot timing applies).
  Issued signed URLs/public caches/downloads cannot be retroactively recalled.

Financial field edit access for ordinary staff is not a field-level privacy
boundary: staff reads product rows and can edit ordinary business fields. Hiding
finance columns is presentation only. Do not describe it as financial secrecy.
Admin/service-role access bypasses normal RLS; never put secret keys in a client.
Keep erp_access out of Data API exposed schemas. Live REST preflight returned
406 for that schema, 401 for anonymous seal reads, and 200 for legacy item reads
(the latter intentionally stays enabled until controlled cutover).

Verification
------------
- verification/database-access.mjs: real in-memory PostgreSQL, synthetic users,
  exact candidate SQL; role/trigger/storage/rollback/upsert tests, no live writes.
  Isolated dependency pinned in work/erp-security-harness (PGlite 0.5.10).
- verification/secure-preview.mjs --release: actual candidate App, owner/staff/tax
  on desktop/mobile, mocked APIs, save/global-write/seal/login/logout checks.
- verification/secure-preview.mjs: read-only App has zero business writes.
- verification/private-files.mjs: path safety, historical links, authorized reads.
- verification/secure-erp-access.mjs and erp-auth.mjs: auth and draft preservation.
- verification/data-integrity.mjs: save failure/pending, audit roundtrips, restore
  preflight, SHA-256 manifest, corruption/missing-file/external-reference rejection.
- verification/financial-corrections.mjs: desktop/mobile and 1050 allocation cases.
- verification/storage-recovery.mjs --verify-only and recovery-drill.mjs: original
  file checksums and independent offline reconstruction.
- verification/live-api-preflight.mjs: read-only current production status only;
  its expected legacy 200 must change to denied after full cutover.

Rollout Sequence / Remaining Follow-Up
---------------------------
1. User approval of coordinated formal login/permission cutover.
2. Check current remote source for unrelated changes. Publish only sanitized,
   reviewed release-candidate files; no old plaintext passwords, embedded seal,
   local backups, customer records, fixture data, node_modules or dist.
3. Verify deployment serves the authenticated candidate BEFORE disabling anonymous
   business access. Keep an authenticated maintenance/read-only path available.
4. Fresh schema/policy/data backup and current owner check, then apply complete
   candidate migration. Never remove unknown-policy guards just to make it pass.
5. Verify actual owner login, business access/save, private attachment read and
   denied anonymous access, then run security/performance advisors.
6. Verify configuration disables unwanted public/anonymous signups where possible;
   unconfigured users remain denied regardless of signup settings. Additional
   staff/tax accounts need explicit server-managed roles, never self-registration.
7. A failed rollout must not automatically reopen anonymous access or overwrite
   real records from a backup. Diagnose and use a controlled, approved rollback.
8. Historical frontend passwords should not be reused elsewhere; server login
   cutover invalidates their ERP meaning but cannot erase public repository history.

References
----------
Audit Growth Protection (2026-10-28)
----------------------------------
Candidate SQL: audit-log-growth-fix.sql. Deploy only while the database is
writable. Never turn off disk protection just to install this patch.
Deploy the compatible itemService.js first: duplicate UPDATEs now return no row,
and the client reads the existing authorized row to confirm success.
Existing RLS and write guards remain in force. No audit history is deleted.
New audit rows use delta_v2 before/after changes. Root global savedAt and row
updated_at alone do not count as business changes. Large strings and binary
data URLs use byte counts and MD5 fingerprints (not security signatures).
Unusually large bulk edits use summary_v2; these logs are not full backups.
Business rows, financial values and files are unchanged. Keep portable backups.
This patch does not free existing disk space: expansion or separately approved
archival/cleanup is still required when the disk is close to its limit.
After installing, run audit-log-growth.mjs and database-access.mjs offline,
inspect server function/trigger definitions, and check security advisors.

https://supabase.com/docs/reference/javascript/auth-getuser
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/storage/security/access-control
https://supabase.com/docs/guides/storage/buckets/fundamentals
