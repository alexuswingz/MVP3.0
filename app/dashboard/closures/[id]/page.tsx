'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUIStore } from '@/stores/ui-store';
import { ChevronLeft } from 'lucide-react';

export default function ClosureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/closures"
          className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ color: '#3B82F6' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Closures
        </Link>
      </div>
      <h1
        className="text-xl font-semibold"
        style={{ color: isDarkMode ? '#F9FAFB' : '#111827' }}
      >
        Closure details
      </h1>
      <p
        className="text-sm"
        style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }}
      >
        Closure ID: {params.id} — detail view coming soon.
      </p>
    </div>
  );
}
