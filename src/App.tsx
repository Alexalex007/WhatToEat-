import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { AuthLanding, PendingAnonymousAction } from './components/AuthLanding';
import { DecisionArena } from './components/DecisionArena';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RestaurantMapPanel } from './components/RestaurantMapPanel';
import { RoomLobbyPanel } from './components/RoomLobbyPanel';
import { TodayFilterPanel } from './components/TodayFilterPanel';
import { AppTabId, TopNav } from './components/TopNav';
import { getDefaultMealPeriod, SIX_CUISINE_CATEGORIES } from './data/hkFoods';
import { auth } from './lib/firebase';
import {
  createDiningRoom,
  deleteMealHistoryEntry,
  ensureUserAndDefaultRoom,
  joinRoomByCode,
  recordRoomMealDecision,
  rotateRoomInviteCode,
  saveBaselineFavorites,
  setRoomQrAutoRotate,
  subscribeRoom,
  subscribeRoomMealHistory7Days,
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
  MealHistoryEntry,
  MealPeriod,
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
  const [mealHistory7Days, setMealHistory7Days] = useState<MealHistoryEntry[]>([]);

  const [activeTab, setActiveTab] = useState<AppTabId>('lobby');
  const [mapSearchKeyword, setMapSearchKeyword] = useState<string>('');
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const code = new URLSearchParams(window.location.search).get('join');
    return code ? code.trim().toUpperCase() : null;
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const pendingAnonymousActionRef = useRef<PendingAnonymousAction | null>(null);

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
        setMealHistory7Days([]);
        return;
      }

      const pendingAnon = pendingAnonymousActionRef.current;
      pendingAnonymousActionRef.current = null;

      setBootstrapping(true);
      try {
        if (pendingAnon) {
          const loadedProfile = await ensureUserAndDefaultRoom(
            nextUser,
            pendingAnon.nickname,
            true
          );
          if (pendingAnon.type === 'join') {
            const res = await joinRoomByCode(
              nextUser,
              pendingAnon.code,
              loadedProfile.favoriteFoods || [],
              pendingAnon.nickname
            );
            setActiveBoardId(res.boardId);
            setPendingJoinCode(null);
            setActiveTab('filters');
            showToast(`已加入「${res.boardName}」`);
          } else {
            const newId = await createDiningRoom(
              nextUser,
              pendingAnon.roomName,
              '',
              loadedProfile.favoriteFoods || [],
              pendingAnon.nickname
            );
            setActiveBoardId(newId);
            setActiveTab('lobby');
            showToast(`已建立「${pendingAnon.roomName}」`);
          }
        } else {
          await ensureUserAndDefaultRoom(nextUser);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : '初始化失敗');
        if (pendingAnon) {
          try {
            await ensureUserAndDefaultRoom(nextUser, pendingAnon.nickname, false);
          } catch {
            // Ignore secondary error
          }
        }
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
          res.alreadyMember ? `已切換至「${res.boardName}」` : `成功加入「${res.boardName}」`
        );
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('join');
          window.history.replaceState({}, '', url.toString());
        }
      })
      .catch((err) => {
        if (active) {
          showToast(err instanceof Error ? err.message : '房間號碼或 QR Code 已失效');
        }
      });

    return () => {
      active = false;
    };
  }, [user, pendingJoinCode, bootstrapping, profile?.favoriteFoods, showToast]);

  // Subscribe active room, members, session, and 7-day meal history
  useEffect(() => {
    if (!user || !activeBoardId) {
      setActiveBoard(null);
      setRoomMembers([]);
      setRoomSession(null);
      setMealHistory7Days([]);
      return;
    }

    const unsubRoom = subscribeRoom(activeBoardId, setActiveBoard);
    const unsubMembers = subscribeRoomMembers(activeBoardId, setRoomMembers);
    const unsubSession = subscribeRoomSession(activeBoardId, setRoomSession);
    const unsubHistory = subscribeRoomMealHistory7Days(activeBoardId, setMealHistory7Days);

    return () => {
      unsubRoom();
      unsubMembers();
      unsubSession();
      unsubHistory();
    };
  }, [user, activeBoardId]);

  const myMemberRecord = useMemo(
    () => roomMembers.find((m) => m.uid === user?.uid) || null,
    [roomMembers, user?.uid]
  );

  const effectiveMaxWalkKm = useMemo(() => {
    if (roomMembers.length === 0) return 2;
    const minKm = Math.min(...roomMembers.map((m) => m.maxWalkKm || 2));
    return Math.max(1, Math.min(3, minKm));
  }, [roomMembers]);

  const recentMeals7DaysNames = useMemo(
    () => Array.from(new Set(mealHistory7Days.map((e) => e.foodName))),
    [mealHistory7Days]
  );

  const handleSavePersonalFavorites = async (favs: string[]) => {
    if (!user) return;
    await saveBaselineFavorites(
      user,
      favs,
      memberships.map((m) => m.boardId)
    );
    showToast('已儲存平時常食清單');
  };

  const handleCreateRoom = async (name: string, desc: string) => {
    if (!user) return;
    const newId = await createDiningRoom(user, name, desc, profile?.favoriteFoods || []);
    setActiveBoardId(newId);
    showToast(`已建立「${name}」`);
  };

  const handleJoinRoom = async (code: string) => {
    if (!user) return;
    const res = await joinRoomByCode(user, code, profile?.favoriteFoods || []);
    setActiveBoardId(res.boardId);
    showToast(
      res.alreadyMember ? `已切換至「${res.boardName}」` : `成功加入「${res.boardName}」`
    );
  };

  const handleRotateInviteCode = async () => {
    if (!activeBoard) return;
    await rotateRoomInviteCode(activeBoard);
  };

  const handleSetQrAutoRotate = async (enabled: boolean) => {
    if (!activeBoard) return;
    await setRoomQrAutoRotate(activeBoard.id, enabled);
  };

  const handleDeleteMealHistory = async (historyId: string) => {
    if (!activeBoardId) return;
    await deleteMealHistoryEntry(activeBoardId, historyId);
  };

  const handleSubmitTodayPreferences = async (payload: {
    mealPeriod: MealPeriod;
    selectedCuisines: string[];
    selectedFormats: string[];
    favoriteFoods?: string[];
    todayFoods: string[];
    moodFilters: string[];
    budgetMax: PriceTier;
    maxWalkKm: number;
    status: 'picking' | 'ready';
  }) => {
    if (!user || !activeBoardId) return;
    await updateMyRoomPreferences(
      activeBoardId,
      user,
      memberships.map((m) => m.boardId),
      payload
    );
  };

  const handleUpdateSession = async (
    patch: Partial<RoomSession> & { isSpinResult?: boolean }
  ) => {
    if (!user || !activeBoardId) return;
    await syncRoomSession(activeBoardId, user, roomSession, patch);
  };

  const handleRecordMealDecision = async (foodName: string) => {
    if (!user || !activeBoardId) return;
    await recordRoomMealDecision(activeBoardId, user, foodName);
  };

  const handleConfirmMealAndSearch = async (foodName: string, searchKeyword: string) => {
    if (user && activeBoardId && foodName) {
      try {
        await recordRoomMealDecision(activeBoardId, user, foodName);
      } catch {
        // Still allow navigation to map if history write fails
      }
    }
    setMapSearchKeyword(searchKeyword || foodName);
    setActiveTab('map');
  };

  const handleLogout = async () => {
    await signOut(auth);
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
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-3 text-sm text-[#6E6E73]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
          <span>載入中...</span>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        {quotaBanner}
        <AuthLanding
          hasPendingJoinCode={pendingJoinCode}
          onPrepareAnonymousAction={(action) => {
            pendingAnonymousActionRef.current = action;
          }}
        />
      </>
    );
  }

  const currentUserName =
    profile?.displayName || user.displayName || user.email?.split('@')[0] || '食飯友';
  const currentUserPhoto = profile?.photoURL || user.photoURL || '';
  const personalFavorites = profile?.favoriteFoods || [];
  const activeSearchKeyword =
    mapSearchKeyword || roomSession?.finalSearchKeyword || roomSession?.lastWinner || '';

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      {quotaBanner}

      <TopNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        roomName={activeBoard?.name || '今日飯局'}
        inviteCode={activeBoard?.inviteCode || ''}
        memberCount={roomMembers.length}
        userName={currentUserName}
        userPhoto={currentUserPhoto}
        isAnonymous={user.isAnonymous}
        onLogout={handleLogout}
        hasMapTarget={Boolean(activeSearchKeyword)}
      />

      {toastMsg && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="px-4 py-3 rounded-2xl bg-[#1D1D1F] text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center justify-between">
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

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 pb-24 md:pb-12">
        {bootstrapping ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm text-[#6E6E73]">
            <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
            <span>準備緊房間...</span>
          </div>
        ) : (
          <>
            {activeTab === 'lobby' && (
              <RoomLobbyPanel
                currentUserUid={user.uid}
                activeBoard={activeBoard}
                memberships={memberships}
                members={roomMembers}
                mealHistory7Days={mealHistory7Days}
                personalFavorites={personalFavorites}
                onSelectRoom={(boardId) => setActiveBoardId(boardId)}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onRotateInviteCode={handleRotateInviteCode}
                onSetQrAutoRotate={handleSetQrAutoRotate}
                onDeleteMealHistory={handleDeleteMealHistory}
                onSavePersonalFavorites={handleSavePersonalFavorites}
                onGoToFilters={() => setActiveTab('filters')}
                onGoToArena={() => setActiveTab('arena')}
              />
            )}

            {activeTab === 'filters' && (
              <TodayFilterPanel
                initialMealPeriod={myMemberRecord?.mealPeriod || getDefaultMealPeriod()}
                initialSelectedCuisines={
                  myMemberRecord?.selectedCuisines?.length
                    ? myMemberRecord.selectedCuisines
                    : [SIX_CUISINE_CATEGORIES[0].id]
                }
                initialSelectedFormats={myMemberRecord?.selectedFormats || []}
                initialTodayFoods={myMemberRecord?.todayFoods || personalFavorites}
                initialFavoriteFoods={personalFavorites}
                initialMoodFilters={myMemberRecord?.moodFilters || []}
                initialBudgetMax={myMemberRecord?.budgetMax || '$$'}
                initialMaxWalkKm={myMemberRecord?.maxWalkKm || 2}
                initialStatus={myMemberRecord?.status || 'picking'}
                recentMeals7Days={recentMeals7DaysNames}
                onSubmitPreferences={handleSubmitTodayPreferences}
                onGoToArena={() => setActiveTab('arena')}
              />
            )}

            {activeTab === 'arena' && (
              <DecisionArena
                roomName={activeBoard?.name || '今日飯局'}
                members={roomMembers}
                session={roomSession}
                recentMeals7Days={recentMeals7DaysNames}
                onUpdateSession={handleUpdateSession}
                onRecordMealDecision={handleRecordMealDecision}
                onConfirmMealAndSearch={handleConfirmMealAndSearch}
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
      <MotionConfig reducedMotion="user">
        <MainApp />
      </MotionConfig>
    </ErrorBoundary>
  );
}
