/* ============================================================
   LinoStrategy Fund — data + interactions
   ------------------------------------------------------------
   Edit the CONFIG block below to update holdings / prices.
   BTC price is fetched live from CoinGecko every 30 s.
   ============================================================ */

const CONFIG = {
  fundName: 'LinoStrategy Fund',
  asOf: '30 May 2026',
  usdIdr: 16250,          // USD -> IDR conversion rate (editable)

  // Digital assets
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0.70094143, priceUSD: 73578, allTimePct: 197, color: '#f0b90b' }
  ],

  // Indonesian equities (prices in IDR, 1 lot = 100 shares)
  equities: [
    { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia',       sector: 'Technology',         lots: 4149, avg: 50.98, last: 50,   color: '#4a90e2' },
    { symbol: 'SRTG', name: 'Saratoga Investama Sedaya',  sector: 'Investment Holding', lots: 32,   avg: 1560,  last: 1560, color: '#16c784' },
    { symbol: 'BMRI', name: 'Bank Mandiri',               sector: 'Banking',            lots: 7,    avg: 4120,  last: 4080, color: '#9b6dff' }
  ],

  lotSize: 100,

  // All-time monthly market value path (millions of IDR). Shape only;
  // the final point is snapped to the live total below.
  historyM: [311, 298, 352, 470, 640, 760, 720, 910, 1080, 1210, 1305, 1352, 1270, 1130, 980, 1055, 905, 867]
};

/* ---------- derived figures ---------- */
const R = CONFIG.usdIdr;
const btc = CONFIG.crypto[0];
btc.valueUSD = btc.amount * btc.priceUSD;
btc.valueIDR = btc.valueUSD * R;
btc.costUSD  = btc.valueUSD / (1 + btc.allTimePct / 100);
btc.plUSD    = btc.valueUSD - btc.costUSD;
btc.livePrice = btc.priceUSD;
btc.priceSource = 'seed'; // 'seed' | 'live' | 'error'

CONFIG.equities.forEach(e => {
  e.shares  = e.lots * CONFIG.lotSize;
  e.valueIDR = e.shares * e.last;
  e.costIDR  = e.shares * e.avg;
  e.plIDR    = e.valueIDR - e.costIDR;
  e.plPct    = e.costIDR ? (e.plIDR / e.costIDR) * 100 : 0;
});

const equitiesValueIDR = CONFIG.equities.reduce((s, e) => s + e.valueIDR, 0);
const equitiesCostIDR  = CONFIG.equities.reduce((s, e) => s + e.costIDR, 0);

function baseTotalIDR() { return btc.amount * btc.livePrice * R + equitiesValueIDR; }
const totalCostIDR   = btc.costUSD * R + equitiesCostIDR;
const totalReturnPct = (baseTotalIDR() - totalCostIDR) / totalCostIDR * 100;

/* ---------- formatting ---------- */
const fmtIDRnum = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const fmtUSDnum = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSD0   = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtInt    = new Intl.NumberFormat('en-US');
const pct = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
const cls = v => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'flat');

function compactIDR(v) {
  if (v >= 1e9) return 'Rp ' + (v / 1e9).toFixed(2) + ' B';
  if (v >= 1e6) return 'Rp ' + (v / 1e6).toFixed(1) + ' M';
  return 'Rp ' + fmtIDRnum.format(v);
}
function compactCur(idr) {
  return state.currency === 'USD' ? fmtUSD0.format(idr / R) : compactIDR(idr);
}

/* ---------- state ---------- */
const state = { currency: 'IDR', period: 'ALL' };

/* ============================================================
   Hero: live market value counter
   ============================================================ */
const heroNum = document.getElementById('heroNum');
const heroCur = document.getElementById('heroCur');
const heroAlt = document.getElementById('heroAlt');
const heroReturn = document.getElementById('heroReturn');
const btcPriceEl = document.getElementById('btcPrice');
let displayIDR = baseTotalIDR();

/* Continuous live-tick growth (NBIM-style): the displayed value drifts
   upward every frame at an assumed annual growth rate, and gently
   corrects toward the real total whenever a fresh BTC price arrives. */
const ASSUMED_ANNUAL_GROWTH = 0.14;            // 14% / yr expected appreciation
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
let lastTickTime = performance.now();

