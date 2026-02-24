import React from 'react';
import { useTheme } from '@/context/ThemeContext';

const SummaryCards = ({ values }) => {
  const { isDarkMode } = useTheme();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      <div style={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', borderRadius: '8px', border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB', borderTop: '3px solid #10B981', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Active Vine Products</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#111827' }}>{values.activeVineProducts.toLocaleString()}</div>
        <div style={{ fontSize: '12px', fontWeight: 400, color: '#10B981' }}>Across all products</div>
      </div>

      <div style={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', borderRadius: '8px', border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB', borderTop: '3px solid #F59E0B', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Total Units Claimed</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#111827' }}>{values.totalUnitsClaimed.toLocaleString()}</div>
        <div style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Across all products</div>
      </div>

      <div style={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', borderRadius: '8px', border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB', borderTop: '3px solid #06B6D4', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Recent Claims</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#111827' }}>{values.recentClaims.toLocaleString()}</div>
        <div style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Last 7 Days</div>
      </div>

      <div style={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', borderRadius: '8px', border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB', borderTop: '3px solid #EF4444', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Claim Rate</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#111827' }}>{values.claimRate}%</div>
        <div style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>All time</div>
      </div>
    </div>
  );
};

export default SummaryCards;
