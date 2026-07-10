import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID || 'coffe6a50961a8b82e';
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'coffe6a50961a8b82e@ssl';
const is_live = process.env.SSLCOMMERZ_STORE_ID ? (process.env.SSLCOMMERZ_IS_LIVE === 'true') : false;

/**
 * Internal method to query transaction details by session ID from SSLCommerz.
 * Can be imported and used by other server-side modules/endpoints.
 * 
 * @param {string} sessionkey - SSLCommerz Session Key
 * @returns {Promise<object>} API response from SSLCommerz
 */
export async function queryTransactionBySessionId(sessionkey) {
  if (!sessionkey) {
    throw new Error('sessionkey is required');
  }
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  return await sslcz.transactionQueryBySessionId({ sessionkey });
}

/**
 * GET Handler for querying transaction by session ID.
 * Expects sessionkey in search query parameters: /api/ssl-payment/transaction-query-by-session-id?sessionkey=...
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionkey = searchParams.get('sessionkey');

    if (!sessionkey) {
      return NextResponse.json({ success: false, error: 'sessionkey is required' }, { status: 400 });
    }

    const apiResponse = await queryTransactionBySessionId(sessionkey);

    return NextResponse.json({ success: true, details: apiResponse });
  } catch (error) {
    console.error('SSLCommerz Transaction query by session ID exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
