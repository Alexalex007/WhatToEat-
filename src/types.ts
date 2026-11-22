import { Timestamp } from 'firebase/firestore';

export const PRICE_TIERS = ['$', '$$', '$$$', '$$$$'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  INVITE_CODE_PATTERN: /^[A-Z0-9]{6,12}$/,
  MAX_DISPLAY_NAME: 60,
  MAX_EMAIL: 120,
  MAX_PHOTO_URL: 500,
  MAX_BOARD_NAME: 60,
  MAX_BOARD_DESC: 160,
  MAX_FOODS_COUNT: 30,
  MAX_FOOD_LEN: 40,
  MAX_MOOD_COUNT: 10,
} as const;

export interface MoodFilterDef {
  id: string;
  label: string;
  hint: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  favoriteFoods: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  inviteCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BoardMember {
  uid: string;
  boardId: string;
  boardName: string;
  displayName: string;
  photoURL: string;
  role: 'owner' | 'editor';
  favoriteFoods: string[];
  todayFoods: string[];
  moodFilters: string[];
  budgetMax: PriceTier;
  maxWalkKm: number;
  status: 'picking' | 'ready';
  inviteCode: string;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DemoFriendProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  favoriteFoods: string[];
  todayFoods: string[];
  moodFilters: string[];
  budgetMax: PriceTier;
  maxWalkKm: number;
  status: 'picking' | 'ready';
}

export interface RoomSession {
  id: string;
  boardId: string;
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
  updatedBy: string;
  updatedByName: string;
  updatedAt: Timestamp;
}

export interface AiRescueResult {
  finalPick: string;
  searchKeyword: string;
  summaryTone: string;
  memberBreakdown: string[];
  backupName: string;
  backupKeyword: string;
  backupReason: string;
}

export function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function sanitizeFoodArray(items: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of items) {
    const trimmed = raw.trim().slice(0, BLUEPRINT_LIMITS.MAX_FOOD_LEN);
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(trimmed);
    }
    if (cleaned.length >= BLUEPRINT_LIMITS.MAX_FOODS_COUNT) break;
  }
  return cleaned;
}

export function sanitizeMoodArray(items: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of items) {
    const trimmed = raw.trim().slice(0, 40);
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(trimmed);
    }
    if (cleaned.length >= BLUEPRINT_LIMITS.MAX_MOOD_COUNT) break;
  }
  return cleaned;
}

export function generateSafeId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'item';
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${cleanPrefix}_${ts}_${rand}`;
}

export function generateSixDigitRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
