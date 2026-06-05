import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PeskidsBiSnapshot } from '@/lib/types'

function snapshotPath(): string {
  return process.env.PESKIDS_BI_SNAPSHOT_PATH?.trim() || path.join(process.cwd(), 'runtime/analytics/peskids-bi.json')
}

export async function loadPeskidsBiSnapshot(): Promise<PeskidsBiSnapshot | null> {
  try {
    const raw = await readFile(snapshotPath(), 'utf8')
    return JSON.parse(raw) as PeskidsBiSnapshot
  } catch {
    return null
  }
}

