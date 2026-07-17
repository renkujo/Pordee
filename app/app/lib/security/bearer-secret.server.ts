import { createHash, timingSafeEqual } from "node:crypto";

export const hasValidBearerSecret = (
  request: Request,
  configuredSecret: string | undefined
) => {
  const secret = configuredSecret?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);

  const expectedDigest = createHash("sha256").update(secret).digest();
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedDigest, suppliedDigest);
};
