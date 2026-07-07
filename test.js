/**
 * Test suite for CSV → JSON converter
 * Tests core logic from csvParser.js
 */

const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    if (failed === 0 || passed > 0) {
      // Individual test results are inside
    }
  } catch (err) {
    failed++;
    console.error(`  ✗ ERROR: ${name} — ${err.message}`);
  }
}

// Replicate the core functions for testing (since they use ESM imports)
function sanitizeKey(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_')
    || 'campo';
}

function generateDefaultMapping(headers) {
  const mapping = {};
  for (const h of headers) {
    mapping[h] = sanitizeKey(h);
  }
  return mapping;
}

function applyMapping(rows, mapping) {
  const activeMapping = Object.entries(mapping).filter(([, jsonKey]) => jsonKey.trim() !== '');
  return rows.map(row => {
    const obj = {};
    for (const [csvCol, jsonKey] of activeMapping) {
      obj[jsonKey.trim()] = row[csvCol] ?? '';
    }
    return obj;
  });
}

console.log('\n=== Test Convertitore CSV → JSON ===\n');

// Test 1: sanitizeKey
console.log('1. sanitizeKey');
test('converte spazi in underscore', () => {
  assert(sanitizeKey('Nome Utente') === 'nome_utente', 'Nome Utente → nome_utente');
});
test('rimuove accenti', () => {
  assert(sanitizeKey('città') === 'citta', 'città → citta');
});
test('gestisce caratteri speciali', () => {
  assert(sanitizeKey('Prezzo (€)') === 'prezzo', 'Prezzo (€) → prezzo');
});
test('stringa vuota restituisce campo', () => {
  assert(sanitizeKey('') === 'campo', 'vuoto → campo');
});
test('solo caratteri speciali restituisce campo', () => {
  assert(sanitizeKey('!!!') === 'campo', '!!! → campo');
});

// Test 2: generateDefaultMapping
console.log('\n2. generateDefaultMapping');
test('genera mapping da headers', () => {
  const headers = ['Nome', 'Email', 'Età'];
  const mapping = generateDefaultMapping(headers);
  assert(mapping['Nome'] === 'nome', 'Nome → nome');
  assert(mapping['Email'] === 'email', 'Email → email');
  assert(mapping['Età'] === 'eta', 'Età → eta');
});

// Test 3: applyMapping
console.log('\n3. applyMapping');
test('converte righe con mapping attivo', () => {
  const rows = [
    { 'Nome': 'Mario', 'Email': 'mario@test.it', 'Età': '30' },
    { 'Nome': 'Luigi', 'Email': 'luigi@test.it', 'Età': '25' },
  ];
  const mapping = { 'Nome': 'name', 'Email': 'email', 'Età': 'age' };
  const result = applyMapping(rows, mapping);
  assert(result.length === 2, '2 righe');
  assert(result[0].name === 'Mario', 'prima riga name');
  assert(result[0].email === 'mario@test.it', 'prima riga email');
  assert(result[1].name === 'Luigi', 'seconda riga name');
});

test('esclude colonne con chiave vuota', () => {
  const rows = [
    { 'Nome': 'Mario', 'Email': 'mario@test.it', 'Note': 'bla' },
  ];
  const mapping = { 'Nome': 'name', 'Email': '', 'Note': '  ' };
  const result = applyMapping(rows, mapping);
  assert(Object.keys(result[0]).length === 1, 'solo 1 chiave');
  assert(result[0].name === 'Mario', 'name presente');
  assert(result[0].email === undefined, 'email esclusa');
  assert(result[0].note === undefined, 'note esclusa (spazi)');
});

// Test 4: CSV parsing with Papa Parse
console.log('\n4. Papa Parse CSV');
test('parsa CSV semplice con header', () => {
  const csv = 'nome,cognome,eta\nMario,Rossi,30\nLuigi,Verdi,25';
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert(result.data.length === 2, '2 righe di dati');
  assert(result.meta.fields.length === 3, '3 colonne');
  assert(result.data[0].nome === 'Mario', 'nome corretto');
});

test('gestisce campi con virgolette', () => {
  const csv = 'nome,descrizione\nMario,"Rossi, Mario"\nLuigi,"Verdi, Luigi"';
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert(result.data.length === 2, '2 righe');
  assert(result.data[0].descrizione === 'Rossi, Mario', 'virgolette preservate');
});

test('gestisce punto e virgola come delimitatore', () => {
  const csv = 'nome;cognome;eta\nMario;Rossi;30\nLuigi;Verdi;25';
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert(result.data.length === 2, '2 righe');
  assert(result.data[0].cognome === 'Rossi', 'cognome corretto');
});

test('salta righe vuote', () => {
  const csv = 'nome,eta\nMario,30\n\n\nLuigi,25\n';
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  assert(result.data.length === 2, '2 righe, righe vuote saltate');
});

// Test 5: Round-trip (CSV headers → default mapping → JSON)
console.log('\n5. Round-trip completo');
test('CSV → mapping → JSON round-trip', () => {
  const csv = 'Nome Prodotto,Prezzo Unitario,Quantità\nPenna,1.50,100\nQuaderno,3.00,50';
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields;
  const mapping = generateDefaultMapping(headers);
  const json = applyMapping(parsed.data, mapping);

  assert(json.length === 2, '2 prodotti');
  assert(json[0].nome_prodotto === 'Penna', 'primo prodotto');
  assert(json[0].prezzo_unitario === '1.50', 'prezzo');
  assert(json[1].quantita === '50', 'quantità secondo');
  assert(JSON.parse(JSON.stringify(json)).length === 2, 'JSON valido');
});

// Summary
console.log(`\n=== Risultati: ${passed} passati, ${failed} falliti ===\n`);

process.exit(failed > 0 ? 1 : 0);