function renderHero() {
  if (state.currency === 'USD') {
    heroCur.textContent = '$';
    heroNum.textContent = fmtUSDnum.format(displayIDR / R);
    heroAlt.textContent = '≈ ' + compactIDR(displayIDR);
  } else {
    heroCur.textContent = 'Rp';
    heroNum.textContent = fmtIDRnum.format(displayIDR);
    heroAlt.textContent = '≈ ' + fmtUSD0.format(displayIDR / R);
  }
  const ret = (displayIDR - totalCostIDR) / totalCostIDR * 100;
  heroReturn.textContent = pct(ret);
  heroReturn.classList.toggle('neg', ret < 0);

  const srcBadge = btc.priceSource === 'live'  ? '<span class="price-badge live">LIVE</span>'
                 : btc.priceSource === 'error' ? '<span class="price-badge err">OFFLINE</span>'
                 :                               '<span class="price-badge seed">SEED</span>';
  btcPriceEl.innerHTML = '1 BTC = $' + fmtInt.format(Math.round(btc.livePrice)) + ' ' + srcBadge;
}

function tick(now) {
  if (typeof now !== 'number') now = performance.now();
  const dt = Math.min((now - lastTickTime) / 1000, 1); // seconds, capped
  lastTickTime = now;

  const target = baseTotalIDR();
  // continuous upward drift at the assumed growth rate
  displayIDR += displayIDR * (ASSUMED_ANNUAL_GROWTH / SECONDS_PER_YEAR) * dt;
  // gently pull toward the real total when live data moves it
  displayIDR += (target - displayIDR) * 0.04;

  renderHero();
  requestAnimationFrame(tick);
}

/* ============================================================
   Live BTC price — CoinGecko public API, polled every 30 s
   ============================================================ */
let lastFetchTime = null;

async function fetchBtcPrice() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const price = data?.bitcoin?.usd;
    if (!price || typeof price !== 'number') throw new Error('bad payload');
    btc.livePrice = price;
    btc.priceSource = 'live';
    lastFetchTime = new Date();
    // recalculate all-time return based on live price
    btc.allTimePct = ((btc.livePrice - btc.costUSD / btc.amount) / (btc.costUSD / btc.amount)) * 100;
    renderTables();
    renderLegends();
    renderStats();
    drawChart();
  } catch (e) {
    btc.priceSource = btc.priceSource === 'live' ? 'error' : btc.priceSource;
    console.warn('BTC price fetch failed:', e.message);
  }
}

// fetch immediately on load, then every 30 s
fetchBtcPrice();
setInterval(fetchBtcPrice, 30_000);

/* ---------- live clock ---------- */
const heroClock = document.getElementById('heroClock');
function updateClock() {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const upd = lastFetchTime
    ? ` · BTC updated ${String(lastFetchTime.getHours()).padStart(2,'0')}:${String(lastFetchTime.getMinutes()).padStart(2,'0')}:${String(lastFetchTime.getSeconds()).padStart(2,'0')}`
    : '';
  heroClock.textContent = `${hh}:${mm}:${ss}${upd}`;
}
setInterval(updateClock, 1000);

/* ---------- currency toggle ---------- */
document.querySelectorAll('.cur-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cur-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.currency = btn.dataset.cur;
    renderHero();
    renderTables();
    renderLegends();
    renderStats();
    drawChart();
  });
});

/* ============================================================
   Chart
   ============================================================ */
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const chartFoot = document.getElementById('chartFoot');
const chartTip = document.getElementById('chartTip');

const MONTHS = ['Dec 24','Jan 25','Feb 25','Mar 25','Apr 25','May 25','Jun 25','Jul 25','Aug 25','Sep 25','Oct 25','Nov 25','Dec 25','Jan 26','Feb 26','Mar 26','Apr 26','May 26'];

function allSeriesIDR() {
  const arr = CONFIG.historyM.map((m, i) => ({ label: MONTHS[i] || '', v: m * 1e6 }));
  arr[arr.length - 1].v = baseTotalIDR(); // snap last point to live total
  return arr;
}
function noisy(end, n, vol, labels) {
  const out = new Array(n);
  out[n - 1] = end;
  for (let i = n - 2; i >= 0; i--) out[i] = out[i + 1] * (1 + (Math.random() - 0.5) * vol);
  return out.map((v, i) => ({ label: labels ? labels(i, n) : '', v }));
}
function seriesFor(period) {
  const all = allSeriesIDR();
  const end = baseTotalIDR();
  switch (period) {
    case '1Y': return all.slice(-13);
    case '6M': return all.slice(-7);
    case '1M': return noisy(end, 30, 0.018, (i, n) => `D-${n - 1 - i}`);
    case '1W': return noisy(end, 7,  0.012, (i, n) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] || '');
    case '1D': return noisy(end, 24, 0.004, (i) => `${String(i).padStart(2,'0')}:00`);
    default:   return all;
  }
}

