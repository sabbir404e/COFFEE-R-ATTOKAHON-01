import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const tran_id = formData.get('tran_id');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/payment/callback?status=fail&tran_id=${tran_id || ''}`, 303);
  } catch (error) {
    console.error('SSLCommerz Fail POST Callback Exception:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/payment/callback?status=fail`, 303);
  }
}
