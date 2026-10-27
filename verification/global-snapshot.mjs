import assert from 'node:assert/strict';
import { globalSnapshotSignature as signature } from '../lib/globalSnapshotSignature.js';
const base = { savedAt: 'old', version: 1, cashflow: { b: 2, a: 1 }, rows: [{ id: 1 }, { id: 2 }] };
assert.equal(signature(base), signature({ rows: base.rows, cashflow: { a: 1, b: 2 }, version: 1, savedAt: 'new' }));
assert.notEqual(signature(base), signature({ ...base, cashflow: { ...base.cashflow, a: 5 } }));
assert.notEqual(signature(base), signature({ ...base, rows: [...base.rows].reverse() }));
assert.notEqual(signature(base), signature({ ...base, cashflow: { ...base.cashflow, savedAt: 'business timestamp' } }));
console.log('PASS global snapshot signatures: root transport timestamp ignored, business changes and array order retained.');
