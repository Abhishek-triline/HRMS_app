import { type Page, expect } from '@playwright/test';
import { CREDS, type Role } from '../utils/credentials';

/**
 * LoginPage — Page Object for /login.
 *
 * Selectors prefer accessible roles + labels over CSS to survive UI
 * refactors. The Sign-in button carries id="nx-login-submit" as a
 * stable anchor; the email/password fields are identified by their
 * accessible labels ("Work email" / "Password" — the latter sr-only).
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
    // The desktop layout's brand <h1> is aria-hidden; the form card uses
    // an <h2>Welcome back</h2>. Assert on that — or the email input, which
    // is the surface every viewport renders.
    await expect(this.page.getByLabel('Work email')).toBeVisible();
  }

  async submit(email: string, password: string) {
    // The form sets two "Password" labels (a visible <label htmlFor> plus an
    // sr-only label inside the Input component), so getByLabel resolves
    // ambiguously. The inputs have stable IDs — use those.
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    // The login card lives inside .animate-float — even with
    // reducedMotion=reduce, the keyframes can leave it briefly mid-tween
    // when the page first hydrates. Force the click; the button itself is
    // semantically fine (visible, enabled).
    await this.page.locator('#nx-login-submit').click({ force: true });
  }

  async loginAs(role: Role) {
    await this.goto();
    const c = CREDS[role];
    await this.submit(c.email, c.password);
    await this.page.waitForURL(new RegExp(`^.*${c.dashboardPath}.*$`), { timeout: 15_000 });
  }

  /** Use to assert a login failure path — no nav, error message visible. */
  async expectError(text: RegExp | string) {
    await expect(this.page.getByRole('alert')).toContainText(text);
    await expect(this.page).toHaveURL(/\/login/);
  }
}
