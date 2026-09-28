export function resolveBindHost(host: string | undefined, allowPrivateNetworkBind: string | undefined) {
  const selected = host?.trim() || "127.0.0.1";
  if (["127.0.0.1", "::1", "localhost"].includes(selected)) return selected;
  if (allowPrivateNetworkBind === "true") return selected;
  throw new Error("NETWORK_BIND_REQUIRES_EXPLICIT_OVERRIDE");
}
