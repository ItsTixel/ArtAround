#!/usr/bin/env bash
set -euo pipefail

git pull origin main
cd navigator
npm run build
