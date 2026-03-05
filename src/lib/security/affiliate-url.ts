function parseAllowedHosts() {
  return (process.env.AFFILIATE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAffiliateUrlAllowed(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;

    const allowedHosts = parseAllowedHosts();
    if (allowedHosts.length === 0) return true;

    const host = url.hostname.toLowerCase();
    return allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}
