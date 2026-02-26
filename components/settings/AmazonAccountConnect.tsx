'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Plus,
  Loader2,
  Globe,
  Package,
  Database,
  TrendingUp,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { SyncProgressToast, useSyncProgress, SyncStep } from '@/components/ui/sync-progress-toast';

interface AmazonAccount {
  id: number;
  seller_id: string;
  marketplace_id: string;
  marketplace_name: string;
  account_name: string;
  is_active: boolean;
  authorized_at: string;
  last_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  sync_error: string;
  needs_token_refresh: boolean;
}

interface Marketplace {
  id: string;
  name: string;
}

const SYNC_STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Pending' },
  syncing: { icon: RefreshCw, color: 'text-primary', bg: 'bg-primary/10', label: 'Syncing' },
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Synced' },
  failed: { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10', label: 'Failed' },
};

export function AmazonAccountConnect() {
  const [accounts, setAccounts] = useState<AmazonAccount[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState('ATVPDKIKX0DER');
  const [showMarketplaceSelector, setShowMarketplaceSelector] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<number | null>(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Sync progress toast
  const syncProgress = useSyncProgress();

  useEffect(() => {
    fetchAccounts();
    fetchMarketplaces();
    
    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const amazonConnected = params.get('amazon_connected');
    const amazonError = params.get('amazon_error');
    const accountId = params.get('account_id');
    const syncStarted = params.get('sync_started');
    
    if (amazonConnected === 'true') {
      // Refresh accounts list
      fetchAccounts().then(() => {
        // If sync was started, show progress and start polling
        if (syncStarted === 'true' && accountId) {
          syncProgress.startSync();
          syncProgress.setCurrentStep('products');
          setSyncingAccountId(parseInt(accountId));
          pollSyncStatus(parseInt(accountId));
        }
      });
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (amazonError) {
      setError(getErrorMessage(amazonError));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const getErrorMessage = (code: string): string => {
    const errorMessages: Record<string, string> = {
      invalid_state: 'Authorization session expired. Please try again.',
      token_exchange_failed: 'Failed to complete authorization. Please try again.',
      encryption_failed: 'Server configuration error. Please contact support.',
      missing_parameters: 'Invalid authorization response from Amazon.',
      unknown_error: 'An unexpected error occurred. Please try again.',
    };
    return errorMessages[code] || 'Authorization failed. Please try again.';
  };

  const fetchAccounts = async () => {
    try {
      const data = await api.getAmazonAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch Amazon accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMarketplaces = async () => {
    try {
      const data = await api.getAmazonMarketplaces();
      setMarketplaces(data);
    } catch (err) {
      console.error('Failed to fetch marketplaces:', err);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const response = await api.getAmazonAuthUrl(selectedMarketplace);
      // Open in same window to complete OAuth flow
      window.location.href = response.authorization_url;
    } catch (err) {
      console.error('Failed to get authorization URL:', err);
      setError('Failed to start authorization. Please try again.');
      setIsConnecting(false);
    }
  };

  // Poll for sync status
  const pollSyncStatus = async (accountId: number) => {
    const maxAttempts = 300; // 5 minutes max (300 * 1 second)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const status = await api.getAmazonSyncStatus(accountId);
        
        // Update progress based on backend status
        if (status.steps.products && !status.steps.inventory) {
          syncProgress.setCurrentStep('inventory');
        } else if (status.steps.inventory && !status.steps.sales) {
          syncProgress.setCurrentStep('sales');
        } else if (status.steps.sales && !status.steps.images) {
          syncProgress.setCurrentStep('images');
        }
        
        // Update individual step statuses
        if (status.steps.products) syncProgress.updateStep('products', 'completed');
        if (status.steps.inventory) syncProgress.updateStep('inventory', 'completed');
        if (status.steps.sales) syncProgress.updateStep('sales', 'completed');
        if (status.steps.images) syncProgress.updateStep('images', 'completed');
        
        // Check if sync is complete or failed
        if (status.sync_status === 'completed') {
          syncProgress.completeSync();
          setIsConnecting(false);
          setSyncingAccountId(null);
          // Refresh accounts list
          fetchAccounts();
          return;
        } else if (status.sync_status === 'failed') {
          syncProgress.failSync(status.current_step === 'idle' ? 'products' : status.current_step);
          setError(status.sync_error || 'Sync failed');
          setIsConnecting(false);
          setSyncingAccountId(null);
          return;
        }
        
        // Continue polling
        attempts++;
        if (attempts < maxAttempts && status.sync_status === 'syncing') {
          setTimeout(poll, 1000); // Poll every second
        }
      } catch (err) {
        console.error('Error polling sync status:', err);
        // Continue polling on error
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      }
    };
    
    poll();
  };

  const handleConnectSelfAuthorized = async () => {
    setIsConnecting(true);
    setError(null);
    syncProgress.startSync();
    syncProgress.setCurrentStep('products');
    
    try {
      // This will connect AND start the initial full sync
      const response = await api.connectSelfAuthorized(selectedMarketplace, 'TPS Nutrients');
      setAccounts([...accounts, response.account]);
      
      // Start polling for sync status
      pollSyncStatus(response.account.id);
      
    } catch (err: any) {
      console.error('Failed to connect account:', err);
      setError(err.message || 'Failed to connect account. Please try again.');
      syncProgress.failSync('products');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: number) => {
    setDisconnectingAccountId(accountId);
    
    try {
      await api.disconnectAmazonAccount(accountId);
      setAccounts(accounts.filter(a => a.id !== accountId));
    } catch (err) {
      console.error('Failed to disconnect account:', err);
      setError('Failed to disconnect account. Please try again.');
    } finally {
      setDisconnectingAccountId(null);
    }
  };

  const handleSync = async (accountId: number) => {
    setSyncingAccountId(accountId);
    syncProgress.startSync();
    syncProgress.setCurrentStep('products');
    
    try {
      // Start the sync (non-blocking, will run in background)
      api.syncAmazonAccount(accountId).catch(err => {
        console.error('Sync API error:', err);
      });
      
      // Update account to syncing status immediately
      setAccounts(accounts.map(a => 
        a.id === accountId ? { ...a, sync_status: 'syncing' as const } : a
      ));
      
      // Start polling for sync status
      pollSyncStatus(accountId);
      
    } catch (err) {
      console.error('Failed to trigger sync:', err);
      setError('Failed to start sync. Please try again.');
      syncProgress.failSync('products');
      setSyncingAccountId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20"
        >
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-sm text-danger flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-danger hover:text-danger/80"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wider">
            Connected Accounts
          </h3>
          
          {accounts.map((account) => {
            const statusConfig = SYNC_STATUS_CONFIG[account.sync_status];
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card key={account.id} className={cn(!account.is_active && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-[#FF9900]/10">
                        <ShoppingCart className="w-6 h-6 text-[#FF9900]" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground-primary">
                            {account.account_name || account.seller_id}
                          </h4>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            statusConfig.bg, statusConfig.color
                          )}>
                            <StatusIcon className={cn(
                              'w-3 h-3 inline mr-1',
                              account.sync_status === 'syncing' && 'animate-spin'
                            )} />
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1 text-sm text-foreground-secondary">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {account.marketplace_name}
                          </span>
                          <span>•</span>
                          <span>Last sync: {formatDate(account.last_sync_at)}</span>
                        </div>
                        
                        {account.sync_error && (
                          <p className="mt-1 text-sm text-danger">
                            {account.sync_error}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        disabled={syncingAccountId === account.id || !account.is_active}
                        className="gap-2"
                      >
                        <RefreshCw className={cn(
                          'w-4 h-4',
                          syncingAccountId === account.id && 'animate-spin'
                        )} />
                        Sync
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(account.id)}
                        disabled={disconnectingAccountId === account.id}
                        className="gap-2 text-danger hover:text-danger hover:bg-danger/10"
                      >
                        {disconnectingAccountId === account.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlink className="w-4 h-4" />
                        )}
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect New Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FF9900]/10">
              <ShoppingCart className="w-5 h-5 text-[#FF9900]" />
            </div>
            <div>
              <CardTitle className="text-base">
                {accounts.length > 0 ? 'Connect Another Account' : 'Connect Amazon Seller Account'}
              </CardTitle>
              <CardDescription>
                Link your Amazon seller account to import products and inventory
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Marketplace Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Select Marketplace
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowMarketplaceSelector(!showMarketplaceSelector)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg
                           bg-background-tertiary border border-border
                           text-foreground-primary text-left
                           hover:border-primary/30 transition-colors"
                >
                  <span>
                    {marketplaces.find(m => m.id === selectedMarketplace)?.name || 'United States'}
                  </span>
                  <Globe className="w-4 h-4 text-foreground-muted" />
                </button>
                
                {showMarketplaceSelector && (
                  <div className="absolute z-10 w-full mt-1 bg-background-secondary border border-border
                                rounded-lg shadow-lg max-h-64 overflow-auto">
                    {marketplaces.map((marketplace) => (
                      <button
                        key={marketplace.id}
                        onClick={() => {
                          setSelectedMarketplace(marketplace.id);
                          setShowMarketplaceSelector(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm transition-colors',
                          marketplace.id === selectedMarketplace
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground-primary hover:bg-background-tertiary'
                        )}
                      >
                        {marketplace.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connect Buttons */}
            <div className="space-y-3">
              {/* Option 1: OAuth Flow (for account owners) */}
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full gap-2 bg-[#FF9900] hover:bg-[#FF9900]/90"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Link via Amazon Login (Account Owners)
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background-secondary px-2 text-foreground-muted">or</span>
                </div>
              </div>

              {/* Option 2: Self-Authorized (for developers with refresh token) */}
              <Button
                onClick={handleConnectSelfAuthorized}
                disabled={isConnecting}
                variant="outline"
                className="w-full gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect with Developer Token
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-foreground-muted text-center">
              <strong>Account Owners:</strong> Use "Link via Amazon Login" to authorize.
              <br />
              <strong>Developers:</strong> Use "Developer Token" if you have a refresh token configured.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Progress Toast */}
      <SyncProgressToast
        isVisible={syncProgress.isVisible}
        steps={syncProgress.steps}
        onClose={syncProgress.hideSync}
        autoClose={true}
        autoCloseDelay={5000}
      />
    </div>
  );
}
