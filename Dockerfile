FROM node:24.17.0-bookworm-slim@sha256:862263c612aa437e3037674b85419622a9d93bff80aa1eee5398dfe686375532 AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /sandbox
COPY package.json package-lock.json ./
RUN npm ci
COPY *.ts tsconfig.json ./
RUN npm run build && npm prune --omit=dev

FROM node:24.17.0-bookworm-slim@sha256:862263c612aa437e3037674b85419622a9d93bff80aa1eee5398dfe686375532
RUN apt-get update && apt-get install -y --no-install-recommends iptables util-linux ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /sandbox
COPY --from=build /sandbox/node_modules ./node_modules
COPY --from=build /sandbox/dist ./dist
COPY package.json entrypoint.sh ./
RUN chmod 755 entrypoint.sh
ENTRYPOINT ["/sandbox/entrypoint.sh"]
