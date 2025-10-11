#!/usr/bin/env bash
set -e

echo "🧹 Cleaning previous builds..."
rm -rf .next nextjs-deploy.zip deploy/

echo "⚙️ Building the Next.js app..."
npm run build

echo "📁 Preparing deploy directory..."
mkdir -p deploy

# Copy everything from standalone — includes server.js and node_modules
cp -r .next/standalone/* deploy/
cp -r .next/standalone/.next deploy/
cp -r .next/static deploy/.next

rm -rf deploy/node_modules

# Optional: include env/configs
# [ -d public ] && cp -r public deploy/
[ -f .env.local ] && cp .env.local deploy/
[ -f next.config.mjs ] && cp next.config.mjs deploy/
[ -f package.json ] && cp package.json deploy/
[ -f package-lock.json ] && cp package-lock.json deploy/

# Zip it up
echo "📦 Zipping..."
# ouch compress deploy nextjs-deploy.zip > /dev/null
tar -czf nextjs-deploy.tar.gz deploy
echo "✅ Done. You can now upload 'nextjs-deploy.zip' to cPanel and extract it."
