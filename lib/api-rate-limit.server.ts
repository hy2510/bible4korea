import "server-only";

import {
  getClientAddress,
} from "@/lib/auth/api.server";
import { hashClientAddress } from "@/lib/auth/recovery.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

interface LocalBucket {
  count: number;
  expiresAt: number;
}

const localBuckets = new Map<string, LocalBucket>();
const MAX_LOCAL_BUCKETS = 10_000;

function consumeLocalBucket(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const current = localBuckets.get(bucketKey);
  if (!current || current.expiresAt <= now) {
    if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
      for (const [key, bucket] of localBuckets) {
        if (bucket.expiresAt <= now) localBuckets.delete(key);
      }
      if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
        const oldestKey = localBuckets.keys().next().value;
        if (oldestKey) localBuckets.delete(oldestKey);
      }
    }
    localBuckets.set(bucketKey, {
      count: 1,
      expiresAt: now + windowSeconds * 1_000,
    });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(
        1,
        Math.ceil((current.expiresAt - now) / 1_000),
      ),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function checkPublicApiRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const clientHash = hashClientAddress(getClientAddress(request));
  const bucketKey = `${scope}:${clientHash}`;
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase.rpc("consume_api_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error) {
      return {
        allowed: data === true,
        retryAfter: data === true ? 0 : windowSeconds,
      };
    }
  }

  return consumeLocalBucket(bucketKey, limit, windowSeconds);
}

export function rateLimitResponse(retryAfter: number): Response {
  return Response.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
