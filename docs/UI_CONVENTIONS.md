# UI Conventions

Short, sharp rules for what is allowed to appear in user-facing text
across the Nexora HRMS product. Internal naming, audit-log entries,
and developer-facing source comments are out of scope — those can use
whatever vocabulary the engineer finds useful.

---

## Never show internal business-rule IDs to users

The codebase tracks every BL rule by an internal identifier such as
`BL-009`, `BL-LEAVE-PAST`, or `BL-LE-04`. These IDs are valuable for
engineers, audit logs, and the SRS — but they are noise (and look
broken) to an end user. They must never appear in user-facing
strings.

### Concretely banned in any rendered UI text:

- The literal token `BL-…` (e.g. `BL-009`, `BL-LEAVE-SAME-DAY`)
- The label `Rule:` followed by an internal identifier
- Any trailing parenthetical like `(BL-019)` at the end of an
  explanation
- The `ruleId` field on an `ApiError` rendered directly into JSX

### Allowed (and encouraged):

- `BL-…` references inside `//` and `/* */` source comments
- `BL-…` references in JSDoc / function-header docblocks
- `BL-…` references inside any `docs/*.md` file
- `BL-…` references in audit-log `action` strings and audit `before` /
  `after` JSON (the audit log is a developer / admin surface and uses
  the IDs as a tracing key)

### Server side

When throwing an `ApiError`, including a `ruleId` is fine — it's
part of the wire protocol and shows up in audit logs. But the
**frontend must not render** that field as visible text. Use the
`message`, `details`, and the `code` (e.g. `LEAVE_FROM_DATE_IN_PAST`)
to compose a human sentence in the appropriate error component.

### Why

Two reasons:

1. **The IDs aren't stable as user-visible labels.** They get
   renumbered, renamed, and merged as the SRS evolves. A user who
   memorises "the BL-019 thing" today will find that the rule has
   moved to `BL-LEAVE-CANCEL-RESTORE` tomorrow.
2. **They look like an unfinished string.** Users read `"Rule:
   BL-019"` as a missing translation or a leaked debug string, not
   a deliberate explanation.

### History

This rule was applied retroactively across the codebase on
2026-05-13 (commit `ac3c82e`, "chore(ui): remove internal BL-XXX
rule references from user-facing copy"). The only later leak was a
`Rule: {error.ruleId}` line in
`apps/web/src/components/leave/ConflictErrorBlock.tsx`, removed in a
follow-up that landed this convention doc.

If you find another leak, fix it in the same shape:

- Edit the JSX to drop the BL token.
- Write a regression spec if the surface is covered by Playwright.
- No commit needed to this doc unless the rule itself changes.

---

## Future conventions

This document will grow. Conventions added later (loading-state copy,
error-message phrasing, currency / date formatting, etc.) go below.
Keep each rule small, with a Concretely / Allowed / Why structure so
new contributors can scan and apply.
