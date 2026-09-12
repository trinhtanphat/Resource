#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

const PROBE_PATHS = [
  'image/equip/f/head/default/2/show.png',
  'image/equip/f/glass/default/2/show.png',
  'image/equip/f/cloth/cloth76/1/show.png',
  'image/equip/f/suits/default/1/show.png',
  'image/equip/f/eff/default/1/show.png',
  'sound/1006.flv',
];

export function buildProbeUrls(baseUrl) {
  const normalized = `${String(baseUrl).replace(/\/+$/u, '')}/`;
  return PROBE_PATHS.map((relativePath) => new URL(relativePath, normalized).href);
}

export async function probeResourceDomain(baseUrl, fetchImpl = fetch) {
  const failures = [];
  for (const url of buildProbeUrls(baseUrl)) {
    try {
      const response = await fetchImpl(url, { method: 'HEAD', redirect: 'follow' });
      console.log(`${new URL(url).pathname}=${response.status}`);
      if (response.status !== 200) failures.push(`${url}: HTTP ${response.status}`);
    } catch (error) {
      failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) {
    console.error(`RESOURCE_DOMAIN_GATE=FAIL failures=${failures.length}`);
    for (const failure of failures) console.error(failure);
    return false;
  }
  console.log('RESOURCE_DOMAIN_GATE=PASS');
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseUrl = process.argv[2] ?? process.env.R2_PUBLIC_BASE_URL ?? 'https://resource.qs3d.site';
  const ok = await probeResourceDomain(baseUrl);
  if (!ok) process.exitCode = 1;
}
