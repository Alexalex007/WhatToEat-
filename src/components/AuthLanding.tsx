import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Users, Utensils } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';

export type PendingAnonymousAction =
  | { type: 'join'; code: string; nickname: string }
  | { type: 'create'; roomName: string; nickname: string };

interface AuthLandingProps {
  hasPendingJoinCode?: string | null;
  onPrepareAnonymousAction: (action: PendingAnonymousAction | null) => void;
}

export function AuthLanding({
  hasPendingJoinCode,
  onPrepareAnonymousAction,
}: AuthLandingProps) {
  const [activeCard, setActiveCard] = useState<'login' | 'instant'>(
    hasPendingJoinCode ? 'instant' : 'login'
  );
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [guestNickname, setGuestNickname] = useState('');
  const [guestRoomCode, setGuestRoomCode] = useState(hasPendingJoinCode || '');
  const [guestNewRoomName, setGuestNewRoomName] = useState('今日飯局');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    onPrepareAnonymousAction(null);
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
        setErrorMsg('瀏覽器封鎖咗彈出視窗，請允許彈出視窗後再試。');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(
          `目前網域（${host}）尚未加入 Firebase Console → Authentication → Settings → 已授權網域。`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('請到 Firebase Console → Authentication → 登入方式 啟用 Google 登入。');
      } else {
        setErrorMsg(`Google 登入失敗（${code || 'unknown'}）：${rawMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    onPrepareAnonymousAction(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('請填寫電郵同密碼。');
      return;
    }

    if (authMode === 'register' && !displayName.trim()) {
      setErrorMsg('請輸入暱稱。');
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
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrorMsg('電郵或密碼唔正確。');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('呢個電郵已經註冊咗，請切換去「登入」。');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('電郵格式唔正確。');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Firebase Console 尚未啟用「電子郵件/密碼」登入。請到 Firebase Console → Authentication → 登入方式 啟用，或使用 Google 登入／免登入即刻入 Group。'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(`目前網域（${host}）尚未加入 Firebase Authentication 已授權網域。`);
      } else {
        setErrorMsg(`登入失敗（${code || 'unknown'}）`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runAnonymousGroupEntry = async (action: PendingAnonymousAction) => {
    setErrorMsg(null);
    const cleanNick = guestNickname.trim().slice(0, 40);
    if (!cleanNick) {
      setErrorMsg('請先輸入你嘅暱稱，方便朋友喺房入面認得你。');
      return;
    }

    if (action.type === 'join' && !/^[A-Z0-9]{6,12}$/.test(action.code)) {
      setErrorMsg('請輸入有效嘅 6 位房間碼。');
      return;
    }

    if (action.type === 'create' && !action.roomName.trim()) {
      setErrorMsg('請輸入飯局名稱。');
      return;
    }

    onPrepareAnonymousAction(action);
    setIsLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      await updateProfile(cred.user, { displayName: cleanNick });
    } catch (error: unknown) {
      onPrepareAnonymousAction(null);
      const code = (error as { code?: string })?.code || '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        setErrorMsg(
          'Firebase 專案尚未啟用「匿名（Anonymous）」登入。請到 Firebase Console → Authentication → 登入方式 → 新增並啟用「匿名」，然後再試。'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg(`目前網域（${host}）尚未加入 Firebase Authentication 已授權網域。`);
      } else {
        setErrorMsg(`免登入進入失敗（${code || 'unknown'}）`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      <header className="w-full border-b border-black/[0.08] bg-white/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shadow-[0_1px_3px_rgba(0,113,227,0.3)]">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-[#1D1D1F]">
              今日食咩好？
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {hasPendingJoinCode && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/40 text-[#92400E] text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            <span>收到飯局邀請（房間碼：{hasPendingJoinCode}）</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mobile Mode Switcher with Smooth Slider */}
        <div className="relative grid grid-cols-2 p-1 bg-[#E8E8ED]/80 rounded-xl border border-black/[0.06] mb-6 md:hidden overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setActiveCard('login');
              setErrorMsg(null);
            }}
            className={`apple-btn relative min-h-[42px] py-2 text-sm font-semibold rounded-[9px] cursor-pointer z-10 ${
              activeCard === 'login' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
            }`}
          >
            {activeCard === 'login' && (
              <motion.span
                layoutId="auth-card-pill"
                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
              />
            )}
            <span>登入</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCard('instant');
              setErrorMsg(null);
            }}
            className={`apple-btn relative min-h-[42px] py-2 text-sm font-semibold rounded-[9px] cursor-pointer z-10 ${
              activeCard === 'instant' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
            }`}
          >
            {activeCard === 'instant' && (
              <motion.span
                layoutId="auth-card-pill"
                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
              />
            )}
            <span>免登入即刻入 Group</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Card 1: Login */}
          <section
            className={`bg-white border border-black/[0.08] rounded-[22px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5 ${
              activeCard === 'login' ? 'block' : 'hidden md:block'
            }`}
          >
            <h1 className="font-display text-2xl font-bold text-[#1D1D1F]">登入</h1>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="apple-btn w-full min-h-[46px] px-4 py-3 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white font-semibold text-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
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
              <span>Google 帳號登入</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#6E6E73]">或使用電郵</span>
              </div>
            </div>

            <div className="relative grid grid-cols-2 p-1 bg-[#E8E8ED]/80 rounded-xl border border-black/[0.06] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg(null);
                }}
                className={`apple-btn relative min-h-[38px] py-1.5 text-sm font-semibold rounded-[9px] cursor-pointer z-10 ${
                  authMode === 'login' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                }`}
              >
                {authMode === 'login' && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                  />
                )}
                <span>登入</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg(null);
                }}
                className={`apple-btn relative min-h-[38px] py-1.5 text-sm font-semibold rounded-[9px] cursor-pointer z-10 ${
                  authMode === 'register' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                }`}
              >
                {authMode === 'register' && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                  />
                )}
                <span>註冊</span>
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">暱稱</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例如：阿希"
                    maxLength={40}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">電郵</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">密碼</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="最少 6 位"
                    className="w-full min-h-[44px] px-3.5 py-2 pr-11 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                    className="apple-btn absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#6E6E73] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="apple-btn w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'login' ? '電郵登入' : '註冊並登入'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Card 2: No-Login Instant Group Entry */}
          <section
            className={`bg-white border border-black/[0.08] rounded-[22px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5 ${
              activeCard === 'instant' ? 'block' : 'hidden md:block'
            }`}
          >
            <h2 className="font-display text-2xl font-bold text-[#1D1D1F]">
              免登入即刻入 Group
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                你嘅暱稱
              </label>
              <input
                type="text"
                value={guestNickname}
                onChange={(e) => setGuestNickname(e.target.value)}
                placeholder="例如：阿希"
                maxLength={40}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm transition-colors"
              />
            </div>

            {/* Join existing room */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runAnonymousGroupEntry({
                  type: 'join',
                  code: guestRoomCode.trim().toUpperCase(),
                  nickname: guestNickname.trim(),
                });
              }}
              className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2.5"
            >
              <label className="block text-xs font-semibold text-[#1D1D1F]">
                入朋友房間（輸入 6 位房間碼）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestRoomCode}
                  onChange={(e) => setGuestRoomCode(e.target.value.toUpperCase())}
                  placeholder="6 位房間碼"
                  maxLength={12}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-white focus:outline-none focus:border-[#0071E3] font-mono-tabular text-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="apple-btn min-h-[44px] px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>即刻入房</span>}
                </button>
              </div>
            </form>

            {/* Create new room without login */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runAnonymousGroupEntry({
                  type: 'create',
                  roomName: guestNewRoomName.trim() || '今日飯局',
                  nickname: guestNickname.trim(),
                });
              }}
              className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2.5"
            >
              <label className="block text-xs font-semibold text-[#1D1D1F]">
                或者開新飯局房間
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestNewRoomName}
                  onChange={(e) => setGuestNewRoomName(e.target.value)}
                  placeholder="飯局名稱"
                  maxLength={60}
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-white focus:outline-none focus:border-[#0071E3] text-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="apple-btn min-h-[44px] px-4 py-2 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>開新房</span>}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
