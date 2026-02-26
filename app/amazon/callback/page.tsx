'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AmazonCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    const amazonConnected = searchParams.get('amazon_connected');
    const amazonError = searchParams.get('amazon_error');
    const accountId = searchParams.get('account_id');

    if (amazonConnected === 'true') {
      setStatus('success');
      setMessage('Your Amazon seller account has been connected successfully!');
      
      // Redirect to settings after a brief moment
      setTimeout(() => {
        router.push('/dashboard/settings?tab=amazon');
      }, 2000);
    } else if (amazonError) {
      setStatus('error');
      setMessage(getErrorMessage(amazonError));
    } else {
      // If no params, might be direct visit or in-progress
      setStatus('loading');
      setMessage('Completing authorization with Amazon...');
      
      // Wait a bit then redirect if nothing happens
      setTimeout(() => {
        if (status === 'loading') {
          setStatus('error');
          setMessage('Authorization timed out. Please try again.');
        }
      }, 30000);
    }
  }, [searchParams, router, status]);

  const getErrorMessage = (code: string): string => {
    const errorMessages: Record<string, string> = {
      invalid_state: 'Your authorization session has expired. Please start the connection process again.',
      token_exchange_failed: 'We couldn\'t complete the authorization with Amazon. Please try again.',
      encryption_failed: 'A server configuration error occurred. Please contact support.',
      missing_parameters: 'Invalid authorization response received from Amazon.',
      access_denied: 'You denied access to your Amazon seller account.',
      unknown_error: 'An unexpected error occurred during authorization.',
    };
    return errorMessages[code] || 'Authorization failed. Please try again.';
  };

  const handleRetry = () => {
    router.push('/dashboard/settings?tab=amazon');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-background-secondary border border-border rounded-2xl p-8 shadow-lg">
          {/* Amazon Logo */}
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-2xl ${
              status === 'success' ? 'bg-success/10' :
              status === 'error' ? 'bg-danger/10' :
              'bg-[#FF9900]/10'
            }`}>
              {status === 'loading' && (
                <Loader2 className="w-12 h-12 text-[#FF9900] animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="w-12 h-12 text-success" />
              )}
              {status === 'error' && (
                <XCircle className="w-12 h-12 text-danger" />
              )}
            </div>
          </div>

          {/* Status Message */}
          <h1 className={`text-xl font-semibold mb-2 ${
            status === 'success' ? 'text-success' :
            status === 'error' ? 'text-danger' :
            'text-foreground-primary'
          }`}>
            {status === 'loading' && 'Connecting to Amazon'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </h1>

          <p className="text-foreground-secondary mb-6">
            {message}
          </p>

          {/* Actions */}
          {status === 'success' && (
            <div className="text-sm text-foreground-muted">
              Redirecting to settings...
            </div>
          )}

          {status === 'error' && (
            <Button onClick={handleRetry} className="w-full gap-2">
              <ShoppingCart className="w-4 h-4" />
              Try Again
            </Button>
          )}

          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Please wait...
            </div>
          )}
        </div>

        {/* Security Note */}
        <p className="mt-4 text-xs text-foreground-muted">
          Your credentials are securely encrypted and never stored in plain text.
        </p>
      </motion.div>
    </div>
  );
}
