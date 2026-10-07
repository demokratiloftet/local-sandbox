import assert from "node:assert/strict";
import { z } from "zod";
import { rpc, login, post, list } from "./sandbox.ts";
const text = `Sandbox smoke test ${Date.now()}`;
const created = await post(text);
const listed = await list();
assert(
  listed.records.some((r) => r.uri === created.uri && r.value.text === text),
);
const session = await login();
const didDoc = z
  .object({
    id: z.string(),
    service: z.array(z.object({ serviceEndpoint: z.string() })),
  })
  .parse(
    await fetch(`http://127.0.0.1:2582/${session.did}`).then((r) => r.json()),
  );
assert.equal(didDoc.id, session.did);
assert(
  didDoc.service.every((s) =>
    s.serviceEndpoint.startsWith("http://localhost:"),
  ),
);
await rpc(
  "com.atproto.repo.deleteRecord",
  {
    repo: session.did,
    collection: "app.bsky.feed.post",
    rkey: created.uri.split("/").at(-1),
  },
  session.accessJwt,
);
assert(!(await list()).records.some((r) => r.uri === created.uri));
console.log(
  "PASS create/read/delete real PDS record and resolve DID in local PLC",
);
