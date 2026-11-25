import test from "node:test";import assert from "node:assert/strict";import {ndsMemoryAdapter} from "../clients/retroquest-client.js";
test("unsigned little endian",()=>{const read=ndsMemoryAdapter(i=>[255,255,255,255][i]);assert.equal(read(0,4),4294967295);assert.equal(read(0,2),65535)});
test("unavailable memory fails",()=>{assert.throws(()=>ndsMemoryAdapter(()=>undefined)(0,1))});
