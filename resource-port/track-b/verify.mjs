#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const map = JSON.parse(await readFile(resolve(root, "resource-port/track-b/session-map.json"), "utf8"));
const prompts = await readFile(resolve(root, "resource-port/track-b/SESSION_PROMPTS.md"), "utf8");
const fail = (message) => { throw new Error(`Resource Track B map invalid: ${message}`); };

const ids = Array.from({ length: 11 }, (_, index) => `R${String(index + 38).padStart(3, "0")}`);
const expected = {
  R038: Array.from({ length: 24 }, (_, index) => `R${String(index + 1).padStart(3, "0")}`),
  R039: ["R025", "R026"], R040: ["R027"], R041: ["R028"], R042: ["R029"],
  R043: ["R030", "R031"], R044: ["R032"], R045: ["R033"], R046: ["R034"],
  R047: ["R035"], R048: ["R036"],
};

if (map.schemaVersion !== 1) fail("unsupported schema");
if (map.repository !== "trinhtanphat/Resource") fail("wrong repository");
if (map.rawAssetPin !== "519c35a293745b6a0477c4f6ea03110a89de2318") fail("wrong source pin");
if (map.shared?.githubActions !== false) fail("GitHub Actions must be disabled");
if (map.shared?.mergeMethod !== "rebase") fail("merge method must be rebase");
if (map.sessions.length !== 11) fail("expected 11 sessions");

const owners = new Set();
const locks = new Map();
let edges = 0;
for (let index = 0; index < map.sessions.length; index += 1) {
  const session = map.sessions[index];
  const id = ids[index];
  if (session.sessionId !== id) fail(`expected ${id}`);
  if (session.status !== "blocked-on-track-a") fail(`${id} must start blocked`);
  if (owners.has(session.owner)) fail(`duplicate owner ${session.owner}`);
  owners.add(session.owner);
  if (JSON.stringify(session.dependencies) !== JSON.stringify(expected[id])) fail(`${id} dependency mismatch`);
  if (session.dependencies.includes("R037")) fail(`${id} consumes unresolved R037`);
  edges += session.dependencies.length;
  if (!prompts.includes(`## ${id} —`) || !prompts.includes(`RESOURCE_SESSION_ID=${id}`)) fail(`${id} prompt missing`);
  if (session.lockedPaths.length !== 6) fail(`${id} must lock six outputs`);
  for (const path of session.lockedPaths) {
    if (path === "resource-port/track-b/session-map.json") fail(`${id} locks coordinator map`);
    if (/^(flash|image|partical|sound|video|weekly|xml)\//u.test(path)) fail(`${id} locks raw source`);
    if (locks.has(path)) fail(`${path} shared by ${locks.get(path)} and ${id}`);
    locks.set(path, id);
  }
}

if (owners.size !== 11) fail("owner count mismatch");
if (edges !== 36) fail(`expected 36 dependency edges, found ${edges}`);
if (locks.size !== 66) fail(`expected 66 unique locks, found ${locks.size}`);

console.log(JSON.stringify({
  status: "pass", sessions: 11, owners: 11, dependencyEdges: edges,
  uniqueLockedPaths: locks.size, rawAssetPin: map.rawAssetPin, githubActions: false
}, null, 2));
