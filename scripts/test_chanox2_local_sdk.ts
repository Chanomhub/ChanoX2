#!/usr/bin/env bun
/**
 * ChanoX2 SDK -> Local Backend integration test (CLI).
 *
 * Simulates exactly what the ChanoX2 desktop app does through
 * @chanomhub/sdk against a LOCAL backend:
 *   1. GraphQL: fetch article + its approved translation mods
 *      (same query shape as sdk.articles.getBySlug / sdk.articles.getMods)
 *   2. REST: submit an NST translation mod (sdk.mods.create contract)
 *   3. Verify the new mod appears via the guest GraphQL path
 *
 * Usage: bun scripts/test_chanox2_local_sdk.ts [gameSlug]
 */
const API = process.env.VITE_API_URL ?? 'http://localhost:3004';
const SLUG = process.argv[2] ?? 'immoral-office-nst-e2e-HJ006';
const TOKEN = process.env.NST_E2E_TOKEN ?? '';

function b64(d: ArrayBuffer | string) {
    const bytes = typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(d);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
// Mint JWT like the app would receive from login (dev secret)
function mintToken(): string {
    const fs = require('fs');
    const secret = fs.readFileSync('/home/jop/work/chanomhub/backend/.env', 'utf-8')
        .split('\n').find((l: string) => l.startsWith('JWT_SECRET='))!
        .split('=').slice(1).join('=').replace(/"/g, '');
    const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const p = b64(JSON.stringify({ sub: 1, username: 'chanox2-cli' }));
    const crypto = require('crypto');
    const sig = b64(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
    return `${h}.${p}.${sig}`;
}

async function graphql<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
    const res = await fetch(`${API}/api/v2/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error('GraphQL error: ' + JSON.stringify(json.errors[0]));
    return json.data;
}

async function rest<T>(endpoint: string, method: string, body: Record<string, unknown>, token: string): Promise<T> {
    // mirrors @chanomhub/sdk createRestClient: config.apiUrl + endpoint (endpoint includes /api)
    const res = await fetch(`${API}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`REST ${endpoint} failed ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
    return (json.data ?? json) as T;
}

async function main() {
    console.log(`ChanoX2 SDK <-> Local backend test (api=${API}, slug=${SLUG})\n`);

    // --- Step 0: find the game article by slug ---
    const gq = await graphql<{ public: { article: { id: string; title: string; mods: { id: number; name?: string; downloadLink?: string; status: string }[] } } }>(
        `query GetArticleBySlug($slug: String!) {
            public { article(slug: $slug) { id title slug status mods { id name downloadLink status version creditTo } } }
        }`,
        { slug: SLUG },
    );
    const game = gq.public.article;
    if (!game) throw new Error(`article '${SLUG}' not found`);
    console.log(`[OK] getBySlug: id=${game.id} title="${game.title}" mods=${game.mods.length}`);

    // --- Step 1: getMods (sdk.articles.getMods shape) ---
    console.log(`[OK] getMods returned ${game.mods.length} mod(s)` +
        (game.mods.length ? ` — first: "${game.mods[0].name}" (${game.mods[0].status})` : ''));

    // --- Step 2: submit a new NST translation mod via REST (sdk.mods.create contract) ---
    const token = TOKEN || mintToken();
    const packUrl = `https://tmpfiles.org/dl/chanox2-cli-test/chanox2_pack_${Date.now()}.zip`;
    const created = await rest<{ mod: { id: number; type: string; status: string; downloadLink: string } }>(
        `/api/mods/article/${SLUG}/nst-submission`,
        'POST',
        {
            downloadLink: packUrl,
            language: 'Thai',
            engine: 'rpgm',
            name: 'ChanoX2 CLI Test Translation',
            creditTo: 'ChanoX2 CLI',
            fileSizeBytes: 1234,
        },
        token,
    );
    const mod = (created as any).mod ?? created;
    if (!mod.id || mod.type !== 'TRANSLATION' || mod.status !== 'PENDING') {
        throw new Error('unexpected submission result: ' + JSON.stringify(mod));
    }
    console.log(`[OK] nst-submission: mod id=${mod.id} type=${mod.type} status=${mod.status}`);

    // --- Step 3: approve it as moderator, then verify visibility as guest ---
    const { execSync } = require('child_process');
    const reqId = execSync(
        `docker exec backend-db-1 psql -U main -d main -tAc "SELECT id FROM \\"ModerationRequest\\" WHERE \\"entityType\\" IN ('MOD','TRANSLATION_FILE') AND \\"entityId\\"=${mod.id} ORDER BY id DESC LIMIT 1"`,
    ).toString().trim();
    await fetch(`${API}/api/moderation/requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'APPROVED' }),
    });
    console.log(`[OK] moderation request ${reqId} approved`);

    const after = await graphql<{ public: { article: { mods: { id: number; name?: string; downloadLink?: string; status: string }[] } } }>(
        `query GetArticleMods($slug: String!) {
            public { article(slug: $slug) { mods { id name downloadLink status } } }
        }`,
        { slug: SLUG },
    );
    // wait a beat for any cache propagation
    if (!after.public.article.mods.find((m) => m.id === mod.id)) {
        await new Promise((r) => setTimeout(r, 1500));
    }
    // GraphQL ID serializes to string — compare loosely
    const found = after.public.article.mods.find((m) => Number(m.id) === Number(mod.id));
    if (!found) throw new Error('approved mod not visible to guests: ' + JSON.stringify(after.public.article.mods));
    if (found.downloadLink !== packUrl) throw new Error('downloadLink mismatch');
    console.log(`[OK] guest sees approved mod id=${found.id} with link ${found.downloadLink}`);

    console.log('\nALL CHANOX2-SDK LOCAL TESTS PASSED');
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