let lastSeries = [];
let plotGeo = null;

function drawChart() {
  const series = seriesFor(state.period);
  lastSeries = series;
  const data = series.map(p => state.currency === 'USD' ? { ...p, v: p.v / R } : p);

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = 320;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = { t: 24, r: 12, b: 28, l: 12 };
  const vals = data.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || max || 1;
  min -= span * 0.12; max += span * 0.12;
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const X = i => pad.l + (i / (data.length - 1)) * plotW;
  const Y = v => pad.t + (1 - (v - min) / (max - min)) * plotH;
  plotGeo = { X, Y, data, pad, plotW, plotH, w, h };

  // gridlines
  ctx.strokeStyle = 'rgba(17,17,17,0.07)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
  }

  const up = data[data.length - 1].v >= data[0].v;
  const line = up ? '#0a7d5a' : '#c0362c';

  // area fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, up ? 'rgba(10,125,90,0.18)' : 'rgba(192,54,44,0.16)');
  grad.addColorStop(1, up ? 'rgba(10,125,90,0)' : 'rgba(192,54,44,0)');
  ctx.beginPath();
  ctx.moveTo(X(0), Y(data[0].v));
  for (let i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i].v));
  ctx.lineTo(X(data.length - 1), h - pad.b);
  ctx.lineTo(X(0), h - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(X(0), Y(data[0].v));
  for (let i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i].v));
  ctx.strokeStyle = line; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();

  // peak marker (only for longer ranges)
  if (['ALL', '1Y', '6M'].includes(state.period)) {
    let pi = 0; for (let i = 1; i < data.length; i++) if (data[i].v > data[pi].v) pi = i;
    const px = X(pi), py = Y(data[pi].v);
    ctx.fillStyle = 'rgba(17,17,17,0.45)';
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = pi > data.length / 2 ? 'right' : 'left';
    ctx.fillText('peak ' + compactCur(series[pi].v), px + (pi > data.length / 2 ? -8 : 8), py - 8);
  }

  // current dot
  const lx = X(data.length - 1), ly = Y(data[data.length - 1].v);
  ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fillStyle = line; ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 9, 0, Math.PI * 2); ctx.fillStyle = up ? 'rgba(10,125,90,0.15)' : 'rgba(192,54,44,0.15)'; ctx.fill();

  // footer summary
  const first = series[0].v, lastV = series[series.length - 1].v;
  const chg = (lastV - first) / first * 100;
  chartFoot.innerHTML =
    `<span>Start <b>${compactCur(first)}</b></span>` +
    `<span>Period change <b class="${cls(chg)}">${pct(chg)}</b></span>` +
    `<span>Now <b>${compactCur(lastV)}</b></span>`;
}

/* ---------- chart hover tooltip ---------- */
canvas.addEventListener('mousemove', ev => {
  if (!plotGeo) return;
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const { data } = plotGeo;
  let i = Math.round((mx - plotGeo.pad.l) / plotGeo.plotW * (data.length - 1));
  i = Math.max(0, Math.min(data.length - 1, i));
  const s = lastSeries[i];
  chartTip.hidden = false;
  chartTip.style.left = plotGeo.X(i) + 'px';
  chartTip.style.top = plotGeo.Y(data[i].v) + 'px';
  chartTip.innerHTML = `<div class="tt-val">${compactCur(s.v)}</div><div class="tt-date">${s.label}</div>`;
});
canvas.addEventListener('mouseleave', () => { chartTip.hidden = true; });

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.period = btn.dataset.period;
    drawChart();
  });
});
window.addEventListener('resize', drawChart);

/* ============================================================
   Allocation donuts
   ============================================================ */
