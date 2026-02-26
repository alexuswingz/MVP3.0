'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AmazonSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page with amazon tab
    router.replace('/dashboard/settings?tab=amazon');
  }, [router]);

  return null;
}
