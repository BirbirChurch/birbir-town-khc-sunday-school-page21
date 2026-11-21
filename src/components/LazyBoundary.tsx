import React, { Component, ComponentType, lazy } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const lazyResetters = new Set<() => void>();

export function resetFailedLazyModules(): void {
  lazyResetters.forEach((reset) => reset());
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): ComponentType<React.ComponentProps<T>> {
  const loadWithRetry = async (): Promise<{ default: T }> => {
    const backoffMs = [250, 650, 1200];
    let lastError: unknown;
    for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (attempt < backoffMs.length) {
          await new Promise((resolve) => window.setTimeout(resolve, backoffMs[attempt]));
        }
      }
    }
    throw lastError;
  };

  let InnerLazy = lazy(loadWithRetry);
  lazyResetters.add(() => {
    InnerLazy = lazy(loadWithRetry);
  });

  const RetryableLazy: React.FC<React.ComponentProps<T>> = (props) =>
    React.createElement(InnerLazy as ComponentType<any>, props);

  return RetryableLazy;
}

interface LazyErrorBoundaryProps {
  children: React.ReactNode;
  compact?: boolean;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
  retryTick: number;
  errorMessage: string;
}

export class LazyErrorBoundary extends Component<
  LazyErrorBoundaryProps,
  LazyErrorBoundaryState
> {
  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryTick: 0,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<LazyErrorBoundaryState> {
    const message = error instanceof Error ? error.message : String(error || '');
    return {
      hasError: true,
      errorMessage: message
    };
  }

  handleRetry = () => {
    resetFailedLazyModules();
    this.setState((prev) => ({
      hasError: false,
      retryTick: prev.retryTick + 1,
      errorMessage: ''
    }));
  };

  handleReloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const compact = Boolean(this.props.compact);
      return (
        <div
          className={`bg-white border border-amber-200 rounded-2xl ${
            compact ? 'p-4' : 'p-6 sm:p-8'
          } text-center space-y-3 shadow-sm`}
        >
          <div className="mx-auto w-11 h-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              ገጹን በመጫን ላይ ጊዜያዊ መቆራረጥ አጋጥሟል
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              እባክዎ &laquo;እንደገና ሞክር&raquo; የሚለውን ይጫኑ ወይም ገጹን ያድሱ። (Temporary module loading
              interruption — please retry or reload.)
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>እንደገና ሞክር (Retry)</span>
            </button>
            <button
              type="button"
              onClick={this.handleReloadPage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <span>ገጹን አድስ (Reload)</span>
            </button>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.retryTick}>{this.props.children}</React.Fragment>;
  }
}
