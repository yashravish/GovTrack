import { by, device, element, expect, waitFor } from 'detox';

const BASE_URL = process.env.E2E_API_URL ?? 'http://10.0.2.2:8080';

async function lastToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/_test/last_token`, { method: 'POST' });
  if (!res.ok) throw new Error(`last_token_failed_${res.status}`);
  const json = (await res.json()) as { token: string };
  return json.token;
}

describe('auth flow', () => {
  it('magic-link sign-in via deep link', async () => {
    await element(by.id('tab-profile')).tap();
    await element(by.id('profile-email-input')).typeText('e2e@example.com');
    await element(by.id('profile-send-link')).tap();

    await waitFor(element(by.id('profile-check-email')))
      .toBeVisible()
      .withTimeout(15000);

    const token = await lastToken();
    await device.openURL({ url: `govtrack://auth?token=${encodeURIComponent(token)}` });

    await element(by.id('tab-profile')).tap();
    await waitFor(element(by.id('profile-signed-in')))
      .toBeVisible()
      .withTimeout(15000);
  });
});
