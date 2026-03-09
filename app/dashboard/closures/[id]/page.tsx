'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ClosureDetailRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  useEffect(() => {
    if (id) router.replace(`/dashboard/supply-chain/closures/${id}`);
  }, [router, id]);
  return null;
}
