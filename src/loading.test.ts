import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWithTimeout } from './loading';

test('returns a loaded asset',async()=>{
  assert.equal(await loadWithTimeout('boat',async()=>42,100),42);
});
test('reports the asset name when a loader never settles',async()=>{
  await assert.rejects(loadWithTimeout('boat-tug-a',()=>new Promise(()=>{}),10),/Loading boat-tug-a took too long/);
});
test('preserves loader errors for the retry screen',async()=>{
  const error=new Error('Model request failed');
  await assert.rejects(loadWithTimeout('wreck',async()=>{throw error;},100),e=>e===error);
});
