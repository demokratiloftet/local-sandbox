// Deliberately hardcoded: this helper has no production/remote target option.
const base = 'http://127.0.0.1:2583/xrpc/';
const collection = 'app.bsky.feed.post';
export async function rpc(method, data, token) {
  const response = await fetch(base + method, {
    method: data ? 'POST' : 'GET',
    headers: { ...(data && {'content-type':'application/json'}), ...(token && {authorization:`Bearer ${token}`}) },
    ...(data && {body:JSON.stringify(data)}),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}
export async function login(handle = 'organiser.test') {
  if (!['organiser.test','issuer.test'].includes(handle)) throw new Error('Only seeded sandbox accounts allowed');
  return rpc('com.atproto.server.createSession', {identifier:handle,password:'local-sandbox-only'});
}
export async function list() {
  return rpc(`com.atproto.repo.listRecords?repo=organiser.test&collection=${collection}`);
}
export async function post(text) {
  const session = await login();
  return rpc('com.atproto.repo.createRecord', {
    repo: session.did, collection,
    record: {$type:collection,text,createdAt:new Date().toISOString()},
  }, session.accessJwt);
}
if (process.argv[1]?.endsWith('/sandbox.mjs')) {
  const [command, ...args] = process.argv.slice(2);
  const result = command === 'post' ? await post(args.join(' ') || 'Local sandbox test')
    : command === 'list' ? await list()
    : command === 'accounts' ? await rpc('com.atproto.sync.listRepos')
    : {usage:'node sandbox.mjs accounts | post "message" | list'};
  console.log(JSON.stringify(result,null,2));
}
