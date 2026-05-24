import { mpService } from "./modules/store/payments/mercadopago.service";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    const orderId = 15; // The last order ID we found
    console.log(`Testing preference creation for Order ID: ${orderId}...`);
    
    const preference = await mpService.createPreference(orderId, false);
    
    console.log('--- PREFERENCE CREATED ---');
    console.log('ID:', (preference as any).id);
    console.log('Init Point:', (preference as any).init_point);
  } catch (e: any) {
    console.error('Error creating preference:', e.message);
    if (e.response) {
        console.error('Response data:', JSON.stringify(e.response.data, null, 2));
    }
  }
}

run();
