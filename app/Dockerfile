# Build dalla radice del repository:  docker build -f app/Dockerfile -t polizza-chiara .
FROM node:22-slim AS build
WORKDIR /repo/app
COPY app/package.json app/package-lock.json ./
COPY app/client/package.json client/
COPY app/server/package.json server/
RUN npm ci
COPY app ./
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
WORKDIR /repo/app
COPY --from=build /repo/app ./
COPY agents /repo/agents
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
USER node
CMD ["npm", "start"]
