const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('alteracao de status da agenda exige dono autenticado e verifica linha afetada', () => {
  const source = fs.readFileSync('src/app/AgendaEstudio.tsx', 'utf8');
  const start = source.indexOf('async function setStatus(');
  const end = source.indexOf('async function addPayment(', start);
  assert.ok(start !== -1 && end > start, 'função de status não encontrada');
  const body = source.slice(start, end);
  assert.match(body, /const user_id=await owner\(\)/);
  assert.match(body, /\.eq\('id',a\.id\)\.eq\('user_id',user_id\)\.select\('id'\)/);
  assert.match(body, /if\(!data\?\.length\)throw new Error/);
  assert.match(body, /finally\{setBusy\(false\);\}/);
});
