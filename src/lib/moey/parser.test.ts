/**
 * Pure-logic checks for the moey! parser. Run: `npx tsx src/lib/moey/parser.test.ts`.
 * No framework — asserts and exits non-zero on failure.
 */
import assert from "node:assert/strict";
import { parseMoeyNotification } from "./parser";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
}

check("simple purchase", () => {
  const r = parseMoeyNotification("Compra de 12,34 EUR em CONTINENTE MATOSINHOS");
  assert.equal(r.amountCents, 1234);
  assert.equal(r.type, "expense");
  assert.equal(r.parseOk, true);
  assert.equal(r.merchant, "CONTINENTE MATOSINHOS");
});

check("payment with € glued", () => {
  const r = parseMoeyNotification("Pagamento de 9,99€ a NETFLIX");
  assert.equal(r.amountCents, 999);
  assert.equal(r.type, "expense");
  assert.equal(r.merchant, "NETFLIX");
});

check("thousands separator", () => {
  const r = parseMoeyNotification("Compra 1.234,56€ em IKEA");
  assert.equal(r.amountCents, 123456);
  assert.equal(r.merchant, "IKEA");
});

check("refund is credit", () => {
  const r = parseMoeyNotification("Reembolso de 19,90€ de NETFLIX");
  assert.equal(r.amountCents, 1990);
  assert.equal(r.type, "refund");
});

check("balance alert ignored", () => {
  const r = parseMoeyNotification("Saldo disponível: 1.234,56€");
  assert.equal(r.ignored, true);
  assert.equal(r.parseOk, false);
});

check("declined ignored", () => {
  const r = parseMoeyNotification("Compra recusada de 50,00€ em WORTEN");
  assert.equal(r.ignored, true);
});

check("withdrawal", () => {
  const r = parseMoeyNotification("Levantamento de 60,00€ Multibanco");
  assert.equal(r.amountCents, 6000);
  assert.equal(r.type, "expense");
});

check("no amount still returns", () => {
  const r = parseMoeyNotification("Compra em LIDL");
  assert.equal(r.amountCents, null);
  assert.equal(r.parseOk, false);
  assert.equal(r.ignored, false);
});

check("inline full date", () => {
  const r = parseMoeyNotification("Compra 12,34€ em FNAC 03/06/2026");
  assert.equal(r.occurredAt, "2026-06-03");
});

console.log(`\n${passed} checks passed`);
