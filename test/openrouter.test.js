import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ask, backend, modelName } from '../src/jev.js';

test('OpenRouter uses Decisions endpoint and preserves native typed questions and answers', async () => {
  const questions = { yes: {type:'noul',instructions:'Is this aligned?'}, label: {type:'choice',criteria:{a:'A',b:'B'}}, risk:{type:'score',criteria:['low','high']} };
  const answers = await ask({task:'research'}, questions, {env:{OPENROUTER_API_KEY:'test-openrouter'}, fetchImpl:async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/alpha/decisions');
    assert.equal(init.headers.Authorization, 'Bearer test-openrouter');
    assert.deepEqual(JSON.parse(init.body), {state:{task:'research'},model:'typesafe/jev-1.13',questions});
    assert.equal(init.headers['ai-model-id'], undefined);
    return {ok:true,json:async()=>({answers:{yes:{noul:.12},label:{choice:'a',probabilities:{a:.9,b:.1},confidence:.8},risk:{score:.2}}})};
  }});
  assert.equal(answers.yes.p,.12);assert.equal(answers.label.choice,'a');assert.equal(answers.label.confidence,.8);assert.equal(answers.risk.score,.2);
});

test('explicit environment credentials win over stored OpenRouter configuration', () => {
  const dir=mkdtempSync(join(tmpdir(),'sentinel-provider-'));const file=join(dir,'config.json');
  try {
    writeFileSync(file,JSON.stringify({openRouterApiKey:'stored-or',aiGatewayApiKey:'stored-gateway'}));
    assert.equal(backend({SENTINEL_CONFIG:file}).kind,'openrouter');
    assert.equal(backend({SENTINEL_CONFIG:file,AI_GATEWAY_API_KEY:'explicit-gateway'}).kind,'gateway');
    assert.equal(backend({SENTINEL_CONFIG:file,JEV_API_KEY:'explicit-ts'}).kind,'typesafe');
    assert.equal(backend({SENTINEL_CONFIG:file,OPENROUTER_API_KEY:'explicit-or'}).key,'explicit-or');
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('model overrides and original transport defaults remain distinct', () => {
  assert.equal(modelName({OPENROUTER_API_KEY:'test'}),'typesafe/jev-1.13');
  assert.equal(modelName({AI_GATEWAY_API_KEY:'test'}),'typesafe-ai/jev');
  assert.equal(modelName({JEV_API_KEY:'test'}),'jev-latest');
  assert.equal(modelName({OPENROUTER_API_KEY:'test',JEV_MODEL:'pinned-model'}),'pinned-model');
});

test('OpenRouter auth failures do not silently switch backend', async () => {
  let calls=0;
  await assert.rejects(ask({}, {}, {env:{OPENROUTER_API_KEY:'test',AI_GATEWAY_API_KEY:'other'}, fetchImpl:async url=>{
    calls++;assert.equal(url,'https://openrouter.ai/api/alpha/decisions');return {ok:false,status:401,text:async()=> 'Unauthorized'};
  }}), /openrouter HTTP 401/);
  assert.equal(calls,1);
});

test('CLI detects OpenRouter keys and saves them under the correct private config field', () => {
  const dir=mkdtempSync(join(tmpdir(),'sentinel-or-key-'));const file=join(dir,'config.json');
  try {
    execFileSync(process.execPath,['src/cli.js','key','sk-or-unit-test-placeholder'],{env:{...process.env,SENTINEL_CONFIG:file}});
    assert.deepEqual(JSON.parse(readFileSync(file)),{openRouterApiKey:'sk-or-unit-test-placeholder'});
  } finally {rmSync(dir,{recursive:true,force:true});}
});
