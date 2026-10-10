const assert = require('node:assert/strict');
const { initial, play } = require('./game.js');
const fixed = () => 0.5;
assert.equal(initial().cash, 10000);
const day = play(initial(), 80, 200, 1000, fixed);
assert.equal(day.history[0].expenses, 5000);
assert.equal(day.history[0].sold, 80);
assert.equal(day.cash, 21000);
assert.equal(initial().history.length, 0);
assert.throws(() => play(initial(), 201, 200, 0, fixed), /more than/);
for (const input of [[-1,200,0],[1.2,200,0],[5,0,0],[5,200,-1],[5,NaN,0]]) assert.throws(() => play(initial(), ...input, fixed));
assert.equal(play(initial(), 0, 200, 0, fixed).cash, 10000);
assert.equal(play(initial(), 1, 200, 0, fixed).history[0].sold, 1);
assert.ok(play(initial(), 100, 100, 0, fixed).history[0].demand > play(initial(), 100, 400, 0, fixed).history[0].demand);
assert.ok(play(initial(), 100, 200, 1000, fixed).history[0].demand > play(initial(), 100, 200, 0, fixed).history[0].demand);
let season = initial();
for (let i = 0; i < 30; i++) season = play(season, 60, 200, 500, fixed);
assert.equal(season.history.length, 30);
assert.equal(season.cash, 10000 + season.history.reduce((n,r) => n + r.profit, 0));
assert.throws(() => play(season, 1, 200, 0, fixed), /complete/);
console.log('All game logic checks passed.');

// Recipe economics and full seasons keep every cent accounted for.
const { varieties } = require('./game.js');
for (const [id, recipe] of Object.entries(varieties)) {
  const result = play(initial(), 20, recipe.suggestedPrice, 300, fixed, id);
  const row = result.history[0];
  assert.equal(row.variety, id);
  assert.equal(row.unitCost, recipe.cost);
  assert.equal(row.expenses, 20 * recipe.cost + 300);
  assert.equal(row.revenue, row.sold * recipe.suggestedPrice);
  assert.equal(result.cash, 10000 + row.revenue - row.expenses);
  assert.throws(() => play(initial(), Math.floor(10000 / recipe.cost) + 1, recipe.suggestedPrice, 0, fixed, id), /more than/);
  assert.ok(play(initial(), 100, recipe.suggestedPrice, 0, fixed, id).history[0].demand > play(initial(), 100, recipe.suggestedPrice + 200, 0, fixed, id).history[0].demand);
}
assert.throws(() => play(initial(), 1, 200, 0, fixed, 'toString'), /variety/);
assert.equal(play({ cash: 35, history: [] }, 1, 150, 0, fixed, 'shortbread').cash, 150);
let mixedSeason = initial();
for (let day = 0; day < 30; day++) {
  const id = Object.keys(varieties)[day % 3];
  mixedSeason = play(mixedSeason, 30, varieties[id].suggestedPrice, 0, fixed, id);
}
assert.equal(mixedSeason.history.length, 30);
assert.equal(mixedSeason.cash, 10000 + mixedSeason.history.reduce((sum, r) => sum + r.profit, 0));

// Run the actual UI handlers with a lightweight DOM to check recipe changes,
// budget previews, animation locking, saving, legacy saves, and reset.
const vm = require('node:vm');
const source = require('node:fs').readFileSync('./game.js', 'utf8');
function ui(saved) {
  const nodes = new Map();
  function element() {
    return { _value: '', get value() { return this._value; }, set value(value) { this._value = String(value); }, textContent: '', innerHTML: '', hidden: false, disabled: false, listeners: {}, style: { setProperty() {} },
      addEventListener(event, fn) { this.listeners[event] = fn; }, before() {}, append() {}, replaceChildren() {}, remove() {},
      querySelector(selector) { return get(selector); }, showModal() {}, close() {},
      reset() { get('variety').value = 'chocolate-chip'; get('cookies').value = '80'; get('price').value = '2'; get('ads').value = '10'; } };
  }
  function get(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }
  get('plan').reset();
  const store = new Map(saved ? [['manavs-cookie-shop-v1', JSON.stringify(saved)]] : []);
  vm.runInNewContext(source, { document: { getElementById: get, createElement: element }, localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) }, window: { matchMedia: () => ({ matches: true }) }, setTimeout: () => 1, clearTimeout() {} });
  return { get, store };
}
const screen = ui();
screen.get('variety').value = 'shortbread';
screen.get('variety').listeners.change();
assert.equal(screen.get('price').value, '1.5');
assert.equal(screen.get('cost').textContent, '$38.00');
screen.get('plan').listeners.submit({ preventDefault() {} });
assert.equal(screen.get('error').textContent, '');
assert.equal(screen.get('variety').disabled, true);
const saved = JSON.parse(screen.store.get('manavs-cookie-shop-v1'));
assert.equal(saved.history[0].variety, 'shortbread');
screen.get('skip-customers').listeners.click();
assert.equal(screen.get('variety').disabled, false);
assert.match(screen.get('daily-result').innerHTML, /Butter Shortbread/);
assert.equal(ui(saved).get('variety').value, 'shortbread');
const legacy = JSON.parse(JSON.stringify(day)); delete legacy.history[0].variety;
assert.match(ui(legacy).get('history').innerHTML, /Chocolate Chip/);
screen.get('confirm-reset').listeners.click();
assert.equal(screen.get('variety').value, 'chocolate-chip');
assert.equal(screen.get('cash').textContent, '$100.00');
console.log('Variety economics, mixed season, and UI integration checks passed.');

