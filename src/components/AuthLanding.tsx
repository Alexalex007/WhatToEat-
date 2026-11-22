import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Sparkles, Users, Utensils } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { ResilientImage } from './ResilientImage';

interface AuthLandingProps {
  onEnterDemoMode: () => void;
  hasPendingJoinCode?: string | null;
}

export function AuthLanding({ onEnterDemoMode, hasPendingJoinCode }: AuthLandingProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || '';
      const rawMsg = (error as { message?: string })?.message || '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('你已取消 Google 登入視窗。');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('瀏覽器封鎖咗彈出視窗，請允許本網站彈出視窗後再按一次「Google 帳號一鍵登入」。');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          `目前網域（${host}）尚未加入 Firebase Authentication 的「已授權網域」，請到 Firebase Console → Authentication → Settings → 已授權網域 新增此網域。`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('此 Firebase 專案尚未啟用 Google 登入，請到 Firebase Console → Authentication → 登入方式 啟用 Google。');
      } else {
        setErrorMsg(
          `Google 登入失敗（${code || 'unknown'}）：${rawMsg || '請確認瀏覽器允許第三方 Cookie 及彈出視窗。'}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('請填寫電郵地址同密碼。');
      return;
    }

    if (authMode === 'register' && !displayName.trim()) {
      setErrorMsg('請輸入你嘅暱稱（朋友喺飯局入面會見到）。');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('密碼最少需要 6 個字元。');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(cred.user, {
          displayName: displayName.trim().slice(0, 40),
        });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code || '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMsg('電郵或密碼唔正確，請檢查後再試。');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('呢個電郵已經註冊咗，請直接切換去「登入」。');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('電郵格式唔正確。');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          '目前專案未喺 Firebase Console 啟用「電子郵件/密碼」登入（系統預設只啟用 Google 登入）。請改按上方「使用 Google 帳號一鍵登入」，或到 Firebase Console → Authentication → 登入方式 啟用「電子郵件/密碼」。'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          `目前網域（${host}）尚未加入 Firebase Authentication 的「已授權網域」，請先新增後再登入。`
        );
      } else {
        setErrorMsg(`登入失敗（${code || 'unknown'}），請稍後再試。`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col">
      <header className="w-full border-b border-[#E7E2DA] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E85D3F] text-white flex items-center justify-center shadow-sm">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-[#1C1917]">
                今日食咩好？
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-[#6B6560]">
                多人聚餐決策輪盤 × AI 救場
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onEnterDemoMode}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E7E2DA] bg-white hover:bg-[#FAF8F5] text-xs sm:text-sm font-medium text-[#1C1917] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#E85D3F]" />
            <span>免登入即試 Demo</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left editorial hero */}
        <div className="lg:col-span-6 space-y-6">
          {hasPendingJoinCode && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#92400E] text-sm font-medium">
              <Users className="w-4 h-4 shrink-0" />
              <span>你收到朋友飯局邀請（房間號碼：{hasPendingJoinCode}），登入後即刻入房！</span>
            </div>
          )}

          <div className="space-y-3">
            <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.12] tracking-tight text-[#1C1917]">
              約齊人仲講「隨便」？
              <br />
              <span className="text-[#E85D3F]">轉一轉</span>就拍板開餐。
            </h1>
            <p className="text-base sm:text-lg text-[#6B6560] leading-relaxed max-w-xl">
              每人入房揀好平時最愛同今日禁忌（食清淡啲、唔食辣、唔想煎炸），先用幸運大輪盤一秒抽籤；再揀唔到就交俾 AI 和事佬拆解口味矛盾，直接喺地圖搵高評分餐廳同行過去！
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl overflow-hidden border border-[#E7E2DA] bg-white shadow-sm">
              <ResilientImage
                src="/src/assets/images/cuisine_sushi_1795336576460.jpg"
                alt="壽司"
                className="w-full h-24 sm:h-28 object-cover"
              />
              <div className="px-3 py-2 text-xs font-semibold text-[#1C1917]">壽司 / 日本菜</div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#E7E2DA] bg-white shadow-sm">
              <ResilientImage
                src="/src/assets/images/cuisine_ramen_1795336576344.jpg"
                alt="拉麵"
                className="w-full h-24 sm:h-28 object-cover"
              />
              <div className="px-3 py-2 text-xs font-semibold text-[#1C1917]">拉麵 / 湯水</div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#E7E2DA] bg-white shadow-sm">
              <ResilientImage
                src="/src/assets/images/cuisine_yakiniku_1795336576536.jpg"
                alt="燒肉"
                className="w-full h-24 sm:h-28 object-cover"
              />
              <div className="px-3 py-2 text-xs font-semibold text-[#1C1917]">燒肉 / 打邊爐</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-white border border-[#E7E2DA] rounded-2xl p-4">
              <div className="text-xs font-semibold text-[#E85D3F] mb-1">01 · 即時同步房間</div>
              <div className="text-sm font-medium text-[#1C1917]">6 位數字房間碼</div>
              <p className="text-xs text-[#6B6560] mt-1">一鍵分享去 WhatsApp / Telegram 叫朋友入房</p>
            </div>
            <div className="bg-white border border-[#E7E2DA] rounded-2xl p-4">
              <div className="text-xs font-semibold text-[#E85D3F] mb-1">02 · 輪盤 × AI 救場</div>
              <div className="text-sm font-medium text-[#1C1917]">自動踢走禁忌衝突</div>
              <p className="text-xs text-[#6B6560] mt-1">輪盤搞唔掂即刻交俾 AI 做和事佬拍板</p>
            </div>
            <div className="bg-white border border-[#E7E2DA] rounded-2xl p-4">
              <div className="text-xs font-semibold text-[#E85D3F] mb-1">03 · 地圖高分路線</div>
              <div className="text-sm font-medium text-[#1C1917]">只搵 4.0★+ 餐廳</div>
              <p className="text-xs text-[#6B6560] mt-1">內建互動 Google 地圖即時顯示步行時間</p>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-[#E7E2DA] rounded-3xl p-6 sm:p-8 shadow-sm max-w-md mx-auto">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#1C1917]">
                {authMode === 'login' ? '登入開始約飯' : '建立個人食飯檔案'}
              </h2>
              <p className="text-sm text-[#6B6560] mt-1">
                登入後可儲存你嘅「平時最愛美食清單」，下次入房自動勾選。
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
              )}
              <span>使用 Google 帳號一鍵登入</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E7E2DA]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#6B6560]">或使用電郵登入</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                登入
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                新用戶註冊
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                    用戶名稱
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例如：阿希 Alex"
                    maxLength={40}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">電郵地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">密碼</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="最少 6 位字元"
                    className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#6B6560] hover:text-[#1C1917] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'login' ? '電郵登入' : '註冊並進入飯局'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-[#E7E2DA]">
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE8] border border-[#E7E2DA] text-sm font-medium text-[#1C1917] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#E85D3F]" />
                <span>模擬多人測試模式（4 位虛擬香港朋友陪你試玩）</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
