import net from "node:net";
// Fixed destinations only. No general CONNECT, HTTP proxy or DNS forwarding.
for (const port of [2582, 2583]) {
  net
    .createServer((client) => {
      const upstream = net.connect({ host: "172.30.83.2", port });
      const close = () => {
        client.destroy();
        upstream.destroy();
      };
      client.on("error", close);
      upstream.on("error", close);
      client.on("close", () => upstream.destroy());
      upstream.on("close", () => client.destroy());
      client.pipe(upstream).pipe(client);
    })
    .listen(port, "0.0.0.0");
}
console.log(
  "Loopback-host ingress gateway; only sandbox PDS/PLC upstreams allowed",
);
