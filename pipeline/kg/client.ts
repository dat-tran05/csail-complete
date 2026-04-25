import neo4j, { type Driver, type Session } from "neo4j-driver";

let driverSingleton: Driver | null = null;

export function getDriver(): Driver {
  if (driverSingleton) return driverSingleton;
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "csail-dev-password";
  driverSingleton = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });
  return driverSingleton;
}

export function readSession(): Session {
  return getDriver().session({ defaultAccessMode: neo4j.session.READ });
}

export function writeSession(): Session {
  return getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
}

export async function closeDriver(): Promise<void> {
  if (driverSingleton) {
    await driverSingleton.close();
    driverSingleton = null;
  }
}

export async function withWrite<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  const s = writeSession();
  try { return await fn(s); } finally { await s.close(); }
}

export async function withRead<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  const s = readSession();
  try { return await fn(s); } finally { await s.close(); }
}
