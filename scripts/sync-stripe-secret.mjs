#!/usr/bin/env node
// scripts/sync-stripe-secret.mjs
//
// Spawns `stripe listen`, tails its output for the webhook signing secret,
// and upserts STRIPE_WEBHOOK_SECRET into .env whenever it changes.
//
// Next.js dev watches .env files and reloads when they change, so the
// running dev server picks up the new secret automatically.
//
// NOTE: the Stripe CLI writes its banner (including the whsec_…) to stderr,
// not stdout. Both streams therefore feed the same buffer.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env');
const ENV_KEY = 'STRIPE_WEBHOOK_SECRET';
const FORWARD_TO = 'http://localhost:3000/api/webhooks/stripe';

const isWindows = process.platform === 'win32';

// On Windows, the Stripe CLI is often dropped into the repo root as stripe.exe.
// Prefer that over the PATH lookup so this just works without PATH fiddling.
const stripeBin = (() => {
    if (isWindows) {
        const local = resolve(process.cwd(), 'stripe.exe');
        if (existsSync(local)) return local;
    }
    return 'stripe';
})();

function upsertEnv(key, value) {
    const current = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');

    const next = re.test(current)
        ? current.replace(re, line)
        : (current.trimEnd() + '\n' + line + '\n').replace(/^\n/, '');

    writeFileSync(ENV_FILE, next, 'utf8');
}

console.log(`[stripe-sync] using binary: ${stripeBin}`);
console.log(`[stripe-sync] forwarding to ${FORWARD_TO}\n`);

const child = spawn(
    stripeBin,
    ['listen', '--forward-to', FORWARD_TO],
    { stdio: ['ignore', 'pipe', 'pipe'] },
);

let lastSecret = null;
let buffer = '';

function handleChunk(chunk) {
    const text = chunk.toString();
    process.stdout.write(text);

    // Keep only the tail — the secret appears near the top of the banner
    // and we don't want to grow this buffer for the life of the session.
    buffer += text;
    if (buffer.length > 8192) buffer = buffer.slice(-4096);

    const match = buffer.match(/whsec_[A-Za-z0-9]+/);
    if (match && match[0] !== lastSecret) {
        lastSecret = match[0];
        upsertEnv(ENV_KEY, lastSecret);
        console.log(
            `\n[stripe-sync] wrote ${ENV_KEY}=${lastSecret} to .env\n`,
        );
    }
}

// The Stripe CLI writes its banner to stderr, so both streams feed the buffer.
child.stdout.on('data', handleChunk);
child.stderr.on('data', handleChunk);

child.on('exit', (code, signal) => {
    if (signal) console.log(`[stripe-sync] stripe listen killed (${signal})`);
    else console.log(`[stripe-sync] stripe listen exited with code ${code}`);
    process.exit(code ?? 0);
});

// Forward Ctrl+C cleanly.
for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => child.kill(sig));
}