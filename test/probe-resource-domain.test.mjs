import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProbeUrls } from '../scripts/probe-resource-domain.mjs';

test('resource domain probes canonical image and sound paths', () => {
  assert.deepEqual(buildProbeUrls('https://resource.qs3d.site/'), [
    'https://resource.qs3d.site/image/equip/f/head/default/2/show.png',
    'https://resource.qs3d.site/image/equip/f/glass/default/2/show.png',
    'https://resource.qs3d.site/image/equip/f/cloth/cloth76/1/show.png',
    'https://resource.qs3d.site/image/equip/f/suits/default/1/show.png',
    'https://resource.qs3d.site/image/equip/f/eff/default/1/show.png',
    'https://resource.qs3d.site/sound/1006.flv',
  ]);
});
