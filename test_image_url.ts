
import { resolveImageUrl } from './src/libs/image';

const testCases = [
    // Legacy Worker URL
    'https://img.chanomhub.com/i/legacy-worker.jpg',
    // Old CDN URL
    'https://cdn.chanomhub.online/old-cdn.jpg',
    // Hash only
    '7f8e9d0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6.jpg',
    // Already optimized URL
    'https://cdn.chanomhub.online/cdn-cgi/image/format=auto/already-optimized.jpg',
    // External URL
    'https://google.com/logo.png',
    // Null/undefined
    null,
    undefined
];

console.log('Testing Image URL Resolution:\n');

testCases.forEach(url => {
    const resolved = resolveImageUrl(url);
    console.log(`Original: ${url}`);
    console.log(`Resolved: ${resolved}`);
    console.log('---');
});
