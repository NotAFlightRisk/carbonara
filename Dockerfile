# Built once on the native platform; the output is plain JS, so arm64 never has to emulate
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV ADAPTER=node
ARG PUBLIC_PLAUSIBLE_SCRIPT
ARG PUBLIC_SENTRY_DSN
RUN npm run build && npm prune --omit=dev

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
