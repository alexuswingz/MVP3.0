'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Package, Database, TrendingUp, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SyncStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  icon?: React.ReactNode;
}

interface SyncProgressToastProps {
  isVisible: boolean;
  title?: string;
  steps?: SyncStep[];
  currentStep?: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const defaultSteps: SyncStep[] = [
  { id: 'products', label: 'Products', status: 'pending', icon: <Package className="w-4 h-4" /> },
  { id: 'inventory', label: 'Inventory', status: 'pending', icon: <Database className="w-4 h-4" /> },
  { id: 'sales', label: 'Sales', status: 'pending', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'images', label: 'Images', status: 'pending', icon: <Image className="w-4 h-4" /> },
];

export function SyncProgressToast({
  isVisible,
  title = 'Syncing Amazon Data',
  steps = defaultSteps,
  currentStep,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
}: SyncProgressToastProps) {
  const [internalSteps, setInternalSteps] = useState<SyncStep[]>(steps);
  
  useEffect(() => {
    if (currentStep) {
      setInternalSteps(prev => prev.map(step => {
        if (step.id === currentStep) {
          return { ...step, status: 'in_progress' };
        }
        const currentIndex = prev.findIndex(s => s.id === currentStep);
        const stepIndex = prev.findIndex(s => s.id === step.id);
        if (stepIndex < currentIndex) {
          return { ...step, status: 'completed' };
        }
        return step;
      }));
    }
  }, [currentStep]);

  useEffect(() => {
    setInternalSteps(steps);
  }, [steps]);

  const allCompleted = internalSteps.every(s => s.status === 'completed');
  const hasFailed = internalSteps.some(s => s.status === 'failed');
  const completedCount = internalSteps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedCount / internalSteps.length) * 100;

  useEffect(() => {
    if (autoClose && allCompleted && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, autoClose, autoCloseDelay, onClose]);

  const getStepIcon = (step: SyncStep) => {
    switch (step.status) {
      case 'in_progress':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return step.icon || <div className="w-4 h-4 rounded-full border-2 border-border" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100]"
        >
          {/* Full-width banner */}
          <div className={cn(
            "bg-background-secondary border-b shadow-lg",
            allCompleted ? "border-success/30" : hasFailed ? "border-danger/30" : "border-primary/30"
          )}>
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Icon and Title */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    allCompleted ? "bg-success/10" : hasFailed ? "bg-danger/10" : "bg-primary/10"
                  )}>
                    {allCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : hasFailed ? (
                      <XCircle className="w-5 h-5 text-danger" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground-primary text-sm">
                      {allCompleted ? 'Sync Complete!' : hasFailed ? 'Sync Failed' : title}
                    </h4>
                    <p className="text-xs text-foreground-secondary">
                      {allCompleted 
                        ? 'All data has been synchronized' 
                        : hasFailed 
                        ? 'Some items failed to sync'
                        : 'Please wait while we fetch your data...'}
                    </p>
                  </div>
                </div>

                {/* Center: Steps */}
                <div className="flex items-center gap-6">
                  {internalSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                        step.status === 'in_progress' && "bg-primary/10",
                        step.status === 'completed' && "bg-success/10",
                        step.status === 'failed' && "bg-danger/10"
                      )}
                    >
                      {getStepIcon(step)}
                      <span className={cn(
                        "text-sm whitespace-nowrap",
                        step.status === 'pending' && "text-foreground-muted",
                        step.status === 'in_progress' && "text-primary font-medium",
                        step.status === 'completed' && "text-success",
                        step.status === 'failed' && "text-danger"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Right: Progress and Close */}
                <div className="flex items-center gap-4">
                  {!allCompleted && !hasFailed && (
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-background-tertiary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: '0%' }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-xs text-foreground-secondary">
                        {completedCount}/{internalSteps.length}
                      </span>
                    </div>
                  )}
                  
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground-primary 
                               hover:bg-background-tertiary transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Full-width progress bar at the bottom of banner */}
            {!allCompleted && !hasFailed && (
              <div className="h-1 bg-background-tertiary">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useSyncProgress() {
  const [isVisible, setIsVisible] = useState(false);
  const [steps, setSteps] = useState<SyncStep[]>(defaultSteps);

  const startSync = () => {
    setSteps(defaultSteps.map(s => ({ ...s, status: 'pending' as const })));
    setIsVisible(true);
  };

  const updateStep = (stepId: string, status: SyncStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const setCurrentStep = (stepId: string) => {
    setSteps(prev => prev.map((step, index) => {
      const currentIndex = prev.findIndex(s => s.id === stepId);
      if (index < currentIndex) {
        return { ...step, status: 'completed' as const };
      }
      if (step.id === stepId) {
        return { ...step, status: 'in_progress' as const };
      }
      return step;
    }));
  };

  const completeSync = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
  };

  const failSync = (failedStepId?: string) => {
    if (failedStepId) {
      updateStep(failedStepId, 'failed');
    }
  };

  const hideSync = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    steps,
    startSync,
    updateStep,
    setCurrentStep,
    completeSync,
    failSync,
    hideSync,
  };
}
