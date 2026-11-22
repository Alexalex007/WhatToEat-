import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Loader2, Sparkles } from 'lucide-react';
import { AuthLanding } from './components/AuthLanding';
import { DecisionArena } from './components/DecisionArena';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RestaurantMapPanel } from './components/RestaurantMapPanel';
import { RoomLobbyPanel } from './components/RoomLobbyPanel';
import { ThreeTierFoodSelector } from './components/ThreeTierFoodSelector';
import { TodayFilterPanel } from './components/TodayFilterPanel';
import { AppTabId, TopNav } from './components/TopNav';
import { DEMO_FRIENDS } from './data/hkFoods';
import { auth } from './lib/firebase';
import {
  createDiningRoom,
  ensureUserAndDefaultRoom,
  joinRoomByCode,
  saveBaselineFavorites,
  subscribeRoom,
  subscribeRoomMembers,
  subscribeRoomSession,
  subscribeUserMemberships,
  subscribeUserProfile,
  syncRoomSession,
  updateMyRoomPreferences,
} from './services/roomService';
import {
  Board,
  BoardMember,
  DemoFriendProfile,
  PriceTier,
  RoomSession,
  UserProfile,
} from './types';

function MainApp() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsConfigLoaded, setMapsConfigLoaded] = useState<boolean>(
    Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  );

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<BoardMember[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [roomMembers, setRoomMembers] = useState<BoardMember[]>([]);
  const [roomSession, setRoomSession] = useState<RoomSession | null>(null);

  // Guest / Demo state
  const [guestDemoActive, setGuestDemoActive] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [guestFavorites, setGuestFavorites] = useState<string[]>([
    '松屋漢堡扒',
    '壽司',
    '越南河粉',
    '譚仔米線',
  ]);
  const [guestTodayFoods, setGuestTodayFoods] = useState<string[]>([
    '松屋漢堡扒',
    '壽司',
    '越南河粉',
    '譚仔米線',
  ]);
  const [guestMoodFilters, setGuestMoodFilters] = useState<string[]>([]);
  const [guestBudget, setGuestBudget] = useState<PriceTier>('$$');
  const [guestWalkKm, setGuestWalkKm] = useState<number>(2);
  const [guestStatus, setGuestStatus] = useState<'picking' | 'ready'>('ready');
  const [guestSession, setGuestSession] = useState<RoomSession | null>(null);

  const [activeTab, setActiveTab] = useState<AppTabId>('lobby');
  const [mapSearchKeyword, setMapSearchKeyword] = useState<string>('');
  const [showOnboardingFavs, setShowOnboardingFavs] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<string[]>([]);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const code = new URLSearchParams(window.location.search).get('join');
    return code ? code.trim().toUpperCase() : null;
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Tier 1 & Tier 2 Google Maps Quota Listener
  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Fetch runtime Google Maps API key if not in Vite build env
  useEffect(() => {
    if (mapsApiKey) {
      setMapsConfigLoaded(true);
      return;
    }
    let cancelled = false;
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: { googleMapsApiKey?: string }) => {
        if (!cancelled && data?.googleMapsApiKey) {
          setMapsApiKey(data.googleMapsApiKey);
        }
      })
      .catch(() => {
        // Handled gracefully in RestaurantMapPanel
      })
      .finally(() => {
        if (!cancelled) setMapsConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mapsApiKey]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Auth subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        setProfile(null);
        setMemberships([]);
        setActiveBoardId('');
        setActiveBoard(null);
        setRoomMembers([]);
        setRoomSession(null);
        return;
      }

      setGuestDemoActive(false);
      setBootstrapping(true);
      try {
        const loadedProfile = await ensureUserAndDefaultRoom(nextUser);
        if (!loadedProfile.favoriteFoods || loadedProfile.favoriteFoods.length === 0) {
          setOnboardingDraft([]);
          setShowOnboardingFavs(true);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : '初始化個人資料失敗');
      } finally {
        setBootstrapping(false);
      }
    });
    return () => unsub();
  }, [showToast]);

  // Subscribe user profile & memberships
  useEffect(() => {
    if (!user) return;
    const unsubProfile = subscribeUserProfile(user.uid, (p) => {
      setProfile(p);
    });
    const unsubMemberships = subscribeUserMemberships(user.uid, (list) => {
      setMemberships(list);
      setActiveBoardId((prev) => {
        if (prev && list.some((m) => m.boardId === prev)) return prev;
        return list[0]?.boardId || '';
      });
    });
    return () => {
      unsubProfile();
      unsubMemberships();
    };
  }, [user]);

  // Auto-join pending ?join=CODE link once authenticated
  useEffect(() => {
    if (!user || !pendingJoinCode || bootstrapping) return;
    let active = true;
    const code = pendingJoinCode;
    setPendingJoinCode(null);

    joinRoomByCode(user, code, profile?.favoriteFoods || [])
      .then((res) => {
        if (!active) return;
        setActiveBoardId(res.boardId);
        showToast(
          res.alreadyMember
            ? `你已經喺「${res.boardName}」房間入面啦！`
            : `成功加入「${res.boardName}」飯局！`
        );
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('join');
          window.history.replaceState({}, '', url.toString());
        }
      })
      .catch((err) => {
        if (active) {
          showToast(err instanceof Error ? err.message : '邀請連結房間無效');
        }
      });

    return () => {
      active = false;
    };
  }, [user, pendingJoinCode, bootstrapping, profile?.favoriteFoods, showToast]);

  // Subscribe active room, members, and session
  useEffect(() => {
    if (!user || !activeBoardId) {
      setActiveBoard(null);
      setRoomMembers([]);
      setRoomSession(null);
      return;
    }

    const unsubRoom = subscribeRoom(activeBoardId, setActiveBoard);
    const unsubMembers = subscribeRoomMembers(activeBoardId, setRoomMembers);
    const unsubSession = subscribeRoomSession(activeBoardId, setRoomSession);

    return () => {
      unsubRoom();
      unsubMembers();
      unsubSession();
    };
  }, [user, activeBoardId]);

  const effectiveDemoMode = guestDemoActive || demoMode;

  const myMemberRecord = useMemo(() => {
    if (guestDemoActive && !user) {
      const guestProfile: DemoFriendProfile = {
        uid: 'guest_me',
        displayName: '我 (試玩模式)',
        photoURL: '',
        favoriteFoods: guestFavorites,
        todayFoods: guestTodayFoods,
        moodFilters: guestMoodFilters,
        budgetMax: guestBudget,
        maxWalkKm: guestWalkKm,
        status: guestStatus,
      };
      return guestProfile;
    }
    return roomMembers.find((m) => m.uid === user?.uid) || null;
  }, [
    guestDemoActive,
    user,
    guestFavorites,
    guestTodayFoods,
    guestMoodFilters,
    guestBudget,
    guestWalkKm,
    guestStatus,
    roomMembers,
  ]);

  const combinedMembers = useMemo<(BoardMember | DemoFriendProfile)[]>(() => {
    const base: (BoardMember | DemoFriendProfile)[] =
      guestDemoActive && !user && myMemberRecord ? [myMemberRecord] : [...roomMembers];

    if (effectiveDemoMode) {
      const existingIds = new Set(base.map((m) => m.uid));
      for (const friend of DEMO_FRIENDS) {
        if (!existingIds.has(friend.uid)) {
          base.push(friend);
        }
      }
    }
    return base;
  }, [guestDemoActive, user, myMemberRecord, roomMembers, effectiveDemoMode]);

  const effectiveMaxWalkKm = useMemo(() => {
    if (combinedMembers.length === 0) return 2;
    const minKm = Math.min(...combinedMembers.map((m) => m.maxWalkKm || 2));
    return Math.max(1, Math.min(3, minKm));
  }, [combinedMembers]);

  const activeSession = user ? roomSession : guestSession;

  const handleSavePersonalFavorites = async (favs: string[]) => {
    if (guestDemoActive && !user) {
      setGuestFavorites(favs);
      if (guestTodayFoods.length === 0) setGuestTodayFoods(favs);
      showToast('已更新你嘅個人最愛清單！');
      return;
    }
    if (!user) return;
    await saveBaselineFavorites(
      user,
      favs,
      memberships.map((m) => m.boardId)
    );
    showToast('已儲存你嘅平時最愛美食清單！');
  };

  const handleCreateRoom = async (name: string, desc: string) => {
    if (guestDemoActive && !user) {
      showToast('目前為免登入 Demo 測試模式；登入後即可建立真實多人房間！');
      return;
    }
    if (!user) return;
    const newId = await createDiningRoom(user, name, desc, profile?.favoriteFoods || []);
    setActiveBoardId(newId);
    showToast(`已建立新飯局「${name}」！`);
  };

  const handleJoinRoom = async (code: string) => {
    if (guestDemoActive && !user) {
      showToast('目前為免登入 Demo 測試模式；請先登入帳號再輸入房間號碼加入朋友飯局！');
      return;
    }
    if (!user) return;
    const res = await joinRoomByCode(user, code, profile?.favoriteFoods || []);
    setActiveBoardId(res.boardId);
    showToast(
      res.alreadyMember
        ? `已切換至「${res.boardName}」`
        : `成功加入「${res.boardName}」！`
    );
  };

  const handleSubmitTodayPreferences = async (payload: {
    favoriteFoods?: string[];
    todayFoods: string[];
    moodFilters: string[];
    budgetMax: PriceTier;
    maxWalkKm: number;
    status: 'picking' | 'ready';
  }) => {
    if (guestDemoActive && !user) {
      if (payload.favoriteFoods) setGuestFavorites(payload.favoriteFoods);
      setGuestTodayFoods(payload.todayFoods);
      setGuestMoodFilters(payload.moodFilters);
      setGuestBudget(payload.budgetMax);
      setGuestWalkKm(payload.maxWalkKm);
      setGuestStatus(payload.status);
      return;
    }
    if (!user || !activeBoardId) return;
    await updateMyRoomPreferences(
      activeBoardId,
      user,
      memberships.map((m) => m.boardId),
      payload
    );
  };

  const handleUpdateSession = async (patch: Partial<RoomSession>) => {
    if (guestDemoActive && !user) {
      setGuestSession((prev) => ({
        id: 'current',
        boardId: 'demo_room',
        spinCount: patch.spinCount ?? prev?.spinCount ?? 0,
        lastWinner: patch.lastWinner ?? prev?.lastWinner ?? '',
        rejectedFoods: patch.rejectedFoods ?? prev?.rejectedFoods ?? [],
        weightMode: patch.weightMode ?? prev?.weightMode ?? 'weighted',
        finalSearchKeyword: patch.finalSearchKeyword ?? prev?.finalSearchKeyword ?? '',
        aiFinalPick: patch.aiFinalPick ?? prev?.aiFinalPick ?? '',
        aiSummaryTone: patch.aiSummaryTone ?? prev?.aiSummaryTone ?? '',
        aiMemberBreakdown: patch.aiMemberBreakdown ?? prev?.aiMemberBreakdown ?? [],
        aiBackupName: patch.aiBackupName ?? prev?.aiBackupName ?? '',
        aiBackupKeyword: patch.aiBackupKeyword ?? prev?.aiBackupKeyword ?? '',
        aiBackupReason: patch.aiBackupReason ?? prev?.aiBackupReason ?? '',
        updatedBy: 'guest_me',
        updatedByName: '我 (試玩模式)',
        updatedAt: prev?.updatedAt as RoomSession['updatedAt'],
      }));
      return;
    }
    if (!user || !activeBoardId) return;
    await syncRoomSession(activeBoardId, user, roomSession, patch);
  };

  const handleSearchRestaurants = (keyword: string) => {
    setMapSearchKeyword(keyword);
    setActiveTab('map');
  };

  const handleLogout = async () => {
    if (guestDemoActive && !user) {
      setGuestDemoActive(false);
      setDemoMode(false);
      return;
    }
    await signOut(auth);
    setDemoMode(false);
  };

  const handleCompleteOnboarding = async () => {
    setSavingOnboarding(true);
    try {
      await handleSavePersonalFavorites(onboardingDraft);
      if (user && activeBoardId && onboardingDraft.length > 0) {
        await updateMyRoomPreferences(
          activeBoardId,
          user,
          memberships.map((m) => m.boardId),
          {
            todayFoods: onboardingDraft,
            moodFilters: myMemberRecord?.moodFilters || [],
            budgetMax: myMemberRecord?.budgetMax || '$$',
            maxWalkKm: myMemberRecord?.maxWalkKm || 2,
            status: 'ready',
          }
        );
      }
      setShowOnboardingFavs(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSavingOnboarding(false);
    }
  };

  const quotaBanner = quotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  if (!authReady) {
    return (
      <>
        {quotaBanner}
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-3 text-sm text-[#6B6560]">
          <Loader2 className="w-6 h-6 animate-spin text-[#E85D3F]" />
          <span>載入《今日食咩好？》中...</span>
        </div>
      </>
    );
  }

  if (!user && !guestDemoActive) {
    return (
      <>
        {quotaBanner}
        <AuthLanding
          hasPendingJoinCode={pendingJoinCode}
          onEnterDemoMode={() => {
            setGuestDemoActive(true);
            setDemoMode(true);
            setActiveTab('lobby');
          }}
        />
      </>
    );
  }

  const currentUserName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || '我 (試玩模式)';
  const currentUserPhoto = profile?.photoURL || user?.photoURL || '';
  const currentUserUid = user?.uid || 'guest_me';
  const personalFavorites = user ? profile?.favoriteFoods || [] : guestFavorites;
  const activeSearchKeyword =
    mapSearchKeyword || activeSession?.finalSearchKeyword || activeSession?.lastWinner || '';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col">
      {quotaBanner}

      <TopNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        roomName={activeBoard?.name || (guestDemoActive ? '週末銅鑼灣聚餐 (Demo)' : '今日飯局')}
        inviteCode={activeBoard?.inviteCode || (guestDemoActive ? '882618' : '')}
        memberCount={combinedMembers.length}
        userName={currentUserName}
        userPhoto={currentUserPhoto}
        demoMode={effectiveDemoMode}
        isGuestDemo={guestDemoActive && !user}
        onToggleDemoMode={() => {
          if (guestDemoActive && !user) {
            showToast('目前為免登入試玩模式；如需建立或加入真實房間，請先返回登入帳號。');
            return;
          }
          setDemoMode((prev) => !prev);
        }}
        onLogout={handleLogout}
        hasMapTarget={Boolean(activeSearchKeyword)}
      />

      {guestDemoActive && !user && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="px-4 py-3 rounded-2xl bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#92400E] text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-2">
            <span>目前為「免登入 Demo 試玩模式」，建立／加入真實朋友飯局需先登入帳號。</span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-[#292524] transition-colors cursor-pointer"
            >
              立即去登入真實帳號
            </button>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="px-4 py-3 rounded-2xl bg-[#1C1917] text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center justify-between">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-white/70 hover:text-white text-xs cursor-pointer ml-4"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* First-Time Personal Baseline Favorites Onboarding Card */}
      {showOnboardingFavs && user && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5">
          <div className="bg-white border-2 border-[#E85D3F] rounded-3xl p-5 sm:p-7 shadow-md space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E85D3F] mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>歡迎嚟到《今日食咩好？》· 首次個人設定</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1C1917]">
                  先揀低你「平時最愛食」嘅美食清單
                </h2>
                <p className="text-xs sm:text-sm text-[#6B6560] mt-1">
                  設定一次之後，每次入任何朋友飯局都會自動幫你勾選好，撳幾秒就搞掂！
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardingFavs(false)}
                className="text-xs font-semibold text-[#6B6560] hover:text-[#1C1917] cursor-pointer"
              >
                遲啲先揀
              </button>
            </div>

            <ThreeTierFoodSelector
              selectedFoods={onboardingDraft}
              onChange={setOnboardingDraft}
              title="揀幾款你平時成日食嘅餐廳或菜式"
              subtitle="撳一撳熱門標籤、切換菜系分頁，或者自己打冷門美食入去"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E2DA]">
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={savingOnboarding || onboardingDraft.length === 0}
                className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingOnboarding && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>儲存個人最愛並入房 ({onboardingDraft.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 pb-24 md:pb-12">
        {bootstrapping ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm text-[#6B6560]">
            <Loader2 className="w-6 h-6 animate-spin text-[#E85D3F]" />
            <span>準備緊你嘅即時飯局房間...</span>
          </div>
        ) : (
          <>
            {activeTab === 'lobby' && (
              <RoomLobbyPanel
                currentUserUid={currentUserUid}
                activeBoard={activeBoard}
                memberships={memberships}
                members={combinedMembers}
                personalFavorites={personalFavorites}
                demoMode={effectiveDemoMode}
                onSelectRoom={(boardId) => setActiveBoardId(boardId)}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onSavePersonalFavorites={handleSavePersonalFavorites}
                onGoToFilters={() => setActiveTab('filters')}
                onGoToArena={() => setActiveTab('arena')}
              />
            )}

            {activeTab === 'filters' && (
              <TodayFilterPanel
                initialTodayFoods={myMemberRecord?.todayFoods || personalFavorites}
                initialFavoriteFoods={personalFavorites}
                initialMoodFilters={myMemberRecord?.moodFilters || []}
                initialBudgetMax={myMemberRecord?.budgetMax || '$$'}
                initialMaxWalkKm={myMemberRecord?.maxWalkKm || 2}
                initialStatus={myMemberRecord?.status || 'picking'}
                onSubmitPreferences={handleSubmitTodayPreferences}
                onGoToArena={() => setActiveTab('arena')}
              />
            )}

            {activeTab === 'arena' && (
              <DecisionArena
                roomName={activeBoard?.name || '今日飯局'}
                members={combinedMembers}
                session={activeSession}
                onUpdateSession={handleUpdateSession}
                onSearchRestaurants={handleSearchRestaurants}
              />
            )}

            {activeTab === 'map' && (
              <RestaurantMapPanel
                mapsApiKey={mapsApiKey}
                mapsConfigLoaded={mapsConfigLoaded}
                searchKeyword={activeSearchKeyword}
                maxWalkKm={effectiveMaxWalkKm}
                onChangeSearchKeyword={(kw) => setMapSearchKeyword(kw)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
