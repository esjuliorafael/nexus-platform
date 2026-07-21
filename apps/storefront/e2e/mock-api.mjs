import http from 'node:http';

const port = 3999;
const raffle = {
  id: 1,
  title: 'Rifa de prueba automatizada',
  description: 'Rifa estable para verificar la transición al checkout.',
  ticketPrice: 150,
  ticketQuantity: 100,
  opportunities: 1,
  distribution: 'LINEAR',
  useZero: true,
  digits: 2,
  drawDate: '2030-12-31T18:00:00.000Z',
  image: null,
  status: 'ACTIVE',
  gallery: [],
  extraOpportunities: [],
};

const settings = {
  storefront: { storefront_status: 'LIVE' },
  modules: { raffle_enabled: '1' },
  branding: { brand_name: 'Nexus E2E' },
  shipping: {
    shipping_free_threshold_birds: '0',
    shipping_free_threshold_items: '0',
    shipping_cost_standard: '500',
    shipping_cost_extended: '900',
    shipping_base_cost_items: '250',
  },
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }

  if (url.pathname === '/health') {
    sendJson(response, { ok: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/raffles/1/tickets') {
    sendJson(response, {
      reserved: ['01'],
      reservationId: 'e2e-raffle-reservation',
      paymentExpiresAt: '2030-12-31T18:00:00.000Z',
      paymentMethod: 'TRANSFER',
      subtotal: 150,
      discountTotal: 0,
      total: 150,
      couponCode: null,
    });
    return;
  }

  const routes = new Map([
    ['/api/v1/admin/settings', settings],
    ['/api/v1/store/contacts', []],
    ['/api/v1/admin/shipping-zones/public', []],
    ['/api/v1/admin/payment-channels', []],
    ['/api/v1/store/payment-options', {
      requestedPurpose: 'RAFFLES',
      resolvedPurpose: 'MAIN',
      bank: null,
      mercadoPago: { available: false },
    }],
    ['/api/v1/mp/raffle-checkout', { available: false }],
    ['/api/v1/raffle/settings', { raffle: { raffle_release_active: '1', raffle_release_hours: '24' } }],
    ['/api/v1/raffles', [raffle]],
    ['/api/v1/raffles/1', raffle],
    ['/api/v1/raffles/1/ticket-availability', []],
    ['/api/v1/store/products/999991', {
      id: 999991,
      name: 'Producto de prueba',
      price: 1500,
      type: 'ITEM',
      stock: 10,
      active: true,
      published: true,
      saleStatus: 'AVAILABLE',
    }],
  ]);

  if (routes.has(url.pathname)) {
    sendJson(response, routes.get(url.pathname));
    return;
  }

  if (url.pathname === '/api/v1/raffles/1/ticket-availability/events') {
    response.writeHead(204).end();
    return;
  }

  sendJson(response, { message: 'Not found' }, 404);
});

server.listen(port, '127.0.0.1');

function sendJson(response, body, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
