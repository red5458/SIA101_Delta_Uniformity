import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { env } from "../../config/env";
import { pool, query, withTransaction } from "../../config/db";
import type { UserRow } from "../../types";
import { randomToken, sha256 } from "../../utils/crypto";
import { unauthorized } from "../../utils/ApiError";
import { signAccessToken } from "../../utils/jwt";

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

interface RefreshRow {
  token_id: string;
  user_id: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
}

export interface ActiveSession {
  family_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string;
  current: boolean;
}

function metaValues(meta: SessionMeta) {
  return {
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
    ip: meta.ip?.slice(0, 64) ?? null,
  };
}

async function insertRefreshToken(
  client: PoolClient,
  userId: string,
  familyId: string,
  meta: SessionMeta,
): Promise<{ raw: string; tokenId: string }> {
  const raw = randomToken();
  const { userAgent, ip } = metaValues(meta);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const { rows } = await client.query<{ token_id: string }>(
    `INSERT INTO refresh_tokens
       (user_id, family_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING token_id`,
    [userId, familyId, sha256(raw), userAgent, ip, expiresAt],
  );

  return { raw, tokenId: rows[0]!.token_id };
}

export async function issueSession(
  user: Pick<UserRow, "user_id" | "is_admin">,
  meta: SessionMeta,
): Promise<SessionTokens> {
  const client = await pool.connect();
  try {
    const familyId = randomUUID();
    const { raw } = await insertRefreshToken(client, user.user_id, familyId, meta);
    return {
      accessToken: signAccessToken(user),
      refreshToken: raw,
    };
  } finally {
    client.release();
  }
}

/**
 * Rotates a refresh token. A replayed (already-rotated) token revokes the whole
 * family, which turns a stolen-token replay into a forced re-login instead of
 * two live sessions.
 */
export async function rotateRefreshToken(
  rawToken: string,
  meta: SessionMeta,
): Promise<{ tokens: SessionTokens; user: UserRow }> {
  return withTransaction(async (client) => {
    const { rows: tokenRows } = await client.query<RefreshRow>(
      `SELECT token_id, user_id, family_id, expires_at, revoked_at, replaced_by
         FROM refresh_tokens
        WHERE token_hash = $1
        FOR UPDATE`,
      [sha256(rawToken)],
    );

    const token = tokenRows[0];
    if (!token) {
      throw unauthorized("Your session has expired. Please sign in again.", "REFRESH_INVALID");
    }

    if (token.revoked_at) {
      const ageMs = Date.now() - token.revoked_at.getTime();
      const withinGrace =
        Boolean(token.replaced_by) &&
        ageMs < env.REFRESH_REUSE_GRACE_SECONDS * 1000;

      if (withinGrace) {
        // A parallel request (page + prefetch, or two tabs) already rotated this
        // token. Mint another token for the same family instead of revoking the
        // whole chain. Outside the grace window this is treated as replay theft.
        const { rows: userRows } = await client.query<UserRow>(
          `SELECT * FROM users WHERE user_id = $1`,
          [token.user_id],
        );
        const user = userRows[0];
        if (!user) {
          throw unauthorized("Your account no longer exists.", "REFRESH_INVALID");
        }

        const { raw, tokenId } = await insertRefreshToken(
          client,
          user.user_id,
          token.family_id,
          meta,
        );

        await client.query(
          `UPDATE refresh_tokens SET replaced_by = $2 WHERE token_id = $1`,
          [token.token_id, tokenId],
        );

        return {
          tokens: { accessToken: signAccessToken(user), refreshToken: raw },
          user,
        };
      }

      await client.query(
        `UPDATE refresh_tokens
            SET revoked_at = now()
          WHERE family_id = $1 AND revoked_at IS NULL`,
        [token.family_id],
      );
      throw unauthorized("Your session was revoked. Please sign in again.", "REFRESH_REUSE");
    }

    if (token.expires_at.getTime() <= Date.now()) {
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = now() WHERE token_id = $1`,
        [token.token_id],
      );
      throw unauthorized("Your session has expired. Please sign in again.", "REFRESH_EXPIRED");
    }

    const { rows: userRows } = await client.query<UserRow>(
      `SELECT * FROM users WHERE user_id = $1`,
      [token.user_id],
    );
    const user = userRows[0];
    if (!user) {
      throw unauthorized("Your account no longer exists.", "REFRESH_INVALID");
    }

    const { raw, tokenId } = await insertRefreshToken(
      client,
      user.user_id,
      token.family_id,
      meta,
    );

    await client.query(
      `UPDATE refresh_tokens
          SET revoked_at = now(), replaced_by = $2
        WHERE token_id = $1`,
      [token.token_id, tokenId],
    );

    return {
      tokens: { accessToken: signAccessToken(user), refreshToken: raw },
      user,
    };
  });
}

export async function revokeRefreshToken(rawToken: string | undefined) {
  if (!rawToken) return;
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE family_id = (
        SELECT family_id FROM refresh_tokens WHERE token_hash = $1
      )
        AND revoked_at IS NULL`,
    [sha256(rawToken)],
  );
}

export async function revokeAllSessions(userId: string) {
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

export async function getActiveSessions(userId: string, currentRefreshToken?: string): Promise<ActiveSession[]> {
  const currentFamilyResult = currentRefreshToken
    ? await query<{ family_id: string }>(
        `SELECT family_id FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2`,
        [userId, sha256(currentRefreshToken)],
      )
    : { rows: [] as { family_id: string }[] };
  const currentFamily = currentFamilyResult.rows[0]?.family_id ?? null;
  const { rows } = await query<Omit<ActiveSession, "created_at" | "expires_at"> & { created_at: Date | string; expires_at: Date | string }>(
    `SELECT DISTINCT ON (family_id)
            family_id,
            user_agent,
            ip,
            created_at,
            expires_at,
            (family_id = $2) AS current
       FROM refresh_tokens
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
      ORDER BY family_id, created_at DESC`,
    [userId, currentFamily],
  );
  return rows
    .map((row) => ({ ...row, created_at: new Date(row.created_at).toISOString(), expires_at: new Date(row.expires_at).toISOString() }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.created_at.localeCompare(a.created_at));
}

export async function revokeOtherSessions(userId: string, currentRefreshToken: string) {
  const current = await query<{ family_id: string }>(
    `SELECT family_id FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL`,
    [userId, sha256(currentRefreshToken)],
  );
  const currentFamily = current.rows[0]?.family_id;
  if (!currentFamily) throw unauthorized("Your current session could not be identified. Sign in again.", "SESSION_MISSING");
  const result = await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = $1 AND family_id <> $2 AND revoked_at IS NULL`,
    [userId, currentFamily],
  );
  return result.rowCount ?? 0;
}
