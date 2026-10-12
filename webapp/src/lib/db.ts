import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface Draft {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  /** Paths pinned as reference material while composing this draft. */
  sourceRefs: string[]
}

export interface Collection {
  id: string
  name: string
  paths: string[]
  createdAt: string
  updatedAt: string
}

interface AppDB extends DBSchema {
  drafts: { key: string; value: Draft; indexes: { updatedAt: string } }
  collections: { key: string; value: Collection; indexes: { updatedAt: string } }
}

const DB_NAME = 'system-prompts-leaks'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('drafts', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt')
        db.createObjectStore('collections', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt')
      },
    })
  }
  return dbPromise
}

function newId(): string {
  return crypto.randomUUID()
}

export async function listDrafts(): Promise<Draft[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('drafts', 'updatedAt')
  return all.reverse()
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  const db = await getDb()
  return db.get('drafts', id)
}

export async function saveDraft(
  draft: { id?: string; title: string; content: string; sourceRefs: string[] },
): Promise<Draft> {
  const db = await getDb()
  const now = new Date().toISOString()
  const existing = draft.id ? await db.get('drafts', draft.id) : undefined
  const record: Draft = {
    id: draft.id ?? newId(),
    title: draft.title,
    content: draft.content,
    sourceRefs: draft.sourceRefs,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.put('drafts', record)
  return record
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('drafts', id)
}

export async function listCollections(): Promise<Collection[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('collections', 'updatedAt')
  return all.reverse()
}

export async function saveCollection(
  collection: { id?: string; name: string; paths: string[] },
): Promise<Collection> {
  const db = await getDb()
  const now = new Date().toISOString()
  const existing = collection.id ? await db.get('collections', collection.id) : undefined
  const record: Collection = {
    id: collection.id ?? newId(),
    name: collection.name,
    paths: collection.paths,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.put('collections', record)
  return record
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('collections', id)
}
