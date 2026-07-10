import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

export async function POST(req) {
  try {
    const body = await req.json();
    const { bankTranId, amount, txnId } = body;

    if (!bankTranId || !amount || !txnId) {
      return NextResponse.json({ success: false, error: 'Missing refund parameters (bankTranId, amount, txnId)' }, { status: 400 });
    }

    const data = {
      refund_amount: parseFloat(amount),
      refund_remarks: 'Customer Request',
      bank_tran_id: bankTranId,
      refe_id: txnId,
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.initiateRefund(data);

    if (apiResponse && apiResponse.status === 'success') {
      return NextResponse.json({ success: true, details: apiResponse });
    } else {
      console.error('SSLCommerz refund error response:', apiResponse);
      return NextResponse.json({ success: false, error: apiResponse.errorReason || 'Refund initiation failed' });
    }
  } catch (error) {
    console.error('Refund initiation exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
