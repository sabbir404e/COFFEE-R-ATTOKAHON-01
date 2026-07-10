import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID || 'coffe6a50961a8b82e';
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'coffe6a50961a8b82e@ssl';
const is_live = process.env.SSLCOMMERZ_STORE_ID ? (process.env.SSLCOMMERZ_IS_LIVE === 'true') : false;

export async function POST(req) {
  try {
    const body = await req.json();
    const { amount, tableNum } = body;

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const tran_id = 'TXN' + Date.now().toString(36).toUpperCase() + Math.floor(100 + Math.random() * 900);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const data = {
      total_amount: parseFloat(amount),
      currency: 'BDT',
      tran_id: tran_id,
      success_url: `${baseUrl}/api/ssl-payment/success`,
      fail_url: `${baseUrl}/api/ssl-payment/fail`,
      cancel_url: `${baseUrl}/api/ssl-payment/cancel`,
      ipn_url: `${baseUrl}/api/ssl-payment/ipn`,
      shipping_method: 'NO',
      product_name: 'Coffee & Snacks',
      product_category: 'Food & Beverage',
      product_profile: 'non-physical-goods',
      cus_name: tableNum ? `Table ${tableNum}` : 'Walk-in Customer',
      cus_email: 'customer@coffee-r-attokahon.com',
      cus_add1: 'Dhaka',
      cus_add2: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      cus_fax: '01700000000',
      ship_name: tableNum ? `Table ${tableNum}` : 'Customer',
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    if (apiResponse && apiResponse.GatewayPageURL) {
      return NextResponse.json({ url: apiResponse.GatewayPageURL, tranId: tran_id });
    } else {
      console.error('SSLCommerz init response error:', JSON.stringify(apiResponse, null, 2));
      return NextResponse.json({ error: apiResponse?.failedreason || apiResponse?.status || 'Failed to initialize payment gateway', debug: apiResponse }, { status: 500 });
    }
  } catch (error) {
    console.error('Payment initiation exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
