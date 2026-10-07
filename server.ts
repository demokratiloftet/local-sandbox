import { TestNetworkNoAppView } from "@atproto/dev-env";
import { writeFile } from "node:fs/promises";

const network = await TestNetworkNoAppView.create({
  plc: { port: 2582 },
  pds: {
    port: 2583,
    hostname: "localhost",
    serviceHandleDomains: [".test"],
    crawlers: [],
    handleBackupNameservers: [],
    serviceName: "LOCAL-ONLY disposable sandbox",
    homeUrl: "http://localhost:2583",
    termsOfServiceUrl: "http://localhost:2583",
    privacyPolicyUrl: "http://localhost:2583",
    supportUrl: "http://localhost:2583",
  },
});

const accounts = [];
for (const handle of ["organiser.test", "issuer.test"]) {
  const agent = network.pds.getAgent();
  const response = await agent.createAccount({
    handle,
    email: `${handle}@example.invalid`,
    password: "local-sandbox-only",
  });
  accounts.push({ handle, did: response.data.did });
}
await writeFile("/tmp/sandbox-accounts.json", JSON.stringify(accounts));
console.log(
  JSON.stringify(
    {
      sandbox: "LOCAL ONLY: disposable, no public federation",
      pds: "http://127.0.0.1:2583",
      plc: "http://127.0.0.1:2582",
      accounts,
      note: "Accounts and records reset whenever the process restarts.",
    },
    null,
    2,
  ),
);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await network.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
