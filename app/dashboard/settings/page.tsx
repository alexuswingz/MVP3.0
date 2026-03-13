'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Settings,
  Target,
  TrendingUp,
  Bell,
  User,
  Shield,
  Save,
  Check,
  Factory,
  Ship,
  ShoppingCart,
  ClipboardList,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AmazonAccountConnect } from '@/components/settings/AmazonAccountConnect';
import { WorkflowOverview, type UnsavedInfo } from '@/components/settings/WorkflowOverview';

const TABS = [
  { id: 'account', label: 'My Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'amazon', label: 'Amazon Connection', icon: ShoppingCart },
  { id: 'doi', label: 'DOI', icon: Target },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'workflow', label: 'Workflow Overview', icon: Factory, iconSrc: '/assets/workflow%20icon.png' },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'amazon');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Clear workflow unsaved panel when navigating away from workflow tab
  useEffect(() => {
    if (activeTab !== 'workflow') {
      setWorkflowUnsaved(null);
    }
  }, [activeTab]);

  const [workflowUnsaved, setWorkflowUnsaved] = useState<UnsavedInfo | null>(null);
  const [workflowSearch, setWorkflowSearch] = useState('');

  const [doiSettings, setDoiSettings] = useState({
    amazonDOIGoal: 120,
    inboundLeadTime: 30,
    manufactureLeadTime: 7,
  });

  const [forecastSettings, setForecastSettings] = useState({
    model: 'established',
    marketAdjustment: 0,
    salesVelocityAdjustment: 0,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'amazon':
        return <AmazonAccountConnect />;
        
      case 'doi':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Amazon DOI Goal</CardTitle>
                      <CardDescription>Target days of inventory</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={doiSettings.amazonDOIGoal}
                      onChange={(e) => setDoiSettings({ ...doiSettings, amazonDOIGoal: parseInt(e.target.value) || 0 })}
                      className="w-24 h-10 px-3 rounded-lg bg-background-tertiary border border-border
                               text-foreground-primary text-center font-semibold
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                               transition-all"
                    />
                    <span className="text-sm text-foreground-secondary">days</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Ship className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Inbound Lead Time</CardTitle>
                      <CardDescription>Shipping to Amazon</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={doiSettings.inboundLeadTime}
                      onChange={(e) => setDoiSettings({ ...doiSettings, inboundLeadTime: parseInt(e.target.value) || 0 })}
                      className="w-24 h-10 px-3 rounded-lg bg-background-tertiary border border-border
                               text-foreground-primary text-center font-semibold
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                               transition-all"
                    />
                    <span className="text-sm text-foreground-secondary">days</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Factory className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Manufacturing Lead Time</CardTitle>
                      <CardDescription>Production time</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={doiSettings.manufactureLeadTime}
                      onChange={(e) => setDoiSettings({ ...doiSettings, manufactureLeadTime: parseInt(e.target.value) || 0 })}
                      className="w-24 h-10 px-3 rounded-lg bg-background-tertiary border border-border
                               text-foreground-primary text-center font-semibold
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                               transition-all"
                    />
                    <span className="text-sm text-foreground-secondary">days</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                className="gap-2"
              >
                {showSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'forecast':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Forecast Model</CardTitle>
                <CardDescription>Select the forecasting algorithm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'new', label: 'New Product', description: 'Limited history' },
                    { value: 'growing', label: 'Growing', description: 'Increasing trend' },
                    { value: 'established', label: 'Established', description: 'Stable sales' },
                  ].map((model) => (
                    <button
                      key={model.value}
                      onClick={() => setForecastSettings({ ...forecastSettings, model: model.value })}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        forecastSettings.model === model.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2',
                          forecastSettings.model === model.value
                            ? 'border-primary bg-primary'
                            : 'border-foreground-muted'
                        )} />
                        <span className="font-medium text-foreground-primary">{model.label}</span>
                      </div>
                      <p className="text-sm text-foreground-secondary ml-6">{model.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Adjustment</CardTitle>
                  <CardDescription>Adjust for market conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={forecastSettings.marketAdjustment}
                      onChange={(e) => setForecastSettings({ ...forecastSettings, marketAdjustment: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer
                               accent-primary"
                    />
                    <span className={cn(
                      'w-16 text-right font-medium',
                      forecastSettings.marketAdjustment > 0 ? 'text-success' :
                      forecastSettings.marketAdjustment < 0 ? 'text-danger' : 'text-foreground-primary'
                    )}>
                      {forecastSettings.marketAdjustment > 0 ? '+' : ''}
                      {forecastSettings.marketAdjustment}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Velocity Adjustment</CardTitle>
                  <CardDescription>Fine-tune sales predictions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      value={forecastSettings.salesVelocityAdjustment}
                      onChange={(e) => setForecastSettings({ ...forecastSettings, salesVelocityAdjustment: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer
                               accent-primary"
                    />
                    <span className={cn(
                      'w-16 text-right font-medium',
                      forecastSettings.salesVelocityAdjustment > 0 ? 'text-success' :
                      forecastSettings.salesVelocityAdjustment < 0 ? 'text-danger' : 'text-foreground-primary'
                    )}>
                      {forecastSettings.salesVelocityAdjustment > 0 ? '+' : ''}
                      {forecastSettings.salesVelocityAdjustment}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                className="gap-2"
              >
                {showSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'workflow':
        return (
          <WorkflowOverview
            onUnsavedChangesChange={setWorkflowUnsaved}
            searchQuery={workflowSearch}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Settings className="w-12 h-12 text-foreground-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground-primary">Coming Soon</h3>
            <p className="text-foreground-secondary mt-1">
              This section is under development
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">Settings</h1>
          <p className="text-foreground-secondary mt-1">
            Configure your inventory management preferences
          </p>
        </div>

        {/* Global search (always visible, filters Workflow steps when on Workflow tab) */}
        <div className="flex items-center">
          <div className="relative" style={{ width: 204 }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input
              type="text"
              placeholder="Search workflow steps…"
              value={workflowSearch}
              onChange={(e) => setWorkflowSearch(e.target.value)}
              style={{
                height: 32,
                borderRadius: 6,
                border: '1px solid #334155',
                paddingLeft: 8 + 10 + 8, // icon (approx) + gap + inner padding
                paddingRight: 8,
                paddingTop: 8,
                paddingBottom: 8,
                backgroundColor: '#4B5563',
              }}
              className="w-full text-sm text-slate-50 placeholder:text-slate-300 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/40"
            />
          </div>
        </div>
      </motion.div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-[224px] flex-shrink-0 flex flex-col gap-3 lg:sticky lg:top-4 self-start"
        >
          <div
            className={cn(
              'rounded-xl p-4 border',
              'bg-[#1A2235] border-[#334155] shadow-[0_18px_45px_rgba(15,23,42,0.9)]'
            )}
          >
            <div className="space-y-2">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const iconSrc = 'iconSrc' in tab ? (tab as { iconSrc?: string }).iconSrc : undefined;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full h-8 flex items-center gap-2 px-3 rounded text-left text-sm transition-colors',
                      'text-slate-400 hover:bg-white/5 hover:text-slate-50',
                      isActive && 'bg-[#0F172A] text-slate-50'
                    )}
                  >
                    {iconSrc ? (
                      <img
                        src={iconSrc}
                        alt=""
                        className={cn('w-4 h-4 flex-shrink-0 object-contain', isActive ? 'opacity-100' : 'opacity-70')}
                      />
                    ) : (
                      <Icon
                        className={cn(
                          'w-4 h-4',
                          isActive ? 'text-slate-50' : 'text-slate-500'
                        )}
                      />
                    )}
                    <span className="font-medium tracking-tight">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unsaved changes panel — shown below sidebar when workflow has changes */}
          {workflowUnsaved && activeTab === 'workflow' && (
            <div className="flex flex-col gap-2">
              {/* Save Changes button */}
              <button
                onClick={workflowUnsaved.onSave}
                className="w-full flex items-center justify-center gap-[10px] rounded text-sm font-semibold text-white transition-colors"
                style={{
                  height: 31,
                  backgroundColor: '#007AFF',
                  borderRadius: 4,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0062CC')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#007AFF')}
              >
                Save Changes
              </button>

              {/* Cancel button */}
              <button
                onClick={workflowUnsaved.onCancel}
                className="w-full flex items-center justify-center gap-[10px] text-sm font-medium text-slate-300 transition-colors"
                style={{
                  height: 31,
                  borderRadius: 4,
                  backgroundColor: '#252F42',
                  border: '1px solid #334155',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2d3a52')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#252F42')}
              >
                Cancel
              </button>

              {/* Unsaved Changes info card */}
              <div
                style={{
                  backgroundColor: '#1A2235',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <p className="text-sm font-semibold text-slate-200">
                    Unsaved Changes ({workflowUnsaved.total})
                  </p>
                </div>
                <ul className="flex flex-col gap-1.5 pl-1">
                  {workflowUnsaved.sections.map(sec => (
                    <li key={sec.label} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
                      {sec.label} ({sec.count})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 min-h-0 overflow-y-auto pr-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
