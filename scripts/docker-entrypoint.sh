#!/bin/sh
set -e

pnpm db:deploy
pnpm db:seed
exec node dist/src/main.js
