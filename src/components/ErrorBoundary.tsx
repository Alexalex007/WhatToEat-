import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || '發生未預期的錯誤';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        if (parsed.error.includes('Quota exceeded')) {
          readable = '資料庫每日免費讀取額度已達上限，請明天再試或於 Firebase 控制台檢查配額。';
        } else if (parsed.error.includes('permission') || parsed.error.includes('Missing or insufficient')) {
          readable = `資料權限驗證失敗（${parsed.operationType || 'access'} ${parsed.path || ''}），請重新登入或確認餐桌成員權限。`;
        } else {
          readable = parsed.error;
        }
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E7E5E0] rounded-xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#FDF2F0] text-[#C93B2B] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#18181B] mb-2">頁面載入遇到問題</h2>
            <p className="text-sm text-[#64645F] leading-relaxed mb-6">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#18181B] text-white text-sm font-medium rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
