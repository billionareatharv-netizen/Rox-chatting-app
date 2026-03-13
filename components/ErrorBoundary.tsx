import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let details = "";

      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = "You don't have permission to perform this action.";
          details = `Operation: ${parsedError.operationType} on ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0f0f0f]">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-xl border border-black/5 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">error</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2 dark:text-white">Oops!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{errorMessage}</p>
            {details && (
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-6 bg-slate-50 dark:bg-black/20 p-3 rounded-xl">
                {details}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full h-12 bg-primary text-white rounded-2xl font-bold tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
