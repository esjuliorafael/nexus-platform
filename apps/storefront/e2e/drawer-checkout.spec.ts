import { expect, test, type Page } from '@playwright/test';

const cartFixture = {
  state: {
    items: [{
      productId: 999991,
      name: 'Producto de prueba',
      price: 1500,
      quantity: 1,
      thumbnail: null,
      type: 'item',
    }],
    coupon: null,
  },
  version: 0,
};

test.describe('Storefront drawers', () => {
  test('behaves as an accessible modal and restores focus', async ({ page }) => {
    await prepareCart(page);

    const opener = getCartOpener(page);
    await opener.click();

    const dialog = page.getByRole('dialog', { name: 'Mi carrito' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect.poll(() => page.evaluate(() => (
      document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false
    ))).toBe(true);

    const focusableControls = dialog.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible');
    const controlCount = await focusableControls.count();
    expect(controlCount).toBeGreaterThan(1);

    const firstControl = focusableControls.nth(0);
    const lastControl = focusableControls.nth(controlCount - 1);
    await lastControl.focus();
    await page.keyboard.press('Tab');
    await expect(firstControl).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('uses a non-spatial transition when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareCart(page);

    await getCartOpener(page).click();
    const dialog = page.getByRole('dialog', { name: 'Mi carrito' });

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-reduced-motion', 'true');
    await expect(dialog).toHaveCSS('transform', 'none');
  });

  test('keeps the cart drawer until checkout is ready and never exposes the footer', async ({ page }) => {
    await prepareCart(page);
    await makeSourcePageDeep(page);

    await getCartOpener(page).click();
    const dialog = page.getByRole('dialog', { name: 'Mi carrito' });
    await expect(dialog).toBeVisible();
    await startFooterExposureMonitor(page);
    await delayCheckoutRoute(page, '/checkout');

    await page.getByRole('button', { name: 'Finalizar pedido' }).click();
    await page.waitForTimeout(200);
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('storefront-drawer-backdrop')).toBeVisible();

    await page.waitForURL('**/checkout');
    await expect(page.getByRole('heading', { name: 'Método de entrega' })).toBeVisible();
    await expect(dialog).toBeHidden();

    await expectCheckoutAtTopWithoutFooter(page);
  });

  test('keeps the raffle drawer until its checkout is ready and never exposes the footer', async ({ page }) => {
    await page.goto('/raffles/1');
    await page.getByRole('button', { name: '01', exact: true }).click();
    await makeSourcePageDeep(page);

    await page.locator('[data-testid="raffle-selection-trigger"]:visible').first().click();

    const dialog = page.getByRole('dialog', { name: 'Mi selección' });
    await expect(dialog).toBeVisible();
    await startFooterExposureMonitor(page);
    await delayCheckoutRoute(page, '/raffles/1/checkout');

    await page.getByRole('button', { name: 'Finalizar apartado' }).click();
    await page.waitForTimeout(200);
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('storefront-drawer-backdrop')).toBeVisible();

    await page.waitForURL('**/raffles/1/checkout');
    await expect(page.getByRole('heading', { name: 'Datos del participante' })).toBeVisible();
    await expect(dialog).toBeHidden();

    await expectCheckoutAtTopWithoutFooter(page);
  });

  test('keeps the raffle checkout context after a transfer reservation', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('nexus_raffle_checkout_draft', JSON.stringify({
        raffleId: 1,
        tickets: ['01'],
        coupon: null,
      }));
    });
    await page.goto('/raffles/1/checkout');

    await page.getByLabel('Nombre completo').fill('Rafael Escamilla');
    await page.getByLabel('WhatsApp o teléfono').fill('2461234567');

    if (testInfo.project.name === 'mobile-chromium') {
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByRole('button', { name: 'Finalizar apartado', exact: true }).click();
    } else {
      await page.getByTestId('raffle-checkout-submit').click();
    }

    await expect(page).toHaveURL(/\/raffles\/1\/checkout$/);
    await expect(page.getByRole('heading', { name: 'Gracias, Rafael' })).toBeVisible();
    await expect(page.getByText('Tu selección quedó apartada correctamente. Completa el pago dentro del plazo para confirmar tu participación.')).toBeVisible();
    await expect(page.getByText('Te enviamos las instrucciones y los datos bancarios para completar el pago.')).toBeVisible();

    if (testInfo.project.name === 'mobile-chromium') {
      await expect(page.getByText('Estado')).toBeVisible();
      await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Volver a la rifa', exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Mi selección' })).toBeVisible();
      await expect(page.getByRole('status').getByText('Apartado confirmado', { exact: true })).toBeVisible();
    }
  });
});

async function prepareCart(page: Page) {
  await page.addInitScript((cart) => {
    window.localStorage.setItem('nexus_cart', JSON.stringify(cart));
  }, cartFixture);
  await page.goto('/contact');
  await expect(getCartOpener(page)).toBeVisible();
}

async function makeSourcePageDeep(page: Page) {
  await page.evaluate(() => {
    document.body.style.minHeight = '2600px';
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

function getCartOpener(page: Page) {
  return page.getByRole('button', { name: /^(Abrir carrito|Carrito)$/ });
}

async function delayCheckoutRoute(page: Page, targetPath: string) {
  const warmupResponse = await page.request.get(targetPath);
  expect(warmupResponse.ok()).toBe(true);

  await page.route(`**${targetPath}*`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === targetPath) await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
}

async function startFooterExposureMonitor(page: Page) {
  await page.evaluate(() => {
    const state = { exposed: false, timer: 0 };
    state.timer = window.setInterval(() => {
      const footer = document.querySelector('footer');
      if (!footer) return;

      const rect = footer.getBoundingClientRect();
      const footerIntersectsViewport = rect.top < window.innerHeight && rect.bottom > 0;
      const drawerIsPresent = Boolean(document.querySelector('[data-testid="storefront-drawer"]'));
      const backdropIsPresent = Boolean(document.querySelector('[data-testid="storefront-drawer-backdrop"]'));

      if (footerIntersectsViewport && !drawerIsPresent && !backdropIsPresent) state.exposed = true;
    }, 16);
    (window as Window & { __drawerFooterMonitor?: typeof state }).__drawerFooterMonitor = state;
  });
}

async function expectCheckoutAtTopWithoutFooter(page: Page) {
  const result = await page.evaluate(() => {
    const monitor = (window as Window & {
      __drawerFooterMonitor?: { exposed: boolean; timer: number };
    }).__drawerFooterMonitor;
    if (monitor) window.clearInterval(monitor.timer);

    const footer = document.querySelector('footer');
    const footerRect = footer?.getBoundingClientRect();

    return {
      scrollY: window.scrollY,
      bodyPosition: document.body.style.position,
      footerExposed: monitor?.exposed ?? false,
      footerInViewport: Boolean(footerRect && footerRect.top < window.innerHeight && footerRect.bottom > 0),
    };
  });

  expect(result.scrollY).toBe(0);
  expect(result.bodyPosition).not.toBe('fixed');
  expect(result.footerExposed).toBe(false);
  expect(result.footerInViewport).toBe(false);
}
