import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID || 'coffe6a50961a8b82e';
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'coffe6a50961a8b82e@ssl';
const is_live = process.env.SSLCOMMERZ_STORE_ID ? (process.env.SSLCOMMERZ_IS_LIVE === 'true') : false;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tran_id = searchParams.get('tran_id');
    const amount = searchParams.get('amount');

    if (!tran_id) {
      return NextResponse.json({ verified: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.transactionQueryByTransactionId({ tran_id: tran_id, transaction_id: tran_id });

    const noOfTrans = parseInt(apiResponse?.no_of_trans || apiResponse?.no_of_trans_found || '0');
    const hasElements = Array.isArray(apiResponse?.element) && apiResponse.element.length > 0;

    if (apiResponse && apiResponse.APIConnect === 'DONE' && (noOfTrans > 0 || hasElements)) {
      const trans = apiResponse.element[0];
      // Match transaction ID, status and check if amount matches (approximate float match)
      if (
        trans.tran_id === tran_id &&
        (trans.status === 'VALID' || trans.status === 'VALIDATED') &&
        (!amount || Math.abs(parseFloat(trans.amount) - parseFloat(amount)) < 0.1)
      ) {
        return NextResponse.json({ verified: true, details: trans });
      }
    }

    console.warn('SSLCommerz Transaction query verification failed:', apiResponse);
    return NextResponse.json({ verified: false, error: 'Payment not found or not validated' });
  } catch (error) {
    console.error('SSLCommerz verification API exception:', error);
    return NextResponse.json({ verified: false, error: error.message }, { status: 500 });
  }
}
