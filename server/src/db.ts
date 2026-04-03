import { Pool } from 'pg';
import { normalize } from './validation';

// Auto-approval thresholds
const AUTO_APPROVE_MIN_TOTAL = 2;
const AUTO_APPROVE_MIN_APPROVALS = 2;
const AUTO_APPROVE_RATIO = 0.7;

let pool: Pool | null = null;

export async function initDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('DATABASE_URL not set, community database disabled.');
    return;
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answer_verdicts (
      id            SERIAL PRIMARY KEY,
      answer        TEXT NOT NULL,
      category      TEXT NOT NULL,
      language      TEXT NOT NULL,
      approved      BOOLEAN NOT NULL,
      player_count  INTEGER NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_verdict_lookup
      ON answer_verdicts (answer, category, language)
  `);

  console.log('Community database initialized.');
}

export async function recordChallengeOutcome(
  answer: string,
  category: string,
  language: string,
  approved: boolean,
  playerCount: number
): Promise<void> {
  if (!pool) return;
  const norm = normalize(answer);
  await pool.query(
    `INSERT INTO answer_verdicts (answer, category, language, approved, player_count)
     VALUES ($1, $2, $3, $4, $5)`,
    [norm, category, language, approved, playerCount]
  );
}

export async function shouldAutoApprove(
  answer: string,
  category: string,
  language: string
): Promise<boolean> {
  if (!pool) return false;
  const norm = normalize(answer);
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE approved = true) AS approvals,
       COUNT(*) AS total
     FROM answer_verdicts
     WHERE answer = $1 AND category = $2 AND language = $3`,
    [norm, category, language]
  );
  const { approvals, total } = result.rows[0];
  const approvalsNum = parseInt(approvals, 10);
  const totalNum = parseInt(total, 10);
  if (totalNum < AUTO_APPROVE_MIN_TOTAL) return false;
  if (approvalsNum < AUTO_APPROVE_MIN_APPROVALS) return false;
  return (approvalsNum / totalNum) >= AUTO_APPROVE_RATIO;
}
