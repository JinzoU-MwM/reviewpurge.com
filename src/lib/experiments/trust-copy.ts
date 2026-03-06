export type TrustCopyVariant = "control" | "verified";

export const TRUST_COPY_EXPERIMENT_ID = "trust_copy_v1";
export const TRUST_COPY_COOKIE = "rp_exp_trust_v1";
export const SESSION_COOKIE = "rp_session_id";

export function isTrustCopyVariant(value: string | undefined): value is TrustCopyVariant {
  return value === "control" || value === "verified";
}

export function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function assignTrustCopyVariant(sessionId: string): TrustCopyVariant {
  const hash = hashSeed(`${TRUST_COPY_EXPERIMENT_ID}:${sessionId}`);
  return hash % 2 === 0 ? "control" : "verified";
}

export function getTrustCopyPayload(variant: TrustCopyVariant) {
  if (variant === "verified") {
    return {
      trustLine: "Verified picks with transparent RP scoring.",
      trustChip: "Verified Picks",
      scoreLabel: "Verified",
    };
  }

  return {
    trustLine: "Independent review + affiliate disclosure di setiap rekomendasi.",
    trustChip: "Independent Review",
    scoreLabel: "RP",
  };
}
