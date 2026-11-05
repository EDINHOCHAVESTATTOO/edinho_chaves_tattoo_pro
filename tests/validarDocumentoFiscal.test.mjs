import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidTaxId } from '../src/lib/validarDocumentoFiscal.ts';

test('aceita CPF com dígitos verificadores corretos', () => {
  assert.equal(isValidTaxId('529.982.247-25'), true);
  assert.equal(isValidTaxId('52998224725'), true);
});

test('rejeita CPF inválido ou repetido', () => {
  assert.equal(isValidTaxId('529.982.247-26'), false);
  assert.equal(isValidTaxId('111.111.111-11'), false);
  assert.equal(isValidTaxId('12345678900'), false);
});

test('aceita CNPJ com dígitos verificadores corretos', () => {
  assert.equal(isValidTaxId('11.222.333/0001-81'), true);
  assert.equal(isValidTaxId('11222333000181'), true);
});

test('rejeita CNPJ inválido ou repetido', () => {
  assert.equal(isValidTaxId('11.222.333/0001-82'), false);
  assert.equal(isValidTaxId('00.000.000/0000-00'), false);
});

test('rejeita valores vazios e comprimentos incorretos', () => {
  for (const value of ['', '123', '123456789012', '123456789012345']) {
    assert.equal(isValidTaxId(value), false);
  }
});
