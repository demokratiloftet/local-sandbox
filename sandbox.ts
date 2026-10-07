import { pathToFileURL } from "node:url";
import { z } from "zod";
// Deliberately hardcoded: this helper has no production/remote target option.
const base = "http://127.0.0.1:2583/xrpc/";
const collection = "app.bsky.feed.post";
const object = z.record(z.string(), z.unknown());
const sessionSchema = z.object({
  did: z.string().startsWith("did:"),
  accessJwt: z.string().min(1),
});
const recordRef = z.object({
  uri: z.string().startsWith("at://"),
  cid: z.string().min(1),
});
const recordsSchema = z.object({
  records: z.array(recordRef.extend({ value: object })),
});
export async function rpc(
  method: string,
  data?: Record<string, unknown>,
  token?: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(base + method, {
    method: data ? "POST" : "GET",
    headers: {
      ...(data && { "content-type": "application/json" }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    ...(data && { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(10000),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return object.parse(result);
}
export async function login(handle = "organiser.test") {
  if (!["organiser.test", "issuer.test"].includes(handle))
    throw new Error("Only seeded sandbox accounts allowed");
  return sessionSchema.parse(
    await rpc("com.atproto.server.createSession", {
      identifier: handle,
      password: "local-sandbox-only",
    }),
  );
}
export async function list() {
  return recordsSchema.parse(
    await rpc(
      `com.atproto.repo.listRecords?repo=organiser.test&collection=${collection}`,
    ),
  );
}
export async function post(text: string) {
  const session = await login();
  return recordRef.parse(
    await rpc(
      "com.atproto.repo.createRecord",
      {
        repo: session.did,
        collection,
        record: {
          $type: collection,
          text,
          createdAt: new Date().toISOString(),
        },
      },
      session.accessJwt,
    ),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, ...args] = process.argv.slice(2);
  const result =
    command === "post"
      ? await post(args.join(" ") || "Local sandbox test")
      : command === "list"
        ? await list()
        : command === "accounts"
          ? await rpc("com.atproto.sync.listRepos")
          : { usage: 'node dist/sandbox.js accounts | post "message" | list' };
  console.log(JSON.stringify(result, null, 2));
}
