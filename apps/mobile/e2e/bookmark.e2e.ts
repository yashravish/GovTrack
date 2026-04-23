import { by, device, element, expect, waitFor } from 'detox';

describe('bookmark flow', () => {
  it('bookmark persists across relaunch', async () => {
    await element(by.id('tab-categories')).tap();
    await element(by.id('categories-search')).typeText('air');

    await waitFor(element(by.id('dataset-card-air_quality')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id('dataset-card-air_quality')).tap();
    await waitFor(element(by.id('dataset-detail-title')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id('bookmark-button')).tap();

    await element(by.id('tab-saved')).tap();
    await waitFor(element(by.id('saved-dataset-card-air_quality')))
      .toBeVisible()
      .withTimeout(15000);

    await device.launchApp({ newInstance: true });
    await element(by.id('tab-saved')).tap();
    await waitFor(element(by.id('saved-dataset-card-air_quality')))
      .toBeVisible()
      .withTimeout(15000);
  });
});
