import { settings, yearAt, playback } from './model.mjs';

const $ = id => document.getElementById(id);
const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
let config = settings({ principal: 100, rate: 10, years: 2 });
let state = { year: 0, playing: false };
let timer;
const reducePreference = window.matchMedia('(prefers-reduced-motion: reduce)');
$('reduce-motion').checked = reducePreference.matches;

function coin(x, y, color, className = '') {
  const ns = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('class', className);
  const outer = document.createElementNS(ns, 'circle');
  for (const [key, val] of Object.entries({ cx: x, cy: y, r: 17, fill: color, stroke: '#6d7751', 'stroke-width': 1.3 })) outer.setAttribute(key, val);
  const inner = outer.cloneNode();
  inner.setAttribute('r', 12.5); inner.setAttribute('fill', 'none'); inner.setAttribute('stroke', '#fffdf7'); inner.setAttribute('stroke-opacity', '.65');
  const text = document.createElementNS(ns, 'text');
  for (const [key, val] of Object.entries({ x, y: y + 5, fill: '#52634b', 'text-anchor': 'middle', 'font-size': 15, 'font-family': 'system-ui', 'font-weight': 600 })) text.setAttribute(key, val);
  text.textContent = '$'; group.append(outer, inner, text); return group;
}

function drawCoins(row, animate) {
  const container = $('coins'); container.replaceChildren();
  // Tokens illustrate the groups; they are not a fixed denomination.
  for (let i = 0; i < 10; i++) container.append(coin(239 + i % 5 * 40.5, 318 - Math.floor(i / 5) * 38, '#edc468'));
  const prior = row.openingBalance - config.principal;
  const count = prior > 0 ? Math.min(10, Math.max(1, Math.ceil(prior / config.principal * 8))) : 0;
  for (let i = 0; i < count; i++) container.append(coin(239 + i % 5 * 40.5, 241 - Math.floor(i / 5) * 38, '#8cb694'));
  if (row.onSavings > 0) container.append(coin(293, 175, '#8cb694', 'new-coin'));
  if (row.onInterest > 0) container.append(coin(347, 175, '#bc9ed3', 'new-coin interest-coin'));
  $('reward-one').toggleAttribute('hidden', row.onSavings === 0);
  $('reward-two').toggleAttribute('hidden', row.onInterest === 0);
  $('savings-reward').textContent = money(row.onSavings);
  $('interest-reward').textContent = money(row.onInterest);
  $('jar-description').textContent = `Year ${state.year}. ${money(config.principal)} starting savings and ${money(row.totalInterest)} total interest, for a balance of ${money(row.balance)}. Gold tokens represent starting savings, green tokens interest, and purple tokens interest on past interest. Tokens have no fixed dollar value.`;
  const scene = document.querySelector('.scene');
  scene.classList.remove('animate');
  document.body.classList.toggle('still', $('reduce-motion').checked);
  if (animate && !$('reduce-motion').checked) { void scene.offsetWidth; scene.classList.add('animate'); }
}

function render(animate = false) {
  const row = yearAt(config, state.year);
  const last = state.year === config.years;
  $('year-label').textContent = `Year ${state.year} of ${config.years}`;
  $('year-scrub').max = config.years; $('year-scrub').value = state.year;
  $('year-scrub').setAttribute('aria-valuetext', `Year ${state.year} of ${config.years}, balance ${money(row.balance)}`);
  $('timeline-end').textContent = `${config.years} ${config.years === 1 ? 'year' : 'years'}`;
  $('balance').textContent = money(row.balance);
  $('interest-total').textContent = state.year ? `${money(row.totalInterest)} earned in interest. All kept in the jar.` : 'Ready to earn its first reward.';
  if (config.rate === 0) $('interest-total').textContent = 'At 0%, the savings stay the same.';
  $('play').textContent = state.playing ? 'Ⅱ Pause story' : last ? '▶ Play again' : '▶ Play story';
  $('play').setAttribute('aria-pressed', String(state.playing));
  $('previous').disabled = state.year === 0; $('next').disabled = last;
  let title, caption, detailTitle, detailCopy;
  if (!state.year) {
    title = 'Every story starts with a little saving.';
    caption = `Pip saves ${money(config.principal)}. Press play or move forward a year to see what happens.`;
    detailTitle = 'Let’s give your savings a little time.';
    detailCopy = `In this pretend account, Pip earns ${config.rate}% interest each year. We keep every reward in the jar, with no extra deposits.`;
  } else if (config.rate === 0) {
    title = 'Time passes. The savings stay put.';
    caption = 'With a 0% interest rate, there is no extra reward. Try increasing the rate!';
    detailTitle = 'No interest means no growth.';
    detailCopy = `After ${state.year} ${state.year === 1 ? 'year' : 'years'}, Pip still has ${money(config.principal)}. Time alone does not add money when the rate is 0%.`;
  } else if (state.year === 1) {
    title = 'Hello, first little reward!';
    caption = `${config.rate}% of ${money(config.principal)} is ${money(row.earned)}. Pip keeps it all in the jar.`;
    detailTitle = 'The reward stays with the savings.';
    detailCopy = `Pip now has ${money(row.balance)}. If another year passes at this rate, the new interest can earn its own interest.`;
  } else {
    title = 'Look! The reward earns a reward.';
    caption = `The starting savings earn ${money(row.onSavings)}. Past interest earns another ${money(row.onInterest)}!`;
    detailTitle = 'This is compound interest in action.';
    detailCopy = `${money(row.openingBalance - config.principal)} in earlier interest earns ${money(row.onInterest)} this year. Pip earns ${money(row.earned)} altogether this year, without adding any new savings.`;
  }
  $('story-title').textContent = title; $('story-caption').textContent = caption;
  $('breakdown-label').textContent = state.year ? `WHAT HAPPENS IN YEAR ${state.year}` : 'THE FIRST CHAPTER';
  $('breakdown-title').textContent = detailTitle; $('breakdown-copy').textContent = detailCopy;
  const equation = $('breakdown-equation'); equation.replaceChildren();
  const values = state.year ? [
    ['base', row.openingBalance, 'already in the jar'], ['earned', row.onSavings, 'on starting savings'], ['bonus', row.onInterest, 'on past interest'], ['total', row.balance, 'new balance']
  ] : [['base', config.principal, 'starting savings']];
  values.forEach(([cls, value, label], i) => {
    if (i) { const sign = document.createElement('b'); sign.textContent = i === 3 ? '=' : '+'; equation.append(sign); }
    const part = document.createElement('span'); part.className = cls; part.textContent = money(value);
    const small = document.createElement('small'); small.textContent = label; part.append(small); equation.append(part);
  });
  drawCoins(row, animate);
}

