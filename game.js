/* All currency calculations use integer cents. No network or dependencies. */
const Game = (() => {
  const varieties = Object.freeze({
    'chocolate-chip': Object.freeze({ name: 'Chocolate Chip', cost: 50, suggestedPrice: 200, appeal: 1 }),
    shortbread: Object.freeze({ name: 'Butter Shortbread', cost: 35, suggestedPrice: 150, appeal: 1.1 }),
    'double-chocolate': Object.freeze({ name: 'Double Chocolate', cost: 80, suggestedPrice: 300, appeal: 0.85 })
  });
  const getVariety = id => Object.hasOwn(varieties, id) ? varieties[id] : null;
  const initial = () => ({ cash: 10000, history: [] });
  function play(state, cookies, price, ads, random = Math.random, variety = 'chocolate-chip') {
    const recipe = getVariety(variety);
    if (!recipe) throw new Error('Choose an available cookie variety.');
    if (state.history.length >= 30) throw new Error('Your 30-day season is complete. Start again to play another.');
    if (!Number.isSafeInteger(cookies) || cookies < 0 || cookies > 100000) throw new Error('Bake a whole number of cookies between 0 and 100,000.');
    if (!Number.isSafeInteger(price) || price < 25 || price > 2000) throw new Error('Set a price between $0.25 and $20.00.');
    if (!Number.isSafeInteger(ads) || ads < 0) throw new Error('Enter a valid, nonnegative advertising budget.');
    const expenses = cookies * recipe.cost + ads;
    if (expenses > state.cash) throw new Error('That plan costs more than your cash. Bake fewer cookies or reduce advertising.');
    const traffic = 0.75 + random() * 0.5;
    const demand = Math.max(0, Math.round((55 + 17 * Math.sqrt(ads / 100)) * recipe.appeal * Math.exp(-0.62 * ((price - recipe.suggestedPrice) / 100)) * traffic));
    const sold = Math.min(cookies, demand), revenue = sold * price, profit = revenue - expenses;
    const row = { variety, unitCost: recipe.cost, day: state.history.length + 1, cookies, price, ads, sold, revenue, expenses, profit, cash: state.cash + profit, demand };
    return { cash: row.cash, history: [...state.history, row] };
  }
  return { initial, play, varieties, getVariety };
})();
if (typeof module !== 'undefined') module.exports = Game;
if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const money = cents => (cents < 0 ? '−' : '') + '$' + (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let state = Game.initial();
  const storageKey = 'manavs-cookie-shop-v1';
  let serving = false;
  let animationTimers = [];
  const customerScene = document.createElement('div');
  customerScene.className = 'customer-scene';
  customerScene.hidden = true;
  customerScene.innerHTML = `<div class="street" aria-hidden="true"><span class="street-sun">☀</span><div class="mini-shop"><div class="shop-roof">MANAV’S COOKIES</div><div class="awning"></div><div class="shop-front"><div class="window">● ● ●<br>● ● ●</div><div class="door"></div></div></div><div class="customers"></div></div><div class="customer-status"><strong id="serving-count"></strong><button type="button" class="text-button" id="skip-customers">Skip animation →</button></div><p class="customer-caption" id="customer-caption"></p>`;
  $('welcome').before(customerScene);
  function stopCustomers() {
    animationTimers.forEach(clearTimeout);
    animationTimers = [];
    serving = false;
    customerScene.querySelector('.customers').replaceChildren();
  }
  function finishCustomers() {
    stopCustomers();
    customerScene.hidden = true;
    render();
  }
  $('skip-customers').addEventListener('click', finishCustomers);
  function showCustomers(row) {
    stopCustomers();
    serving = true;
    customerScene.hidden = false;
    $('welcome').hidden = true;
    $('daily-result').hidden = true;
    $('result-label').textContent = `DAY ${row.day} · THE SHOP IS OPEN`;
    for (const id of ['variety', 'cookies', 'price', 'ads', 'open-shop']) $(id).disabled = true;
    $('open-shop').textContent = 'Serving happy neighbors…';
    $('serving-count').textContent = `0 / ${row.sold} cookies sold`;
    // One visitor per cookie for small days; larger days use clearly labeled groups.
    const visits = Math.min(row.sold, 20);
    customerScene.querySelector('.shop-roof').textContent = Game.getVariety(row.variety || 'chocolate-chip').name.toUpperCase();
    $('customer-caption').textContent = row.sold === 0 ? 'A quiet sidewalk today. No cookies sold.' : row.sold > visits ? `${visits} customer groups are stopping by — each picks up a few cookies!` : 'Here come the neighbors. A cookie for every customer!';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || visits === 0) {
      $('serving-count').textContent = `${row.sold} / ${row.sold} cookies sold`;
      animationTimers.push(setTimeout(finishCustomers, 1200));
      return;
    }
    const colors = ['#d47956', '#698eae', '#9c7aaa', '#d3a548', '#5c9276'];
    let sold = 0;
    for (let i = 0; i < visits; i++) {
      const amount = Math.floor(row.sold / visits) + (i < row.sold % visits ? 1 : 0);
      animationTimers.push(setTimeout(() => {
        const person = document.createElement('div');
        person.className = 'customer';
        person.style.setProperty('--shirt', colors[i % colors.length]);
        person.style.setProperty('--skin', ['#ebbd94', '#b67b53', '#84543e'][i % 3]);
        person.innerHTML = `<span class="purchase">+${amount} 🍪</span><div class="person"><span class="person-head"></span><span class="person-body"></span><span class="person-legs"></span><span class="cookie-bag">🍪</span></div>`;
        customerScene.querySelector('.customers').append(person);
        animationTimers.push(setTimeout(() => {
          sold += amount;
          $('serving-count').textContent = `${sold} / ${row.sold} cookies sold`;
        }, 1250));
        animationTimers.push(setTimeout(() => person.remove(), 2800));
      }, i * 180));
    }
    animationTimers.push(setTimeout(finishCustomers, (visits - 1) * 180 + 3000));
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isSafeInteger(saved.cash) && saved.cash >= 0 && Array.isArray(saved.history) && saved.history.length <= 30 && saved.history.every((r, i) => ['cookies','price','ads','sold','revenue','expenses','profit','cash','demand'].every(k => Number.isSafeInteger(r[k])) && r.day === i + 1 && r.cash >= 0)) {
      if (saved.history.every(r => r.variety === undefined || Game.getVariety(r.variety))) {
        state = { ...saved, history: saved.history.map(r => ({ ...r, variety: r.variety || 'chocolate-chip' })) };
        const last = state.history.at(-1);
        if (last) { $('variety').value = last.variety; $('price').value = last.price / 100; }
      }
    }
  } catch (_) { /* Saving is optional, including in private browsing. */ }
  function render() {
    const days = state.history.length, done = days === 30 || state.cash < 35;
    const profit = state.cash - 10000;
    $('cash').textContent = money(state.cash);
    $('day').innerHTML = `${Math.min(days + 1, 30)} <small>/ 30</small>`;
    $('total-profit').textContent = money(profit);
    $('total-profit').className = profit < 0 ? 'negative' : '';
    $('total-sold').textContent = state.history.reduce((n, r) => n + r.sold, 0).toLocaleString();
    $('plan-label').textContent = done ? 'SEASON COMPLETE' : `DAY ${days + 1} · THE PLAN`;
    $('plan-heading').textContent = done ? 'That’s a wrap.' : days ? 'Another day, another batch.' : 'Let’s get baking.';
    for (const id of ['variety', 'cookies', 'price', 'ads', 'open-shop']) $(id).disabled = done;
    $('open-shop').innerHTML = done ? 'Start over to play again' : 'Open the shop <span>↗</span>';
    $('journal-count').textContent = `${days} ${days === 1 ? 'day' : 'days'} in the books`;
    $('empty-journal').hidden = days > 0; $('table-wrap').hidden = days === 0;
    $('history').innerHTML = [...state.history].reverse().map(r => `<tr><td>${r.day}</td><td>${r.cookies} / ${r.sold}<small class="ledger-variety">${Game.getVariety(r.variety || 'chocolate-chip').name}</small></td><td>${money(r.revenue)}</td><td>${money(r.expenses)}</td><td class="${r.profit < 0 ? 'negative' : 'positive'}">${money(r.profit)}</td><td>${money(r.cash)}</td></tr>`).join('');
    $('welcome').hidden = days > 0 || done;
    $('daily-result').hidden = days === 0 && !done;
    if (days || done) {
      const r = state.history[days - 1];
      $('result-label').textContent = done ? 'YOUR SHOP · THE FINAL CRUMB' : `DAY ${days} · IN THE BOOKS`;
      $('daily-result').innerHTML = done ? `<h2 class="result-title">${state.cash < 35 ? 'The oven has cooled.' : profit > 0 ? 'One sweet month.' : 'A month of lessons.'}</h2><p class="result-description">${state.cash < 35 ? 'You have less than $0.35 left, so you can’t bake another cookie.' : 'Thirty days of baking, learning, and building your little shop.'}</p><div class="result-profit ${profit < 0 ? 'negative' : 'positive'}">${money(state.cash)}</div><span class="profit-caption">FINAL SHOP CASH</span><div class="receipt"><div><span>Days in business</span><strong>${days} / 30</strong></div><div><span>Total revenue</span><strong>${money(state.history.reduce((n, x) => n + x.revenue, 0))}</strong></div><div><span>Total expenses</span><strong>${money(state.history.reduce((n, x) => n + x.expenses, 0))}</strong></div><div><span>Total profit</span><strong>${money(profit)}</strong></div><div><span>Last day’s sales / profit</span><strong>${r.sold} cookies / ${money(r.profit)}</strong></div></div><p class="result-note">Your full daily results are in the shop journal. Try another season and see how far your dough can go.</p>` : `<h2 class="result-title">${r.sold === 0 ? 'A quiet day at the shop.' : r.profit >= 0 ? 'A little sweeter today.' : 'Some days need more dough.'}</h2><p class="result-description">${r.sold} of ${r.cookies} fresh ${Game.getVariety(r.variety || 'chocolate-chip').name} cookies found a happy home.</p><div class="result-profit ${r.profit < 0 ? 'negative' : 'positive'}">${money(r.profit)}</div><span class="profit-caption">TODAY’S PROFIT</span><div class="receipt"><div><span>Cookies sold</span><strong>${r.sold} / ${r.cookies}</strong></div><div><span>Revenue</span><strong>${money(r.revenue)}</strong></div><div><span>Baking + advertising</span><strong>${money(r.expenses)}</strong></div><div><span>Remaining cash</span><strong>${money(r.cash)}</strong></div></div><p class="result-note">${r.cookies === 0 ? 'No cookies baked today. Set a batch size to start selling.' : r.sold < r.cookies ? `${r.cookies - r.sold} unsold cookies were donated. Try a smaller batch, a lower price, or more advertising.` : 'Sold out! A larger batch could serve more customers tomorrow.'}</p><div class="progress" aria-label="${days} of 30 days complete"><div style="width:${days / 30 * 100}%"></div></div>`;
    }
    updateCost();
  }
  function updateCost() {
    const recipe = Game.getVariety($('variety').value);
    $('baking-cost').textContent = `${money(recipe.cost)} each`;
    $('price-hint').textContent = `Sweet spot: around ${money(recipe.suggestedPrice)}`;
    $('variety-note').textContent = $('variety').value === 'shortbread' ? 'An affordable crowd favorite: lower cost, more neighbors.' : $('variety').value === 'double-chocolate' ? 'A rich premium treat: higher margins, a smaller crowd.' : 'The neighborhood classic: balanced cost and popularity.';
    const cost = Number($('cookies').value) * recipe.cost + Math.round(Number($('ads').value) * 100);
    $('cost').textContent = Number.isFinite(cost) ? money(cost) : '—';
    $('cost').className = cost > state.cash ? 'negative' : '';
  }
  $('variety').addEventListener('change', () => { $('price').value = Game.getVariety($('variety').value).suggestedPrice / 100; $('error').textContent = ''; updateCost(); });
  $('plan').addEventListener('input', () => { $('error').textContent = ''; updateCost(); });
  $('plan').addEventListener('submit', e => {
    e.preventDefault();
    if (serving) return;
    try {
      if (['cookies', 'price', 'ads'].some(id => $(id).value.trim() === '')) throw new Error('Fill in all three daily decisions.');
      const toCents = id => { const n = Number($(id).value) * 100; return Math.abs(n - Math.round(n)) < 0.000001 ? Math.round(n) : NaN; };
      state = Game.play(state, Number($('cookies').value), toCents('price'), toCents('ads'), Math.random, $('variety').value);
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
      $('error').textContent = ''; render();
      showCustomers(state.history[state.history.length - 1]);
    } catch (error) { $('error').textContent = error.message; }
  });
  $('restart').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => { stopCustomers(); customerScene.hidden = true; state = Game.initial(); try { localStorage.removeItem(storageKey); } catch (_) {} $('plan').reset(); $('error').textContent = ''; $('reset-dialog').close(); render(); });
  render();
}
