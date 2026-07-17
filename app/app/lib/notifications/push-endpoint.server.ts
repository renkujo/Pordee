import { lookup } from "node:dns/promises";
import { Agent, type AgentOptions } from "node:https";
import { BlockList, isIP } from "node:net";

const blockedAddresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:3::", 32],
  ["2001:4:112::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:30::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

export const createPublicPushAgent = async (endpoint: string) => {
  const url = new URL(endpoint);
  if (!isSafePushEndpointUrl(url)) return null;

  const literalFamily = isIP(url.hostname);
  const addresses = literalFamily
    ? [{ address: url.hostname, family: literalFamily }]
    : await lookupWithTimeout(url.hostname);
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) => !isPublicIpAddress(address, family))
  ) {
    return null;
  }

  const pinned = addresses[0];
  const pinnedLookup: AgentOptions["lookup"] = (
    _hostname,
    options,
    callback
  ) => {
    if (typeof options === "object" && options.all) {
      const callbackWithAddresses = callback as unknown as (
        error: NodeJS.ErrnoException | null,
        addresses: Array<{ address: string; family: number }>
      ) => void;
      callbackWithAddresses(null, [pinned]);
      return;
    }
    callback(null, pinned.address, pinned.family);
  };
  return new Agent({ keepAlive: false, lookup: pinnedLookup });
};

export const isSafePushEndpointUrl = (url: URL) => {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false;
  }
  if (isIP(hostname)) {
    return isPublicIpAddress(hostname, isIP(hostname));
  }
  return hostname.length > 0;
};

export const isPublicIpAddress = (address: string, family = isIP(address)) => {
  if (family === 4) return !blockedAddresses.check(address, "ipv4");
  if (family !== 6) return false;

  const firstSegment = Number.parseInt(address.split(":")[0] || "0", 16);
  const isGlobalUnicast = firstSegment >= 0x2000 && firstSegment <= 0x3fff;
  return (
    isGlobalUnicast && !blockedAddresses.check(address.toLowerCase(), "ipv6")
  );
};

const lookupWithTimeout = async (hostname: string) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("push endpoint DNS lookup timed out")),
          2_000
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
