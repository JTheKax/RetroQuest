import test from "node:test";
import assert from "node:assert/strict";
import {evaluate,Monitor} from "../src/achievement-engine.js";
const definition={version:1,conditions:[{address:16,bytes:1,op:"gte",value:10}]};
test("threshold and invalid reads",()=>{assert.equal(evaluate(definition,()=>10),true);assert.equal(evaluate(definition,()=>9),false);assert.equal(evaluate(definition,()=>undefined),false);assert.equal(evaluate(definition,()=>256),false)});
test("all conditions required",()=>{assert.equal(evaluate({version:1,conditions:[...definition.conditions,{address:17,bytes:1,op:"eq",value:1}]},()=>10),false)});
test("duplicate practice events suppressed",()=>{const m=new Monitor([{id:"test",definition}]);assert.equal(m.tick(()=>10).length,1);assert.equal(m.tick(()=>10).length,0)});
test("already earned achievements suppressed",()=>{assert.equal(new Monitor([{id:"test",definition,unlocked:1}]).tick(()=>10).length,0)});
