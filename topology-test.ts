import assert from "node:assert/strict";
import { z } from "zod";
let input = "";
for await (const chunk of process.stdin) input += String(chunk);
const networkSchema = z.object({ Internal: z.boolean() });
const containerSchema = z.object({
  NetworkSettings: z.object({ Networks: z.record(z.string(), z.unknown()) }),
  HostConfig: z.object({
    PortBindings: z
      .record(z.string(), z.array(z.object({ HostIp: z.string() })).nullable())
      .nullable(),
    Privileged: z.boolean(),
    ReadonlyRootfs: z.boolean(),
  }),
  Mounts: z.array(z.object({ Destination: z.string() })),
});
if (process.argv[2] === "network") {
  const [network] = z.array(networkSchema).min(1).parse(JSON.parse(input));
  assert.equal(network.Internal, true);
  console.log("PASS isolated Docker network");
} else {
  const [container] = z.array(containerSchema).min(1).parse(JSON.parse(input));
  assert.equal(container.HostConfig.Privileged, false);
  assert.equal(container.HostConfig.ReadonlyRootfs, true);
  assert(!container.Mounts.some((m) => m.Destination.includes("docker.sock")));
  if (process.argv[2] === "backend") {
    assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [
      "loftet-isolated-sandbox_isolated",
    ]);
    assert.equal(
      Object.keys(container.HostConfig.PortBindings ?? {}).length,
      0,
    );
    console.log(
      "PASS backend confined to internal network with no published ports",
    );
  } else if (process.argv[2] === "gateway") {
    assert.equal(Object.keys(container.NetworkSettings.Networks).length, 2);
    for (const bindings of Object.values(
      container.HostConfig.PortBindings ?? {},
    )) {
      assert(bindings?.length);
      for (const binding of bindings) assert.equal(binding.HostIp, "127.0.0.1");
    }
    console.log(
      "PASS loopback-only published ports, read-only root, no Docker socket",
    );
  } else throw new Error("Expected backend, gateway or network");
}
