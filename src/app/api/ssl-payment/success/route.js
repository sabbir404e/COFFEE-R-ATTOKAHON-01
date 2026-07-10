import { NextResponse } from 'next/server';
import SSLCommerzPayment from 'sslcommerz-lts';

const store_id = process.env.SSLCOMMERZ_STORE_ID || 'coffe6a50961a8b82e';
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'coffe6a50961a8b82e@ssl';
const is_live = process.env.SSLCOMMERZ_STORE_ID ? (process.env.SSLCOMMERZ_IS_LIVE === 'true') : false;

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    // Parse fields
    const val_id = formData.get('val_id');
    const tran_id = formData.get('tran_id');
    const amount = formData.get('amount');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!val_id) {
      console.error('SSLCommerz Callback Error: val_id is missing');
      return NextResponse.redirect(`${baseUrl}/payment/callback?status=fail&tran_id=${tran_id || ''}`, 303);
    }

    // Call SSLCommerz validation API
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validationResult = await sslcz.validate({ val_id });

    if (validationResult && (validationResult.status === 'VALID' || validationResult.status === 'VALIDATED')) {
      // Payment is successfully validated server-side
      const bank_tran_id = validationResult.bank_tran_id || formData.get('bank_tran_id') || '';
      return NextResponse.redirect(
        `${baseUrl}/payment/callback?status=success&tran_id=${tran_id}&amount=${amount}&validated=true&bank_tran_id=${encodeURIComponent(bank_tran_id)}`,
        303
      );
    } else {
      console.error('SSLCommerz validation failed:', validationResult);
      return NextResponse.redirect(
        `${baseUrl}/payment/callback?status=fail&tran_id=${tran_id}`,
        303
      );
    }
  } catch (error) {
    console.error('SSLCommerz Success POST Callback Exception:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/payment/callback?status=error`, 303);
  }
}
