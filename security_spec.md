# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **PII Isolation**: User emails and private profiles in `/users/{userId}` can ONLY be read and modified by the authenticated owner (`request.auth.uid == userId && email_verified == true`).
2. **Board Membership Gate**: No user can read, list, create, update, or delete foods, votes, or history under `/boards/{boardId}` unless they are a verified member in `/boards/{boardId}/members/{request.auth.uid}`.
3. **Invite Integrity**: A user cannot self-join `/boards/{boardId}/members/{uid}` as an `'editor'` without supplying a valid `inviteCode` that exists in `/invites/{inviteCode}` and maps to that exact `boardId`.
4. **Atomic Board Creation**: Creating `/boards/{boardId}` requires atomically creating the owner's membership document and the invite lookup document in the same batch (`existsAfter`/`getAfter`).
5. **Immutable Ownership & Timestamps**: `ownerId`, `boardId`, `addedBy`, `userId`, and `createdAt` cannot be forged or altered after creation; all server timestamps must equal `request.time`.
6. **Vote Isolation**: Within a board, a member can only create, update, or delete their own vote document (`voteId == foodId + '_' + request.auth.uid` and `userId == request.auth.uid`), with `score` bounded between 1 and 5.
7. **Strict Key & Size Limits**: Every document validates exact allowed keys (`hasAll` / `hasOnly` on create, `affectedKeys().hasOnly()` on update) and bounded string/array sizes.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoof**: Write to `/users/uid1` with `request.auth.token.email_verified == false` -> MUST FAIL.
2. **PII Cross-Read**: `get` on `/users/victimUid` as `attackerUid` -> MUST FAIL.
3. **Shadow Ghost Field Injection**: Create `/boards/b1/foods/f1` with extra `{ isAdminFeatured: true }` -> MUST FAIL.
4. **Invite Bypass Self-Join**: Create `/boards/targetBoard/members/attackerUid` with fake `inviteCode: "FAKE99"` -> MUST FAIL.
5. **Privilege Escalation on Join**: Join `/boards/targetBoard/members/attackerUid` with `role: "owner"` instead of `"editor"` -> MUST FAIL.
6. **Non-Member Food Injection**: Create `/boards/targetBoard/foods/f1` as a signed-in user who is not in `members` -> MUST FAIL.
7. **Vote Spoofing**: Create `/boards/b1/votes/f1_victimUid` as `attackerUid` -> MUST FAIL.
8. **Out-of-Bounds Score**: Create `/boards/b1/votes/f1_attackerUid` with `score: 9999` -> MUST FAIL.
9. **Resource Exhaustion (1MB String)**: Create `/boards/b1/foods/f1` with 2000-char `name` or invalid `foodId` containing spaces/slashes -> MUST FAIL.
10. **Timestamp Forgery**: Create `/boards/b1/foods/f1` with backdated client `createdAt` instead of `request.time` -> MUST FAIL.
11. **Ownership Hijack on Update**: Update `/boards/b1` as an `'editor'` member to change `ownerId` or `inviteCode` -> MUST FAIL.
12. **Blanket List Scraping**: List `/boards`, `/invites`, or `/users` without ownership/membership constraint -> MUST FAIL.
