import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID || 'coffe6a50961a8b82e';
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'coffe6a50961a8b82e@ssl';
const is_live = process.env.SSLCOMMERZ_STORE_ID ? (process.env.SSLCOMMERZ_IS_LIVE === 'true') : false;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const val_id = formData.get('val_id');
    const tran_id = formData.get('tran_id');
    const status = formData.get('status');

    console.log(`[IPN Received] TranId: ${tran_id}, ValId: ${val_id}, Status: ${status}`);

    if (val_id && status === 'VALID') {
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      const validationResult = await sslcz.validate({ val_id });
      console.log('[IPN Validation Result]:', validationResult.status);
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('[IPN Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
