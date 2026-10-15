# local-sandbox

Run a disposable **AT Protocol PDS and local PLC identity directory** on your laptop.
Use it to experiment with records and build apps with synthetic accounts.
The source repository is public; the running services stay on `127.0.0.1`.
No GitHub invitation, PDS account or Tailscale access is needed.

## Quick start

Install **Docker with Compose**, **Git** and **Node.js 24.17.0** (see `.node-version`).
Start Docker, then run:

```sh
git clone https://github.com/demokratiloftet/local-sandbox.git
cd local-sandbox
npm ci
npm run build
npm run up
npm run verify
```

The first build downloads dependencies and can take a few minutes. Verification
checks isolation and creates, reads and removes a synthetic record.
Leave the sandbox running while you work on your app.

| Service                | Address               |
| ---------------------- | --------------------- |
| PDS API                | http://127.0.0.1:2583 |
| PLC identity directory | http://127.0.0.1:2582 |

Two accounts are created automatically: `organiser.test` and `issuer.test`.
Both use the disposable fixture password **`local-sandbox-only`**.
This is an API development environment; it does not include a social app,
Bluesky feed or AppView. Runtime services do not connect to the public network.

**Accounts, DIDs and records reset whenever the sandbox restarts.** Keep repeatable
scenarios in fixture code. Do not store real personal data or account credentials.

## Connect an app

Use your own app or the [app-protospace starter](https://github.com/demokratiloftet/app-protospace).
The starter's [PDS guide](https://github.com/demokratiloftet/app-protospace/blob/main/docs/integrations.md#run-the-local-sandbox-instead)
explains the complete flow. In the starter's `.env`, set:

```dotenv
PDS_URL=http://127.0.0.1:2583
PDS_IDENTIFIER=organiser.test
PDS_APP_PASSWORD=local-sandbox-only
```

In the **app directory**, run `pnpm pds:demo` to write, read and delete a test
record. Run or restart `pnpm dev` to develop the UI and backend. The app uses pnpm;
this separate sandbox uses npm with its committed `package-lock.json`.
Several local apps can use the same PDS and agree on a shared record format.

You can also point an AT Protocol client such as `@atproto/api` at the PDS URL
and sign in with either fixture account. `sandbox.ts` provides a local-only CLI:

```sh
node dist/sandbox.js accounts
node dist/sandbox.js post "Hello from my local sandbox"
node dist/sandbox.js list
```

The `post` command leaves its test record in the fixture until you delete it or
restart. The verification script removes the record it creates.

## Stop, inspect and troubleshoot

From the sandbox directory:

```sh
curl --fail http://127.0.0.1:2583/xrpc/_health
npm run logs
npm run down
```

`npm run down` stops only this project's containers and removes its networks.
It discards fixture data. Check ports 2582 and 2583 are free before starting;
do not stop another person's environment or publish the sandbox on a LAN/public
address to resolve a conflict. If verification fails, inspect its first failing
check and Docker logs before relying on the environment's isolation.

## Isolation and limits

- Host ports bind only to `127.0.0.1`. The PDS/PLC container has no published ports
  and sits on an internal Docker network.
- A fixed TCP gateway forwards only to the sandbox's PDS and PLC. It is not a
  general proxy and does not forward DNS.
- IPv4/IPv6 firewall rules block new outbound connections, including Docker DNS.
  Startup fails if the rules cannot be installed. Processes then run as an
  unprivileged user with all capabilities removed.
- There are no Docker socket or private host-directory mounts. Data and signing
  keys are temporary. Test identities use the local PLC; the crawler list is empty.
- Ordinary repository records can be read by local clients that reach the PDS.
  This setup does not add private-record semantics to AT Protocol.

Keep these boundaries when changing the fixture. Do not remove the firewall,
attach the PDS to an external network, register fixture identities in the public
PLC, or expose the sandbox through a public tunnel. Builds download packages;
the running fixture is isolated. Dependencies use pinned versions and documented
compatibility overrides; unused telemetry/mail/image integrations are not tested.

## Move to a hosted app

Deploy the app to your chosen host and connect it to a PDS that host can reach.
A laptop's `127.0.0.1` is not reachable from a VPS. Change the service URL and
credentials, create new test data, and update saved DID/record references.
Accounts, identities and records do **not** migrate automatically. Keep this
local fixture isolated when sharing your app.

## Development checks

```sh
npm run typecheck
npm run format:check
npm audit --audit-level=moderate
npm run verify
```

CI starts a fresh sandbox and runs the same checks. `verify.sh` tests outbound
IPv4/IPv6 and DNS blocking in both containers, unprivileged processes, a real
record's create/read/delete flow, local DID resolution, and Docker network/mount/
port restrictions. Source and checks are TypeScript; containers run compiled
JavaScript from `dist/`.

| File                                    | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `server.ts`                             | Start the PDS/PLC and create fixture accounts |
| `gateway.ts`                            | Fixed TCP forwarding to the local services    |
| `sandbox.ts`                            | Local CLI and record helpers                  |
| `smoke-test.ts`                         | Record and identity checks                    |
| `isolation-test.ts`, `topology-test.ts` | Network, privilege and container checks       |
| `verify.sh`                             | Run the verification suite                    |
| `entrypoint.sh`                         | Install firewall rules and drop privileges    |
| `compose.yml`, `Dockerfile`             | Container definitions and build               |

Built with [`@atproto/dev-env`](https://github.com/bluesky-social/atproto/tree/main/packages/dev-env).
See also the [AT Protocol development guide](https://github.com/bluesky-social/atproto/blob/main/CONTRIBUTING.md).
