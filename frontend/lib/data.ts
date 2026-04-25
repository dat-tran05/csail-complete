import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Room } from "@shared/schema/room";
import type { Person, Group } from "@shared/schema/kg";

const DATA_DIR = path.resolve(process.cwd(), "..", "data");

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, filename), "utf-8")) as T;
}

export async function loadRoomsForFloor(floor: number): Promise<Room[]> {
  const real = `rooms-floor-${floor}.json`;
  const fallback = `rooms-floor-${floor}-sample.json`;
  if (existsSync(path.join(DATA_DIR, real))) return readJson<Room[]>(real);
  if (existsSync(path.join(DATA_DIR, fallback))) return readJson<Room[]>(fallback);
  return [];
}

export async function loadPeople(): Promise<Person[]> {
  if (existsSync(path.join(DATA_DIR, "people.json"))) return readJson<Person[]>("people.json");
  return readJson<Person[]>("people-fallback.json");
}

export async function loadGroups(): Promise<Group[]> {
  return readJson<Group[]>("groups.json");
}