// Satisfaction responds independently to price and unmet demand, and stays bounded.
assert.equal(initial().satisfaction, 75);
for (const [id, recipe] of Object.entries(varieties)) {
  const funded = { ...initial(), cash: 100000 };
  const fair = play(funded, 1000, recipe.suggestedPrice, 0, fixed, id);
  const cheap = play(funded, 1000, recipe.suggestedPrice - 25, 0, fixed, id);
  const expensive = play(funded, 1000, recipe.suggestedPrice * 2, 0, fixed, id);
  assert.equal(fair.satisfaction, 78);
  assert.equal(cheap.satisfaction, 83);
  assert.equal(expensive.satisfaction, 68);
  const demand = fair.history[0].demand;
  assert.equal(play(funded, demand, recipe.suggestedPrice, 0, fixed, id).satisfaction, 78);
  assert.ok(play(funded, demand - 1, recipe.suggestedPrice, 0, fixed, id).satisfaction < 75);
  assert.equal(play(funded, 0, recipe.suggestedPrice, 0, fixed, id).satisfaction, 55);
}
const upper = play({ ...initial(), satisfaction: 99 }, 200, 100, 0, fixed);
assert.equal(upper.satisfaction, 100);
assert.equal(upper.history[0].satisfactionChange, 1);
const lower = play({ ...initial(), satisfaction: 1 }, 0, 400, 0, fixed);
assert.equal(lower.satisfaction, 0);
assert.equal(lower.history[0].satisfactionChange, -1);
const noDemand = play(initial(), 0, 2000, 0, fixed);
assert.equal(noDemand.history[0].demand, 0);
assert.equal(noDemand.history[0].inventoryChange, 0);
assert.equal(noDemand.satisfaction, 65);
const unchanged = initial();
play(unchanged, 0, 200, 0, fixed);
assert.deepEqual(unchanged, initial());
const { restore } = require('./game.js');
assert.equal(restore({ cash: 10000, history: [] }).satisfaction, 75);
assert.deepEqual(restore(mixedSeason), mixedSeason);
const oldSave = JSON.parse(JSON.stringify(day));
delete oldSave.satisfaction;
for (const row of oldSave.history) {
  for (const key of ['variety', 'satisfaction', 'satisfactionChange', 'priceChange', 'inventoryChange']) delete row[key];
}
assert.equal(restore(oldSave).satisfaction, day.satisfaction);
assert.equal(ui(oldSave).get('satisfaction').textContent, `${day.satisfaction} / 100`);
assert.equal(ui(saved).get('satisfaction').textContent, `${saved.satisfaction} / 100`);
assert.match(screen.get('satisfaction').textContent, /^75 \/ 100$/);
const unhappy = ui();
unhappy.get('cookies').value = '0';
unhappy.get('price').value = '4';
unhappy.get('ads').value = '0';
unhappy.get('plan').listeners.submit({ preventDefault() {} });
unhappy.get('skip-customers').listeners.click();
assert.equal(unhappy.get('satisfaction').textContent, '45 / 100');
assert.match(unhappy.get('daily-result').innerHTML, /Price: -10 points/);
assert.match(unhappy.get('daily-result').innerHTML, /Inventory: -20 points/);
assert.match(unhappy.get('history').innerHTML, /wanted cookies were unavailable/);
let cappedSeason = initial();
for (let i = 0; i < 4; i++) cappedSeason = play(cappedSeason, 110, 100, 0, fixed);
assert.match(ui(cappedSeason).get('daily-result').innerHTML, /100 \(\+1 today\)/);
assert.match(ui(cappedSeason).get('daily-result').innerHTML, /limited to 0–100/);
const finalScreen = ui(mixedSeason);
assert.match(finalScreen.get('daily-result').innerHTML, /Customer satisfaction:/);
assert.equal(finalScreen.get('open-shop').disabled, true);
const bankrupt = play({ ...initial(), cash: 35 }, 1, 2000, 0, fixed, 'shortbread');
assert.match(ui(bankrupt).get('daily-result').innerHTML, /Customer satisfaction:/);
console.log('Satisfaction pricing, inventory, bounds, migration, persistence, reset, and final-day checks passed.');

assert.equal(play(initial(), 100, 220, 0, fixed).history[0].priceChange, -1);
