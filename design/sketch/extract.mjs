// The observer. Toy stand-in for hopdiff: in real life this is a parsed
// call graph + cdk synth output. Here: enough to make the loop honest —
// it reads only the code, never the intent. Facts come from here.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SEND = /(?:sendMessage|publish)\(\s*['"]([\w-]+)['"]/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.js')) yield p;
  }
}

export function extract(root = 'services') {
  const edges = [];
  for (const file of walk(root)) {
    const rel = relative(root, file);
    const service = rel.split('/')[0];
    const src = readFileSync(file, 'utf8');

    if (file.endsWith('infra.js')) {
      const infra = src.match(/consumes:\s*['"]([\w-]+)['"]/g) ?? [];
      for (const m of infra) {
        const queue = m.match(/['"]([\w-]+)['"]/)[1];
        edges.push({ from: queue, to: service, via: 'iac-binding', confidence: 'high', site: rel });
      }
      continue;
    }

    for (const m of src.matchAll(SEND)) {
      const line = src.slice(0, m.index).split('\n').length;
      edges.push({
        from: service, to: m[1], via: 'code-call',
        confidence: 'high',                    // literal string; dynamic would be 'low'
        site: `${rel}:${line}`,
      });
    }
  }
  return { edges };
}
