import { promises as fs } from "fs";
import path from "path";

import type {
  DepositStatus,
  StoredDepositUser,
} from "@/src/features/onboarding/types/deposit.types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "deposit-users.json");

let memoryStore: StoredDepositUser[] | null = null;

function isStoredDepositUser(value: unknown): value is StoredDepositUser {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredDepositUser>;
  return (
    typeof record.id === "string" &&
    typeof record.email === "string" &&
    typeof record.password === "string" &&
    typeof record.fullName === "string"
  );
}

function parseStorePayload(raw: string): StoredDepositUser[] {
  if (!raw.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredDepositUser);
  } catch {
    console.warn("[deposit-store] Corrupt store payload; starting empty.");
    return [];
  }
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function readStore(): Promise<StoredDepositUser[]> {
  if (memoryStore) return memoryStore;

  try {
    await ensureDataFile();
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    memoryStore = parseStorePayload(raw);
    return memoryStore;
  } catch {
    console.warn("[deposit-store] Unable to read local store; using empty in-memory state.");
    memoryStore = [];
    return memoryStore;
  }
}

async function writeStore(users: StoredDepositUser[]): Promise<void> {
  memoryStore = users;
  try {
    await ensureDataFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    console.warn(
      "[deposit-store] File write failed; continuing with in-memory state only."
    );
  }
}

export async function isDepositStoreReadable(): Promise<boolean> {
  const users = await readStore();
  return Array.isArray(users);
}

export async function getAllDepositUsers(): Promise<StoredDepositUser[]> {
  return readStore();
}

export async function getDepositUserById(
  id: string
): Promise<StoredDepositUser | null> {
  const users = await readStore();
  return users.find((user) => user.id === id) ?? null;
}

export async function getDepositUserByEmail(
  email: string
): Promise<StoredDepositUser | null> {
  const users = await readStore();
  return (
    users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

export async function createDepositUser(
  user: Omit<StoredDepositUser, "createdAt" | "updatedAt" | "depositStatus"> & {
    depositStatus?: DepositStatus;
  }
): Promise<StoredDepositUser> {
  const users = await readStore();
  const now = new Date().toISOString();
  const record: StoredDepositUser = {
    ...user,
    depositStatus: user.depositStatus ?? "none",
    createdAt: now,
    updatedAt: now,
  };
  users.push(record);
  await writeStore(users);
  return record;
}

export async function updateDepositUser(
  id: string,
  patch: Partial<StoredDepositUser>
): Promise<StoredDepositUser | null> {
  const users = await readStore();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;

  const updated: StoredDepositUser = {
    ...users[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  users[index] = updated;
  await writeStore(users);
  return updated;
}

export async function updateDepositStatus(
  id: string,
  depositStatus: DepositStatus
): Promise<StoredDepositUser | null> {
  return updateDepositUser(id, { depositStatus });
}
