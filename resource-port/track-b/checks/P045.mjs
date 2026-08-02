#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const fail = (message) => { throw new Error(`P045 package invalid: ${message}`); };
const json = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));

const manifest = await json("exports/resource-port/hall-room-world/manifest.json");
const graph = await json("exports/resource-port/hall-room-world/scene-graph.json");
const navigation = await json("exports/resource-port/hall-room-world/navigation.json");
const hotSpring = await json("exports/resource-port/hall-room-world/hot-spring-foundations.json");
const raster = await json("exports/resource-port/hall-room-world/raster-catalog.json");
const contract = await json("resource-port/track-b/contracts/hall-room-world.json");
const evidence = await json("resource-port/track-b/evidence/P045.json");
const status = await json("resource-port/track-b/status/P045.json");

if (manifest.packageSessionId !== "P045" || manifest.runtimeSessionId !== "R045") fail("session identity mismatch");
if (manifest.source?.commit !== "519c35a293745b6a0477c4f6ea03110a89de2318") fail("raw source pin changed");
if (manifest.source?.tree !== "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344") fail("raw source tree changed");
if (manifest.dependency?.implementationCommit !== "3540fda0bf108366ae855028c6f55016ad1902f5") fail("R033 implementation commit changed");
if (manifest.dependency?.evidenceGitBlobSha1 !== "08bd429f94363b9d368194e82d5705fee8f90909") fail("R033 evidence blob changed");
if (manifest.dependency?.dispatchSha256 !== "c635eecdc66825827131dda1b6ebdacfe9e348eb0dd02849802d4c6b5aa1b83a") fail("R033 dispatch SHA-256 changed");
if (manifest.dependency?.verifiedOnGunnyMain !== "303a12fb4978353b45a12e718a4742b28bdf8edf") fail("Gunny dependency verification base changed");
if (manifest.readiness?.sourceUnlocked !== true || manifest.readiness?.runtimeIntegration !== false) fail("readiness boundary mismatch");
if (graph.scenes?.length !== 4 || graph.layerModel?.length !== 6) fail("scene/layer census mismatch");
if (graph.coordinateSystem?.unit !== "source-pixel" || graph.coordinateSystem?.twipConversion !== 20) fail("coordinate contract changed");
if (graph.compiledTimelineBoundary?.uniqueBlobs !== 97 || graph.compiledTimelineBoundary?.browserNative !== false) fail("SWF boundary changed");
if (graph.authority?.roomMembership !== "gunny-runtime-only" || graph.authority?.gameplay !== "gunny-runtime-only") fail("gameplay authority leaked");
if (navigation.transitions?.length !== 5) fail("transition census mismatch");
if (navigation.transitions.some((entry) => entry.enabled !== false || entry.handler !== null)) fail("unreviewed transition enabled");
if (navigation.hotspots?.enabled !== 0) fail("hotspots must fail closed");
if (navigation.hotspots?.maskPolicy.includes("disable") !== true) fail("mask fallback changed");
if (hotSpring.scope !== "visual-foundations" || hotSpring.runtimeIntegration !== false || hotSpring.failClosed !== true) fail("Hot Spring boundary changed");
if (!hotSpring.notPublished.includes("HotSpringControl.swf browser runtime")) fail("Hot Spring control exclusion missing");
if (raster.summary?.sourceFiles !== 396 || raster.summary?.sourceBytes !== 48720359) fail("R033 source census mismatch");
if (raster.summary?.rasterReferences !== 311 || raster.summary?.uniqueBrowserRasterBlobs !== 156) fail("raster census mismatch");
if (raster.summary?.unresolvedSwfUniqueBlobs !== 97) fail("unresolved timeline count mismatch");
if (raster.publication?.bytesDuplicatedIntoPackage !== 0) fail("unexpected bulk asset duplication");
if (contract.sourceFamilies?.length !== 4 || contract.hotspotContract?.defaultEnabled !== false) fail("contract mismatch");
if (contract.assetAddressing?.mutableBranchAllowed !== false || contract.assetAddressing?.rawSourceReadOnly !== true) fail("asset address boundary mismatch");
if (evidence.publication?.commit !== "4b95e5b07ed00c8986d1bc9aee5a44c3e95d235c") fail("publication commit changed");
if (evidence.publication?.tree !== "4a8738903eb53876b58ea20f656b4b8e667668fa") fail("publication tree changed");
if (evidence.summary?.enabledTransitions !== 0 || evidence.claims?.roomGameplayAuthority !== false) fail("evidence overclaims runtime");
if (status.status !== "complete-package-with-fail-closed-interactions" || status.runtimeIntegration !== false) fail("status mismatch");

console.log(JSON.stringify({status:"pass",packageSessionId:"P045",runtimeSessionId:"R045",sourceFiles:396,sourceBytes:48720359,rasterReferences:311,uniqueRasterBlobs:156,scenes:4,layers:6,hotspotCandidates:5,enabledHotspots:0,unresolvedSwfUniqueBlobs:97,runtimeIntegration:false,githubActions:false}, null, 2));
