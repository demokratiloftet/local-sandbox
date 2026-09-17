#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker compose exec -T --user node atproto node /sandbox/isolation-test.mjs
docker compose exec -T --user node gateway node /sandbox/isolation-test.mjs
node smoke-test.mjs
backend=$(docker compose ps -q atproto)
docker inspect "$backend" | node --input-type=module -e '
import assert from "node:assert/strict";
let input=""; for await (const s of process.stdin) input+=s;
const c=JSON.parse(input)[0];
assert.deepEqual(Object.keys(c.NetworkSettings.Networks),["loftet-isolated-sandbox_isolated"]);
assert.equal(Object.keys(c.HostConfig.PortBindings??{}).length,0);
assert.equal(c.HostConfig.Privileged,false);
assert.equal(c.HostConfig.ReadonlyRootfs,true);
assert(!c.Mounts.some(m=>m.Destination.includes("docker.sock")));
console.log("PASS backend confined to internal network with no published ports");
'
container=$(docker compose ps -q gateway)
docker inspect "$container" | node --input-type=module -e '
import assert from "node:assert/strict";
let input=""; for await (const s of process.stdin) input+=s;
const c=JSON.parse(input)[0];
assert.equal(c.HostConfig.Privileged,false);
assert.equal(c.HostConfig.ReadonlyRootfs,true);
assert.equal(Object.keys(c.NetworkSettings.Networks).length,2);
for(const bindings of Object.values(c.HostConfig.PortBindings))
  for(const b of bindings) assert.equal(b.HostIp,"127.0.0.1");
assert(!c.Mounts.some(m=>m.Destination.includes("docker.sock")));
console.log("PASS loopback-only published ports, read-only root, no Docker socket");
'
docker network inspect loftet-isolated-sandbox_isolated | node --input-type=module -e '
import assert from "node:assert/strict";
let input=""; for await (const s of process.stdin) input+=s;
assert.equal(JSON.parse(input)[0].Internal,true);
console.log("PASS isolated Docker network");
'
