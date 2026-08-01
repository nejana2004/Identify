import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-[#9CA3AF]">Loading checkout...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}