'use client';

import { useState } from 'react';
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
  Clock,
  Factory,
  Ship,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'doi', label: 'DOI Settings', icon: Target },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('doi');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
    <div className="space-y-6">
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
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-64 flex-shrink-0"
        >
          <div className="bg-background-secondary border border-border rounded-xl p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground-primary'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1"
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}
