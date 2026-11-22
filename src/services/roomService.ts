import { User } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  Board,
  BoardMember,
  clampString,
  generateSafeId,
  generateSixDigitRoomCode,
  PriceTier,
  RoomSession,
  sanitizeFoodArray,
  sanitizeMoodArray,
  UserProfile,
} from '../types';

function safeDisplayName(user: User): string {
  const raw = user.displayName || user.email?.split('@')[0] || '為食友';
  return clampString(raw, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME) || '為食友';
}

function safePhotoURL(user: User): string {
  return (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.MAX_PHOTO_URL);
}

function safeEmail(user: User): string {
  return (user.email || '').slice(0, BLUEPRINT_LIMITS.MAX_EMAIL);
}

export async function ensureUserAndDefaultRoom(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let profileSnap;
  try {
    profileSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  let profile: UserProfile;
  if (!profileSnap.exists()) {
    const newProfilePayload = {
      uid: user.uid,
      displayName: safeDisplayName(user),
      email: safeEmail(user),
      photoURL: safePhotoURL(user),
      favoriteFoods: [] as string[],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(userRef, newProfilePayload);
      const fresh = await getDoc(userRef);
      profile = fresh.data() as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else {
    profile = profileSnap.data() as UserProfile;
  }

  // Ensure user belongs to at least one dining room
  try {
    const membershipsQuery = query(
      collectionGroup(db, 'members'),
      where('uid', '==', user.uid)
    );
    const membershipsSnap = await getDocs(membershipsQuery);
    if (membershipsSnap.empty) {
      await createDiningRoom(
        user,
        '今日飯局',
        '同朋友即時入房揀食咩，一齊轉輪盤或者交俾 AI 拍板！',
        profile.favoriteFoods || []
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'members');
  }

  return profile;
}

export async function createDiningRoom(
  user: User,
  rawName: string,
  rawDesc: string,
  favoriteFoods: string[]
): Promise<string> {
  const name = clampString(rawName, BLUEPRINT_LIMITS.MAX_BOARD_NAME);
  if (!name) throw new Error('請輸入飯局名稱');
  const description = clampString(rawDesc, BLUEPRINT_LIMITS.MAX_BOARD_DESC);
  const cleanFavs = sanitizeFoodArray(favoriteFoods);

  const boardId = generateSafeId('room');
  let inviteCode = generateSixDigitRoomCode();

  try {
    const existingInvite = await getDoc(doc(db, 'invites', inviteCode));
    if (existingInvite.exists()) {
      inviteCode = generateSixDigitRoomCode();
    }
  } catch {
    // Ignore collision probe failure
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'boards', boardId), {
    id: boardId,
    name,
    description,
    ownerId: user.uid,
    inviteCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'invites', inviteCode), {
    inviteCode,
    boardId,
    boardName: name,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'boards', boardId, 'members', user.uid), {
    uid: user.uid,
    boardId,
    boardName: name,
    displayName: safeDisplayName(user),
    photoURL: safePhotoURL(user),
    role: 'owner',
    favoriteFoods: cleanFavs,
    todayFoods: cleanFavs,
    moodFilters: [],
    budgetMax: '$$',
    maxWalkKm: 2,
    status: cleanFavs.length > 0 ? 'ready' : 'picking',
    inviteCode,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `boards/${boardId}`);
  }

  return boardId;
}

export async function joinRoomByCode(
  user: User,
  rawCode: string,
  favoriteFoods: string[]
): Promise<{ boardId: string; boardName: string; alreadyMember: boolean }> {
  const code = rawCode.trim().toUpperCase();
  if (!BLUEPRINT_LIMITS.INVITE_CODE_PATTERN.test(code)) {
    throw new Error('房間號碼格式唔正確，請輸入 6 位數字或英數代碼。');
  }

  const inviteRef = doc(db, 'invites', code);
  let inviteSnap;
  try {
    inviteSnap = await getDoc(inviteRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `invites/${code}`);
  }

  if (!inviteSnap.exists()) {
    throw new Error('搵唔到呢個房間號碼，請同朋友確認再試一次。');
  }

  const inviteData = inviteSnap.data() as { boardId: string; boardName: string; inviteCode: string };
  const memberRef = doc(db, 'boards', inviteData.boardId, 'members', user.uid);

  let memberSnap;
  try {
    memberSnap = await getDoc(memberRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `boards/${inviteData.boardId}/members/${user.uid}`);
  }

  if (memberSnap.exists()) {
    return { boardId: inviteData.boardId, boardName: inviteData.boardName, alreadyMember: true };
  }

  const cleanFavs = sanitizeFoodArray(favoriteFoods);
  try {
    await setDoc(memberRef, {
      uid: user.uid,
      boardId: inviteData.boardId,
      boardName: clampString(inviteData.boardName, BLUEPRINT_LIMITS.MAX_BOARD_NAME) || '朋友飯局',
      displayName: safeDisplayName(user),
      photoURL: safePhotoURL(user),
      role: 'editor',
      favoriteFoods: cleanFavs,
      todayFoods: cleanFavs,
      moodFilters: [],
      budgetMax: '$$',
      maxWalkKm: 2,
      status: cleanFavs.length > 0 ? 'ready' : 'picking',
      inviteCode: code,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `boards/${inviteData.boardId}/members/${user.uid}`);
  }

  return { boardId: inviteData.boardId, boardName: inviteData.boardName, alreadyMember: false };
}

export async function saveBaselineFavorites(
  user: User,
  favorites: string[],
  memberBoardIds: string[]
): Promise<string[]> {
  const cleanFavs = sanitizeFoodArray(favorites);
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', user.uid), {
    displayName: safeDisplayName(user),
    email: safeEmail(user),
    photoURL: safePhotoURL(user),
    favoriteFoods: cleanFavs,
    updatedAt: serverTimestamp(),
  });

  for (const boardId of memberBoardIds) {
    batch.update(doc(db, 'boards', boardId, 'members', user.uid), {
      displayName: safeDisplayName(user),
      photoURL: safePhotoURL(user),
      favoriteFoods: cleanFavs,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
  }

  return cleanFavs;
}

export async function updateMyRoomPreferences(
  boardId: string,
  user: User,
  memberBoardIds: string[],
  input: {
    favoriteFoods?: string[];
    todayFoods: string[];
    moodFilters: string[];
    budgetMax: PriceTier;
    maxWalkKm: number;
    status: 'picking' | 'ready';
  }
): Promise<void> {
  const cleanToday = sanitizeFoodArray(input.todayFoods);
  const cleanMoods = sanitizeMoodArray(input.moodFilters);
  const clampedKm = Math.max(1, Math.min(3, Number(input.maxWalkKm) || 2));

  const batch = writeBatch(db);

  if (input.favoriteFoods) {
    const cleanFavs = sanitizeFoodArray(input.favoriteFoods);
    batch.update(doc(db, 'users', user.uid), {
      favoriteFoods: cleanFavs,
      updatedAt: serverTimestamp(),
    });
    for (const bid of memberBoardIds) {
      if (bid !== boardId) {
        batch.update(doc(db, 'boards', bid, 'members', user.uid), {
          favoriteFoods: cleanFavs,
          updatedAt: serverTimestamp(),
        });
      }
    }
    batch.update(doc(db, 'boards', boardId, 'members', user.uid), {
      favoriteFoods: cleanFavs,
      todayFoods: cleanToday,
      moodFilters: cleanMoods,
      budgetMax: input.budgetMax,
      maxWalkKm: clampedKm,
      status: input.status,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(doc(db, 'boards', boardId, 'members', user.uid), {
      todayFoods: cleanToday,
      moodFilters: cleanMoods,
      budgetMax: input.budgetMax,
      maxWalkKm: clampedKm,
      status: input.status,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `boards/${boardId}/members/${user.uid}`);
  }
}

export async function syncRoomSession(
  boardId: string,
  user: User,
  currentSession: RoomSession | null,
  patch: Partial<{
    spinCount: number;
    lastWinner: string;
    rejectedFoods: string[];
    weightMode: 'weighted' | 'equal';
    finalSearchKeyword: string;
    aiFinalPick: string;
    aiSummaryTone: string;
    aiMemberBreakdown: string[];
    aiBackupName: string;
    aiBackupKeyword: string;
    aiBackupReason: string;
  }>
): Promise<void> {
  const sessionRef = doc(db, 'boards', boardId, 'sessions', 'current');
  const nextPayload = {
    id: 'current',
    boardId,
    spinCount: Math.min(1000, Math.max(0, patch.spinCount ?? currentSession?.spinCount ?? 0)),
    lastWinner: clampString(patch.lastWinner ?? currentSession?.lastWinner ?? '', 60),
    rejectedFoods: sanitizeFoodArray(patch.rejectedFoods ?? currentSession?.rejectedFoods ?? []),
    weightMode: patch.weightMode ?? currentSession?.weightMode ?? 'weighted',
    finalSearchKeyword: clampString(
      patch.finalSearchKeyword ?? currentSession?.finalSearchKeyword ?? '',
      80
    ),
    aiFinalPick: clampString(patch.aiFinalPick ?? currentSession?.aiFinalPick ?? '', 60),
    aiSummaryTone: clampString(patch.aiSummaryTone ?? currentSession?.aiSummaryTone ?? '', 400),
    aiMemberBreakdown: (patch.aiMemberBreakdown ?? currentSession?.aiMemberBreakdown ?? [])
      .slice(0, 20)
      .map((s) => clampString(s, 240))
      .filter(Boolean),
    aiBackupName: clampString(patch.aiBackupName ?? currentSession?.aiBackupName ?? '', 60),
    aiBackupKeyword: clampString(patch.aiBackupKeyword ?? currentSession?.aiBackupKeyword ?? '', 80),
    aiBackupReason: clampString(patch.aiBackupReason ?? currentSession?.aiBackupReason ?? '', 300),
    updatedBy: user.uid,
    updatedByName: safeDisplayName(user),
    updatedAt: serverTimestamp(),
  };

  try {
    if (!currentSession) {
      await setDoc(sessionRef, nextPayload);
    } else {
      await updateDoc(sessionRef, {
        spinCount: nextPayload.spinCount,
        lastWinner: nextPayload.lastWinner,
        rejectedFoods: nextPayload.rejectedFoods,
        weightMode: nextPayload.weightMode,
        finalSearchKeyword: nextPayload.finalSearchKeyword,
        aiFinalPick: nextPayload.aiFinalPick,
        aiSummaryTone: nextPayload.aiSummaryTone,
        aiMemberBreakdown: nextPayload.aiMemberBreakdown,
        aiBackupName: nextPayload.aiBackupName,
        aiBackupKeyword: nextPayload.aiBackupKeyword,
        aiBackupReason: nextPayload.aiBackupReason,
        updatedBy: nextPayload.updatedBy,
        updatedByName: nextPayload.updatedByName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `boards/${boardId}/sessions/current`);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUserMemberships(
  uid: string,
  onData: (memberships: BoardMember[]) => void
): () => void {
  const q = query(collectionGroup(db, 'members'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as BoardMember);
      list.sort((a, b) => {
        const ta = a.joinedAt?.toMillis?.() ?? 0;
        const tb = b.joinedAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    }
  );
}

export function subscribeRoom(
  boardId: string,
  onData: (board: Board | null) => void
): () => void {
  const path = `boards/${boardId}`;
  return onSnapshot(
    doc(db, 'boards', boardId),
    (snap) => {
      onData(snap.exists() ? (snap.data() as Board) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeRoomMembers(
  boardId: string,
  onData: (members: BoardMember[]) => void
): () => void {
  const path = `boards/${boardId}/members`;
  const q = query(collection(db, 'boards', boardId, 'members'), orderBy('joinedAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as BoardMember));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeRoomSession(
  boardId: string,
  onData: (session: RoomSession | null) => void
): () => void {
  const path = `boards/${boardId}/sessions/current`;
  return onSnapshot(
    doc(db, 'boards', boardId, 'sessions', 'current'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as RoomSession) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