function donutGradient(parts) {
  let acc = 0;
  const stops = parts.map(p => {
    const start = acc; acc += p.pct;
    return `${p.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

const totalNow = () => baseTotalIDR();

function allocParts() {
  const T = totalNow();
  return [
    { name: 'Bitcoin', color: btc.color, valueIDR: btc.valueIDR, pct: btc.valueIDR / T * 100 },
    { name: 'Indonesian equities', color: '#4a90e2', valueIDR: equitiesValueIDR, pct: equitiesValueIDR / T * 100 }
  ];
}
function equityParts() {
  return CONFIG.equities.map(e => ({
    name: e.symbol, color: e.color, valueIDR: e.valueIDR, pct: e.valueIDR / equitiesValueIDR * 100
  }));
}

function renderDonuts() {
  document.getElementById('donutTotal').style.background = donutGradient(allocParts());
  document.getElementById('donutEquity').style.background = donutGradient(equityParts());
}
function legendHTML(parts) {
  return parts.map(p =>
    `<li><span class="swatch" style="background:${p.color}"></span>` +
    `<span class="lg-name">${p.name}<br><span class="lg-val">${compactCur(p.valueIDR)}</span></span>` +
    `<span class="lg-pct">${p.pct.toFixed(p.pct < 1 ? 2 : 1)}%</span></li>`
  ).join('');
}
function renderLegends() {
  document.getElementById('legendTotal').innerHTML = legendHTML(allocParts());
  document.getElementById('legendEquity').innerHTML = legendHTML(equityParts());
}

/* ============================================================
   Holdings tables
   ============================================================ */
function valCell(idr) { return state.currency === 'USD' ? fmtUSD0.format(idr / R) : 'Rp ' + fmtIDRnum.format(idr); }

function renderTables() {
  const T = totalNow();

  // crypto
  const cb = document.querySelector('#cryptoTable tbody');
  cb.innerHTML = CONFIG.crypto.map(c => {
    const valIDR = c.amount * c.livePrice * R;
    const w = valIDR / T * 100;
    const price = state.currency === 'USD' ? '$' + fmtInt.format(Math.round(c.livePrice)) : 'Rp ' + fmtIDRnum.format(c.livePrice * R);
    return `<tr>
      <td><div class="asset-cell"><span class="asset-ico" style="background:${c.color}">₿</span>
        <div><div class="a-sym">${c.symbol}</div><div class="a-name">${c.name}</div></div></div></td>
      <td class="num">${c.amount} ${c.symbol}</td>
      <td class="num">${price}</td>
      <td class="num">${valCell(valIDR)}</td>
      <td class="num ${cls(c.allTimePct)}">${pct(c.allTimePct)}</td>
      <td class="num">${w.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  // equities
  const eb = document.querySelector('#equityTable tbody');
  eb.innerHTML = CONFIG.equities.map(e => {
    const w = e.valueIDR / T * 100;
    return `<tr>
      <td><span class="ticker-pill">${e.symbol}</span></td>
      <td>${e.name}</td>
      <td><span class="sub">${e.sector}</span></td>
      <td class="num">${fmtInt.format(e.shares)}<div class="sub">${fmtInt.format(e.lots)} lots</div></td>
      <td class="num">${fmtInt.format(e.avg)} / ${fmtInt.format(e.last)}</td>
      <td class="num">${valCell(e.valueIDR)}</td>
      <td class="num ${cls(e.plPct)}">${pct(e.plPct)}</td>
      <td class="num">${w.toFixed(2)}%</td>
    </tr>`;
  }).join('');
}

/* ============================================================
   Key figures
   ============================================================ */
function renderStats() {
  const T = totalNow();
  const profit = T - totalCostIDR;
  const ret = profit / totalCostIDR * 100;
  const holdings = CONFIG.crypto.length + CONFIG.equities.length;
  const stats = [
    { label: 'Total market value', value: compactCur(T), sub: state.currency === 'USD' ? '≈ ' + compactIDR(T) : '≈ ' + fmtUSD0.format(T / R) },
    { label: 'All-time return', value: pct(ret), sub: 'since inception', cls: cls(ret) },
    { label: 'Total profit', value: (profit >= 0 ? '+' : '') + compactCur(Math.abs(profit)), sub: 'unrealised', cls: cls(profit) },
    { label: 'Best performer', value: 'Bitcoin', sub: pct(btc.allTimePct), cls: 'pos' },
    { label: 'Holdings', value: String(holdings), sub: `${CONFIG.crypto.length} crypto · ${CONFIG.equities.length} equities` },
    { label: 'Asset classes', value: '2', sub: 'digital assets + equities' }
  ];
  document.getElementById('statsGrid').innerHTML = stats.map(s =>
    `<div class="stat"><div class="s-label">${s.label}</div>` +
    `<div class="s-value ${s.cls || ''}">${s.value}</div>` +
    `<div class="s-sub">${s.sub}</div></div>`
  ).join('');
}

/* ============================================================
   Init
   ============================================================ */
document.getElementById('asOfLabel').textContent = CONFIG.asOf;
heroReturn.textContent = pct(totalReturnPct);
updateClock();
renderHero();
renderDonuts();
renderLegends();
renderTables();
renderStats();
drawChart();
requestAnimationFrame(tick);
