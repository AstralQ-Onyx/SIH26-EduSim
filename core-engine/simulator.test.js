'use strict';

const assert = require('assert');
const { pinsMatchPseudo, advanceCpu, parseHex } = require('./simulator.js');

// ESP32 schematic pins are GPIO23, not D23 — this was the live wiring miss.
assert.strictEqual(pinsMatchPseudo('GPIO2', 2), true);
assert.strictEqual(pinsMatchPseudo('GPIO23', 23), true);
assert.strictEqual(pinsMatchPseudo('GPIO2', 13), false);

// NodeMCU D4 is GPIO2; sketches call digitalWrite(2) / digitalWrite(D4).
assert.strictEqual(pinsMatchPseudo('D4', 2, { gpio: 2 }), true);
assert.strictEqual(pinsMatchPseudo('D4', 4), true);
assert.strictEqual(pinsMatchPseudo('D13', 13), true);

// avr8js timers only advance when cpu.tick() runs after each instruction.
let instructions = 0;
let ticks = 0;
advanceCpu({ tick() { ticks += 1; } }, () => { instructions += 1; }, 5);
assert.strictEqual(instructions, 5);
assert.strictEqual(ticks, 5);

const prog = parseHex(':100000000102030405060708090A0B0C0D0E0F10E8\n:00000001FF\n');
assert.strictEqual(prog[0], 0x01);
assert.strictEqual(prog[15], 0x10);

console.log('simulator.test.js: all checks passed');