function renderProjection() {
  const final = yearAt(config, config.years);
  $('projection-years').textContent = `${config.years} ${config.years === 1 ? 'YEAR' : 'YEARS'}`;
  $('projection-balance').textContent = money(final.balance);
  $('projection-interest').textContent = config.rate === 0 ? 'At 0%, no interest is earned.' : `That’s ${money(final.totalInterest)} earned in interest.`;
  const tbody = $('year-rows'); tbody.replaceChildren();
  for (let year = 0; year <= config.years; year++) {
    const row = yearAt(config, year); const tr = document.createElement('tr');
    [String(year), ...[row.openingBalance, row.onSavings, row.onInterest, row.balance].map(money)].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
    tbody.append(tr);
  }
}

function schedule() {
  clearTimeout(timer);
  if (state.playing) timer = setTimeout(() => dispatch('tick'), Number($('speed').value));
}
function dispatch(action) {
  state = playback(state, action, config.years);
  render(['tick', 'next', 'previous'].includes(action)); schedule();
}
function updateSettings() {
  try {
    for (const id of ['principal', 'rate-number', 'years-number']) if ($(id).value.trim() === '') throw new Error('Fill in all three settings to update the story.');
    config = settings({ principal: $('principal').value, rate: $('rate-number').value, years: $('years-number').value });
    $('settings-error').hidden = true;
    $('principal').removeAttribute('aria-invalid'); $('rate-number').removeAttribute('aria-invalid'); $('years-number').removeAttribute('aria-invalid');
    $('rate').value = config.rate; $('years').value = config.years;
    state = playback(state, 'reset', config.years); clearTimeout(timer);
    renderProjection(); render();
  } catch {
    state = playback(state, 'pause', config.years); clearTimeout(timer); render();
    $('settings-error').hidden = false;
    $('settings-error').textContent = 'Use $10–$10,000, a rate of 0–30%, and 1–30 whole years. The story keeps your last valid settings until corrected.';
    for (const id of ['principal', 'rate-number', 'years-number']) $(id).setAttribute('aria-invalid', String(!$(id).validity.valid || $(id).value.trim() === ''));
  }
}
$('settings-form').addEventListener('submit', event => { event.preventDefault(); updateSettings(); });
for (const [slider, input] of [['rate', 'rate-number'], ['years', 'years-number']]) {
  $(slider).addEventListener('input', () => { $(input).value = $(slider).value; updateSettings(); });
  $(input).addEventListener('input', updateSettings);
}
$('principal').addEventListener('input', updateSettings);
$('play').addEventListener('click', () => dispatch(state.playing ? 'pause' : 'play'));
$('previous').addEventListener('click', () => dispatch('previous'));
$('next').addEventListener('click', () => dispatch('next'));
$('replay').addEventListener('click', () => dispatch('replay'));
$('speed').addEventListener('change', schedule);
$('reduce-motion').addEventListener('change', () => render());
reducePreference.addEventListener('change', event => { $('reduce-motion').checked = event.matches; render(); });
$('year-scrub').addEventListener('input', () => { clearTimeout(timer); state = { year: Number($('year-scrub').value), playing: false }; render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) dispatch('pause'); });
renderProjection(); render();
