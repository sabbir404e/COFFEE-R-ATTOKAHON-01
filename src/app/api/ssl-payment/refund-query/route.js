import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID || 'coffe6a50961a8b82e';
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'coffe6a50961a8b82e@ssl';
const is_live = process.env.SSLCOMMERZ_STORE_ID ? (process.env.SSLCOMMERZ_IS_LIVE === 'true') : false;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const refund_ref_id = searchParams.get('refund_ref_id');

    if (!refund_ref_id) {
      return NextResponse.json({ success: false, error: 'refund_ref_id is required' }, { status: 400 });
    }

    const data = {
      refund_ref_id: refund_ref_id,
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.refundQuery(data);

    return NextResponse.json({ success: true, details: apiResponse });
  } catch (error) {
    console.error('Refund query exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
