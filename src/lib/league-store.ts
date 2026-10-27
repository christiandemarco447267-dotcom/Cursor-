"use client";

// Firestore I/O for friend leagues. Layout (see firestore.rules):
//   leagues/{code}                 { name, createdBy, createdAt }
//   leagues/{code}/members/{uid}   { displayName, disciplineScore, monthlyReturnPct, updatedAt }
// Members can read their league; each user writes only their own member doc.
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { generateLeagueCode, LeagueNameSchema, parseMember, type LeagueMember, type MemberSummary } from "./leagues";

export type LeagueInfo = { code: string; name: string };

function leagueDoc(code: string) {
  return doc(firestore(), "leagues", code);
}
function memberDoc(code: string, uid: string) {
  return doc(firestore(), "leagues", code, "members", uid);
}

export async function publishMember(code: string, uid: string, summary: MemberSummary): Promise<void> {
  await setDoc(memberDoc(code, uid), { ...summary, updatedAt: serverTimestamp() });
}

export async function createLeague(uid: string, rawName: string, summary: MemberSummary): Promise<LeagueInfo> {
  const name = LeagueNameSchema.parse(rawName);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateLeagueCode();
    const existing = await getDoc(leagueDoc(code));
    if (existing.exists()) continue;
    await setDoc(leagueDoc(code), { name, createdBy: uid, createdAt: serverTimestamp() });
    await publishMember(code, uid, summary);
    return { code, name };
  }
  throw new Error("Couldn't create a unique league code. Please try again.");
}

export async function getLeague(code: string): Promise<LeagueInfo | null> {
  const snap = await getDoc(leagueDoc(code));
  if (!snap.exists()) return null;
  const name = (snap.data() as { name?: unknown }).name;
  return { code, name: typeof name === "string" ? name : code };
}

export async function joinLeague(code: string, uid: string, summary: MemberSummary): Promise<LeagueInfo> {
  const league = await getLeague(code);
  if (!league) throw new Error("No league found with that code.");
  await publishMember(code, uid, summary);
  return league;
}

export async function leaveLeague(code: string, uid: string): Promise<void> {
  await deleteDoc(memberDoc(code, uid));
}

export function watchMembers(code: string, onMembers: (members: LeagueMember[]) => void, onError?: (e: unknown) => void): () => void {
  return onSnapshot(
    collection(firestore(), "leagues", code, "members"),
    (snap) => {
      const members: LeagueMember[] = [];
      snap.forEach((d) => {
        const m = parseMember(d.id, d.data());
        if (m) members.push(m);
      });
      onMembers(members);
    },
    onError,
  );
}
