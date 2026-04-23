import { by, device, element, expect, waitFor } from 'detox';

describe('browse flow', () => {
  it('browse → search → detail', async () => {
    await element(by.id('tab-categories')).tap();
    await element(by.id('categories-search')).typeText('air');

    await waitFor(element(by.id('dataset-card-air_quality')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id('dataset-card-air_quality')).tap();

    await expect(element(by.id('dataset-detail-title'))).toBeVisible();
  });
});
