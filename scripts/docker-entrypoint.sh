#!/bin/sh
set -e

pnpm db:deploy
exec pnpm start
