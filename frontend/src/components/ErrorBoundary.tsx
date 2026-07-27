import React, { Component, ErrorInfo, ReactNode } from "react";
import { logErrorToFirebase } from "../lib/errorLogger";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    logErrorToFirebase(error, { componentStack: errorInfo.componentStack }, 'ErrorBoundary');
  }

  public render() {
    const props = (this as any).props as Props;
    if (this.state.hasError) {
      if (props.fallback) {
        return props.fallback;
      }
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
            <h1 className="text-2xl font-bold mb-4">Đã xảy ra lỗi hệ thống!</h1>
            <p className="text-slate-400 mb-6">Xin lỗi bạn vì sự gián đoạn này. Lỗi đã được ghi lại bằng hệ thống của chúng tôi.</p>
            <button 
                onClick={() => window.location.href = '/'} 
                className="bg-violet-600 hover:bg-violet-500 max-w-[200px] w-full text-white font-bold py-3 rounded-full flex items-center justify-center transition-colors"
                >
                Trở về trang chủ
            </button>
        </div>
      );
    }

    return props.children;
  }
}

export default ErrorBoundary;
