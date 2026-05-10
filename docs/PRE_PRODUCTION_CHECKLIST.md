# Nexora HRMS — Pre-Production Checklist

Items that are **safe to defer in development** but **MUST** be completed before any production deployment. Owned by Team Lead; signed off by Security and Ops.

---

## Database Hardening

- [ ] **SEC-001 — Audit log append-only at DB level** (BL-047 / BL-048)
  - Create a least-privilege application DB user (e.g. `nexora_app`) — never use `root`.
  - Grant: `SELECT, INSERT, UPDATE, DELETE` on every table EXCEPT `audit_log`.
  - For `audit_log`: grant only `SELECT, INSERT`.
  - Equivalent statement (run as a DBA with `GRANT OPTION`):
    ```sql
    REVOKE UPDATE, DELETE ON nexora_hrms.audit_log FROM 'nexora_app'@'<host>';
    ```
  - Update `DATABASE_URL` in production env to use `nexora_app`, not `root`.
  - Verification: `UPDATE audit_log ...` and `DELETE FROM audit_log ...` must return `ERROR 1142` for the application user.
  - Owner: Ops + DBA. Required before any environment that handles real employee data.

- [ ] Move database off `localhost` and place behind a private network. Disable remote `root` login.
- [ ] Enable TLS for MySQL connections (`?sslaccept=strict` in `DATABASE_URL`).
- [ ] Configure automated backups + a tested restore drill.

## Secrets & Environment

- [ ] `SESSION_SECRET` regenerated per environment with `openssl rand -hex 32` and stored in the secrets manager (not in source, not in `.env` checked in anywhere).
- [ ] `NODE_ENV=production` so cookies receive the `Secure` flag.
- [ ] All `.env*` files excluded from build artefacts and CI logs.
- [ ] `MAIL_TRANSPORT=smtp` with credentials sourced from the secrets manager.
- [ ] `CORS_ORIGIN` restricted to the actual production web origin only — no wildcards, no localhost.

## TLS / Transport

- [ ] HTTPS-only at the edge (TLS 1.2+ minimum, prefer 1.3).
- [ ] HTTP requests redirect to HTTPS or return 308 immediately.
- [ ] Submit the production domain to the Chrome HSTS preload list once HSTS has been live and stable for ≥ 30 days.

## Auth Hardening

- [ ] Default admin `admin@triline.in` rotated to a fresh password (or new admin created and seeded admin disabled) before go-live.
- [ ] `LOGIN_LOCKOUT_THRESHOLD` and `LOGIN_LOCKOUT_MINUTES` reviewed for the production threat model.
- [ ] `PASSWORD_RESET_TTL_MINUTES` reviewed (default 30).
- [ ] If running behind a load balancer / proxy, set `app.set('trust proxy', N)` to the correct hop count. SEC-002 fix relies on `req.ip` reflecting the real client IP.

## Monitoring / Alerting

- [ ] `audit_log` write rate alerted on (sudden spike or sudden drop).
- [ ] `auth.login.failure` and `auth.login.lockout` rates wired to the alerting platform.
- [ ] Error rate on `5xx` responses paged at threshold.
- [ ] Synthetic check on `GET /api/v1/health`.

## Application

- [ ] Strip the prototype-only demo docks (`#nx-tod-demo`, `#nx-state-demo`) — confirm none of the production pages render them.
- [ ] Strip the `/login` page demo role chips, OR re-wire them to environment-specific seeded accounts that auto-disable in production.
- [ ] Run a full vulnerability scan (`pnpm audit`, Snyk) and resolve any High/Critical CVEs before release.
- [ ] Capture and review production rate-limit settings (login, forgot-password, expensive search/export).

## Runtime

- [ ] Process supervisor (systemd/PM2) configured with restart-on-failure.
- [ ] Log shipping configured to the central log store (pino → stdout → forwarder).
- [ ] Resource limits set (RAM, file descriptors, max concurrent connections).

---

## Tracking

| ID | Item | Severity in dev | Status | Owner | Verified |
|---|---|---|---|---|---|
| SEC-001 | Audit log REVOKE for app DB user | Crit-for-prod | Open | Ops + DBA | — |

When an item closes, append the verification evidence (timestamp + verifier name) and move it out of "Open".

---

## Phase 6 deferred items

- [ ] **Wire `auditLogId` on notifications (BUG-NOT-004 / SEC-006-P6)**
  Requires changing the `audit()` helper to return the created row's `id` and threading
  that return value through every call site (~20 across all modules). Deferred from Phase 6
  QA to Phase 7 grooming to avoid a broad cross-cutting change late in the release cycle.
