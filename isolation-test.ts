import net from "node:net";
import dns from "node:dns/promises";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";

function reachable(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1500);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}
assert(await reachable("127.0.0.1", 2583), "Local PDS must work");
assert(await reachable("127.0.0.1", 2582), "Local PLC must work");
for (const [host, port] of [
  ["1.1.1.1", 443],
  ["8.8.8.8", 53],
  ["2606:4700:4700::1111", 443],
] as const) {
  assert.equal(
    await reachable(host, port),
    false,
    `Egress unexpectedly open: ${host}:${port}`,
  );
  console.log(`PASS blocked outbound ${host}:${port}`);
}
for (const server of ["127.0.0.11", "1.1.1.1"]) {
  const resolver = new dns.Resolver({ timeout: 700, tries: 1 });
  resolver.setServers([server]);
  let resolved = false;
  try {
    await resolver.resolve4("example.com");
    resolved = true;
  } catch {}
  assert.equal(resolved, false, `DNS unexpectedly open via ${server}`);
  console.log(`PASS blocked DNS via ${server}`);
}
const status = await readFile("/proc/self/status", "utf8");
assert.match(status, /CapEff:\s+0+\n/);
let checkedApp = false;
for (const pid of (await readdir("/proc")).filter((p) => /^\d+$/.test(p))) {
  try {
    const command = await readFile(`/proc/${pid}/cmdline`, "utf8");
    if (
      !command.includes("/sandbox/dist/server.js") &&
      !command.includes("/sandbox/dist/gateway.js")
    )
      continue;
    const appStatus = await readFile(`/proc/${pid}/status`, "utf8");
    assert.match(appStatus, /CapEff:\s+0+\n/);
    assert.match(appStatus, /CapBnd:\s+0+\n/);
    checkedApp = true;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
}
assert(checkedApp, "Must find capability-free application process");
console.log("PASS unprivileged test process; local PDS and PLC reachable");
