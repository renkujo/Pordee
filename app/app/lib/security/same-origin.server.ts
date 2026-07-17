export const hasTrustedRequestOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const suppliedOrigin = new URL(origin).origin;
    if (
      process.env.NODE_ENV !== "production" &&
      suppliedOrigin === new URL(request.url).origin
    ) {
      return true;
    }
    const configuredOrigin = process.env.BETTER_AUTH_URL
      ? new URL(process.env.BETTER_AUTH_URL).origin
      : new URL(request.url).origin;
    return suppliedOrigin === configuredOrigin;
  } catch {
    return false;
  }
};
