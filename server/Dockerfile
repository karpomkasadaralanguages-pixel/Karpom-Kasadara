Last login: Sat Aug 29 21:57:17 on ttys000
anto_@MacBook-Air ~ % ssh root@62.72.57.204
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.8.0-137-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro


Expanded Security Maintenance for Applications is not enabled.

0 updates can be applied immediately.

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status


*** System restart required ***
Last login: Wed Sep  2 03:22:23 2026 from 187.15.153.171
root@srv1918193:~# cd /opt/karpom-kasadara
git status
fatal: detected dubious ownership in repository at '/opt/karpom-kasadara'
To add an exception for this directory, call:

	git config --global --add safe.directory /opt/karpom-kasadara
root@srv1918193:/opt/karpom-kasadara# cd /opt/karpom-kasadara
git status
fatal: detected dubious ownership in repository at '/opt/karpom-kasadara'
To add an exception for this directory, call:

	git config --global --add safe.directory /opt/karpom-kasadara
root@srv1918193:/opt/karpom-kasadara# git config --global --add safe.directory /opt/karpom-kasadara
git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   server/Dockerfile

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docker-compose.yml

no changes added to commit (use "git add" and/or "git commit -a")
root@srv1918193:/opt/karpom-kasadara# git check-ignore -v server/.env
.gitignore:2:.env	server/.env
root@srv1918193:/opt/karpom-kasadara# git add server/Dockerfile docker-compose.yml
git commit -m "Fix Dockerfile for Alpine OpenSSL/Node22, add docker-compose for Hostinger VPS"
git push origin main
[main f271dd7] Fix Dockerfile for Alpine OpenSSL/Node22, add docker-compose for Hostinger VPS
 Committer: root <root@srv1918193.hstgr.cloud>
Your name and email address were configured automatically based
on your username and hostname. Please check that they are accurate.
You can suppress this message by setting them explicitly:

    git config --global user.name "Your Name"
    git config --global user.email you@example.com

After doing this, you may fix the identity used for this commit with:

    git commit --amend --reset-author

 2 files changed, 36 insertions(+), 4 deletions(-)
 create mode 100644 docker-compose.yml
Username for 'https://github.com': Read from remote host 62.72.57.204: Operation timed out
Connection to 62.72.57.204 closed.
client_loop: send disconnect: Broken pipe
anto_@MacBook-Air ~ % ssh root@62.72.57.204
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.8.0-137-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro


Expanded Security Maintenance for Applications is not enabled.

15 updates can be applied immediately.
To see these additional updates run: apt list --upgradable

Enable ESM Apps to receive additional future security updates.
See https://ubuntu.com/esm or run: sudo pro status


*** System restart required ***
Last login: Thu Sep  3 13:20:31 2026 from 187.15.153.135
root@srv1918193:~# 3cZ5)r3.n.Ks#Ee0
-bash: syntax error near unexpected token `)'
root@srv1918193:~# find / -maxdepth 4 -iname "docker-compose.yml" 2>/dev/null
/opt/karpom-kasadara/docker-compose.yml
root@srv1918193:~# cd /path/found/above
git status
git log -1 --format="%H %s"
-bash: cd: /path/found/above: No such file or directory
fatal: not a git repository (or any of the parent directories): .git
fatal: not a git repository (or any of the parent directories): .git
root@srv1918193:~# cd /opt/karpom-kasadara
git status
git log -1 --format="%H %s"
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
f271dd7711990715d94e5f63fef75ed455a39313 Fix Dockerfile for Alpine OpenSSL/Node22, add docker-compose for Hostinger VPS
root@srv1918193:/opt/karpom-kasadara# git log -1 --format="%H %s"
f271dd7711990715d94e5f63fef75ed455a39313 Fix Dockerfile for Alpine OpenSSL/Node22, add docker-compose for Hostinger VPS
root@srv1918193:/opt/karpom-kasadara# cd /path/to/your/local/project
git log -1 --format="%H %s"
git status
-bash: cd: /path/to/your/local/project: No such file or directory
f271dd7711990715d94e5f63fef75ed455a39313 Fix Dockerfile for Alpine OpenSSL/Node22, add docker-compose for Hostinger VPS
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
root@srv1918193:/opt/karpom-kasadara# cd /opt/karpom-kasadara
git push origin main
Username for 'https://github.com': karpomkasadaralanguages@gmail.com
Password for 'https://karpomkasadaralanguages%40gmail.com@github.com': 
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/karpomkasadaralanguages-pixel/Karpom-Kasadara.git/'
root@srv1918193:/opt/karpom-kasadara# git push origin main
Username for 'https://github.com': karpomkasadaralanguages-pixel
Password for 'https://karpomkasadaralanguages-pixel@github.com': 
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/karpomkasadaralanguages-pixel/Karpom-Kasadara.git/'
root@srv1918193:/opt/karpom-kasadara# cat /opt/karpom-kasadara/Dockerfile
cat /opt/karpom-kasadara/docker-compose.yml
cat: /opt/karpom-kasadara/Dockerfile: No such file or directory
services:
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    image: karpom-kasadara-api:latest
    container_name: karpom-kasadara-api
    restart: unless-stopped
    env_file:
      - ./server/.env
    environment:
      - PORT=3000
      - NODE_ENV=production
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
root@srv1918193:/opt/karpom-kasadara# cd /opt/karpom-kasadara
git show --stat HEAD
commit f271dd7711990715d94e5f63fef75ed455a39313 (HEAD -> main)
Author: root <root@srv1918193.hstgr.cloud>
Date:   Thu Sep 3 13:24:25 2026 +0000

    Fix Dockerfile for Alpine OpenSSL/Node22, add docker-compose for Hostinger VPS

 docker-compose.yml | 26 ++++++++++++++++++++++++++
 server/Dockerfile  | 14 ++++++++++----
 2 files changed, 36 insertions(+), 4 deletions(-)
root@srv1918193:/opt/karpom-kasadara# cat docker-compose.yml
services:
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    image: karpom-kasadara-api:latest
    container_name: karpom-kasadara-api
    restart: unless-stopped
    env_file:
      - ./server/.env
    environment:
      - PORT=3000
      - NODE_ENV=production
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
root@srv1918193:/opt/karpom-kasadara# cat server/Dockerfile
# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Prisma's engine needs OpenSSL to detect the correct binary target
RUN apk add --no-cache openssl

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate

# ── Production stage ─────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Prisma's engine needs OpenSSL at runtime too
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
root@srv1918193:/opt/karpom-kasadara# # ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Prisma's engine needs OpenSSL to detect the correct binary target
RUN apk add --no-cache openssl

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate

# ── Production stage ─────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Prisma's engine needs OpenSSL at runtime too
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src

CMD ["node", "src/index
FROM: command not found
WORKDIR: command not found
RUN: command not found
COPY: command not found
RUN: command not found
COPY: command not found
RUN: command not found
FROM: command not found
WORKDIR: command not found
RUN: command not found
ENV: command not found
COPY: command not found
COPY: command not found
COPY: command not found
COPY: command not found
EXPOSE: command not found
> cat server/Dockerfile
> ^C
root@srv1918193:/opt/karpom-kasadara# ^C
root@srv1918193:/opt/karpom-kasadara# cd /opt/karpom-kasadara
less server/Dockerfile


# Prisma's engine needs OpenSSL to detect the correct binary target
RUN apk add --no-cache openssl

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate

# ── Production stage ─────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Prisma's engine needs OpenSSL at runtime too
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
(END)
