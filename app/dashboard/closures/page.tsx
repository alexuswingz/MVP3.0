'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClosuresRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/supply-chain/closures');
  }, [router]);
  return null;
}
