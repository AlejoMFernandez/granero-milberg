import { initKit } from '../kit/kit.js?v=1';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const celu = matchMedia('(max-width: 767.98px)');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- INTRO: el logo sube por tablas y las tablas giran ---------------- */
const intro = $('.intro');
let arrancoHero = null;
function terminarIntro() {
  html.classList.remove('con-intro');
  html.classList.add('listo');
  arrancoHero && arrancoHero();
}
if (html.classList.contains('con-intro')) {
  const fuentes = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]);
  fuentes.then(() => {
    setTimeout(() => intro.classList.add('abre'), 820);
    setTimeout(terminarIntro, 1560);
  });
} else requestAnimationFrame(terminarIntro);

/* ---------------- HERO: secuencia "del huerto al fuego" ---------------- */
const hA = $('.hA');
const MOM = [
  { p: 'Granero', l: 'Un granero reciclado entre árboles, a minutos de Nordelta.' },
  { p: 'Huerta', l: 'Huerta propia y quinotos: lo que va al plato se corta a metros de la cocina.' },
  { p: 'Quebracho', l: 'Novillo Angus, cochinillo y chuletón para dos, a las brasas de quebracho.' },
  { p: 'A la mesa', l: 'Cocina de autor, pastas caseras y una barra de coctelería premiada.' },
];
{
  const pal = $('[data-pal]', hA), linea = $('[data-linea]', hA), h1 = $('.hA__palabra', hA);
  const tablones = $$('.tablon', hA), botones = $$('.hA__momentos button', hA);
  let actual = -1;

  function ajustarPalabra() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = '700 100px Oswald';
    const ancho = Math.max(...MOM.map(m => c.measureText(m.p.toUpperCase()).width)) * 1.04;
    const disp = Math.min(innerWidth - 2 * (celu.matches ? 22 : 120), 1400);
    const tope = celu.matches ? 118 : Math.min(innerHeight * 0.24, 230);
    h1.style.setProperty('--fs', Math.floor(Math.min(tope, disp / ancho * 100)) + 'px');
  }
  document.fonts.ready.then(ajustarPalabra);
  addEventListener('resize', ajustarPalabra, { passive: true });
  celu.addEventListener('change', ajustarPalabra);

  function escribir(i, animar) {
    pal.innerHTML = '';
    [...MOM[i].p.toUpperCase()].forEach((ch, k) => {
      const s = document.createElement('i'); s.style.setProperty('--k', k);
      s.textContent = ch === ' ' ? ' ' : ch; pal.appendChild(s);
    });
    pal.classList.remove('entra'); void pal.offsetWidth; if (animar) pal.classList.add('entra');
    linea.textContent = MOM[i].l;
  }
  function ir(i, animar = true) {
    if (i === actual) return;
    const primera = actual < 0; actual = i;
    botones.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    if (primera || !animar || quieto) {
      tablones.forEach(t => $$('picture', t).forEach((img, k) => img.classList.toggle('ver', k === i)));
      escribir(i, animar && !quieto); return;
    }
    tablones.forEach((t, ti) => {
      t.classList.remove('gira'); void t.offsetWidth; t.classList.add('gira');
      setTimeout(() => $$('picture', t).forEach((img, k) => img.classList.toggle('ver', k === i)), ti * 90 + 320);
    });
    setTimeout(() => escribir(i, true), 160);
  }
  ir(0, false);
  arrancoHero = () => { if (!quieto) { pal.classList.remove('entra'); void pal.offsetWidth; pal.classList.add('entra'); } };

  let pend = false;
  function alScroll() {
    pend = false;
    const r = hA.getBoundingClientRect(), rango = hA.offsetHeight - innerHeight;
    const p = Math.min(0.999, Math.max(0, -r.top / rango));
    ir(Math.floor(p * MOM.length));
  }
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(alScroll); } }, { passive: true });
  botones.forEach((b, k) => b.addEventListener('click', () => {
    const rango = hA.offsetHeight - innerHeight;
    scrollTo({ top: hA.offsetTop + rango * (k + 0.5) / MOM.length, behavior: quieto ? 'auto' : 'smooth' });
  }));
}

/* ---------------- barras: aparecen al terminar el hero; sección activa ---------------- */
{
  const barras = $$('[data-barra]');
  const links = $$('.barra-top__nav a');
  const secciones = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const wowEl = $('#eventos');
  let pend = false;
  function pintar() {
    pend = false;
    const finHero = hA.getBoundingClientRect().bottom < innerHeight * 0.35;
    barras.forEach(b => b.classList.toggle('ver', finHero));
    let act = null;
    for (const s of secciones) { const r = s.getBoundingClientRect(); if (r.top < innerHeight * 0.4 && r.bottom > innerHeight * 0.4) act = s.id; }
    links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + act ? 'true' : 'false'));
    // píldora del panel: fuera del hero y del WOW en el celu
    const rw = wowEl.getBoundingClientRect();
    const enWow = rw.top < innerHeight * 0.8 && rw.bottom > innerHeight * 0.2;
    document.body.classList.toggle('sin-pill', !finHero || (celu.matches && enWow));
  }
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(pintar); } }, { passive: true });
  addEventListener('resize', pintar, { passive: true });
  pintar();
}

/* ---------------- filas que se arrastran con el mouse (desde cualquier lugar) ---------------- */
function arrastrable(el) {
  let x0 = 0, s0 = 0, activo = false, movio = false;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    activo = true; movio = false; x0 = e.clientX; s0 = el.scrollLeft;
  });
  addEventListener('pointermove', e => {
    if (!activo) return;
    const dx = e.clientX - x0;
    if (!movio && Math.abs(dx) > 4) { movio = true; el.classList.add('arrastrando'); }
    if (movio) { el.scrollLeft = s0 - dx; e.preventDefault(); }
  });
  addEventListener('pointerup', () => {
    if (!activo) return; activo = false;
    if (movio) { el.classList.remove('arrastrando'); const w = el.firstElementChild?.getBoundingClientRect().width || 300; el.scrollBy({ left: 0, behavior: 'smooth' }); void w; }
  });
  el.addEventListener('dragstart', e => e.preventDefault());
  el.addEventListener('click', e => { if (movio) { e.preventDefault(); e.stopPropagation(); movio = false; } }, true);
  el.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { el.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * el.clientWidth * 0.6, behavior: 'smooth' }); e.preventDefault(); }
  });
}
$$('[data-arrastre]').forEach(arrastrable);
$$('.pared .tabla-f').forEach((f, i) => f.style.setProperty('--n', i));
$$('[data-mover]').forEach(b => b.addEventListener('click', () => {
  const p = $('.pared'); p.scrollBy({ left: Number(b.dataset.mover) * p.clientWidth * 0.6, behavior: quieto ? 'auto' : 'smooth' });
}));

/* ---------------- entradas al scrollear ---------------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('.rv').forEach(x => io.observe(x));

/* ---------------- happy hour en vivo (el cartel se prende) ---------------- */
{
  const cartel = $('[data-hh]'), estado = $('[data-hh-estado]');
  $$('.cartel-hh__letras i').forEach((x, k) => x.style.setProperty('--k', k));
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  // [día, desde, hasta] en minutos; domingo desde las 19 hasta el cierre (01:00)
  const HH = { 2: [[720, 840], [1140, 1260]], 3: [[720, 840], [1140, 1260]], 4: [[720, 840], [1140, 1260]], 5: [[720, 840], [1140, 1260]], 0: [[1140, 1500]] };
  const hhmm = m => `${Math.floor((m % 1440) / 60)}:${String(m % 60).padStart(2, '0')}`;
  function ahora() {
    const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(x => p[x.type] = x.value);
    return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute) };
  }
  function pintar() {
    const { dia, min } = ahora();
    const ayer = (dia + 6) % 7;
    const franjas = [...(HH[dia] || []).map(([a, b]) => [a, b]), ...(HH[ayer] || []).filter(([, b]) => b > 1440).map(([a, b]) => [a - 1440, b - 1440])];
    const on = franjas.find(([a, b]) => min >= a && min < b);
    cartel.classList.toggle('on', !!on);
    if (on) { estado.textContent = `Happy hour ahora en Grolsch y Blue Moon · hasta las ${hhmm(on[1])} hs`; return; }
    const prox = (HH[dia] || []).find(([a]) => a > min);
    if (prox) { estado.textContent = `Hoy arranca a las ${hhmm(prox[0])} hs, en Grolsch y Blue Moon`; return; }
    for (let k = 1; k <= 7; k++) { const d = (dia + k) % 7; if (HH[d]) { estado.textContent = `Vuelve el ${DIAS[d]} a las ${hhmm(HH[d][0][0])} hs, en Grolsch y Blue Moon`; return; } }
  }
  pintar(); setInterval(pintar, 60000);
}

/* ---------------- KIT ---------------- */
const ICO_HH = '<svg viewBox="0 0 24 24"><path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1L6 3Zm1 4h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const plantilla = (p, ctx) => {
  const precio = ctx.money(p.precio) ?? 'Consultar';
  const tags = (p.etiquetas || []).map(t => ctx.etiquetaHTML(t)).join('');
  const mini = p.foto ? `<img class="it__mini" src="${esc(ctx.asset(p.foto))}" alt="" width="64" height="64" loading="lazy" decoding="async">` : '';
  return `<div class="it${p.foto ? ' it--foto' : ''}">${mini}<h3 class="it__fila"><span class="nom">${esc(p.nombre)}${p.foto ? '<span class="punto" aria-hidden="true"></span>' : ''}${tags ? `<span class="it__tags">${tags}</span>` : ''}</span><i aria-hidden="true"></i><b>${esc(precio)}</b></h3>${p.descripcion ? `<p class="it__desc">${esc(p.descripcion)}</p>` : ''}</div>`;
};
const kit = await initKit({
  config: 'cliente.json',
  carta: { template: plantilla, pedir: false, etiquetas: { happy: { label: 'Happy hour', icono: ICO_HH } } },
  carrito: { label: 'Tu evento' },
  badge: true,
  imagenes: { lqip: 'img/lqip.json' },
});

/* carta: encabezado por sección, Anterior / Siguiente y la foto al costado */
{
  const caja = $('#carta-local');
  const foto = $('[data-foto-plato]'), fotoTxt = $('[data-foto-txt]');
  const pasos = $$('[data-paso]');
  const tabs = () => $$('.kit-tab', caja);
  const activo = () => tabs().findIndex(t => t.classList.contains('is-on'));
  let fotoActual = '';
  function mostrarFoto(item) {
    const src = item?.dataset.photo; if (!src || src === fotoActual) return;
    fotoActual = src; foto.classList.remove('ok');
    const img = new Image(); img.onload = () => { if (fotoActual !== src) return; foto.src = src; foto.alt = item.querySelector('.nom')?.textContent || ''; requestAnimationFrame(() => foto.classList.add('ok')); };
    img.src = src;
    fotoTxt.textContent = item.querySelector('.nom')?.textContent || '';
  }
  function pintarPasos() {
    const t = tabs(), i = activo();
    pasos.forEach(b => {
      const d = Number(b.dataset.paso), dest = t[i + d];
      b.disabled = !dest;
      $('[data-paso-nombre]', b).textContent = dest ? dest.textContent : '';
    });
    const panel = $('.kit-carta__panel:not([hidden])', caja);
    const conFoto = panel && $('.kit-item[data-photo]', panel);
    if (conFoto) mostrarFoto(conFoto);
  }
  document.addEventListener('kit:carta', e => {
    if (e.detail.el !== caja) return;
    $$('.kit-carta__panel', caja).forEach(p => {
      const tab = $(`#${p.getAttribute('aria-labelledby')}`);
      const n = $$('.kit-item', p).length;
      p.insertAdjacentHTML('afterbegin', `<div class="cab-sec"><h3>${esc(tab?.textContent || '')}</h3><span>${n} ${n === 1 ? 'opción' : 'opciones'}</span></div>`);
    });
    pintarPasos();
  });
  caja.addEventListener('click', e => { if (e.target.closest('.kit-tab')) requestAnimationFrame(pintarPasos); });
  pasos.forEach(b => b.addEventListener('click', () => {
    const t = tabs(), dest = t[activo() + Number(b.dataset.paso)]; if (!dest) return;
    dest.click();
    const top = caja.getBoundingClientRect().top + scrollY - (celu.matches ? 12 : 84);
    if (caja.getBoundingClientRect().top < 0) scrollTo({ top, behavior: quieto ? 'auto' : 'smooth' });
    dest.scrollIntoView({ block: 'nearest', inline: 'center' });
  }));
  let rafF = 0;
  caja.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const it = e.target.closest('.kit-item[data-photo]'); if (!it) return;
    cancelAnimationFrame(rafF); rafF = requestAnimationFrame(() => mostrarFoto(it));
  });
  // "Ver los 17 cócteles": abre la pestaña de la carta
  $$('[data-ir-tab]').forEach(a => a.addEventListener('click', () => {
    const t = tabs().find(x => x.dataset.cat === a.dataset.irTab); t && t.click();
  }));
}

/* tragos con foto, leídos de la carta del kit */
{
  const fila = $('[data-tragos]');
  let hecho = false;
  document.addEventListener('kit:carta', e => {
    if (e.detail.el.id !== 'carta-local') return;
    const ps = e.detail.productos.filter(p => ['cocteles', 'sinalcohol'].includes(p.categoria) && p.foto && p.disponible !== false);
    fila.innerHTML = ps.map(p => `<article class="trago"><img src="${esc(kit.asset ? kit.asset(p.foto) : p.foto)}" alt="${esc(p.nombre)}" width="480" height="600" loading="lazy" decoding="async"><h3>${esc(p.nombre)} <b>${esc(kit.money ? (kit.money(p.precio) ?? '') : '')}</b></h3>${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}${p.categoria === 'sinalcohol' ? '<p class="trago__sin">0 % alcohol</p>' : ''}</article>`).join('');
    hecho = true;
  });
}

/* abierto ahora (cómo llegar) */
{
  const box = $('[data-abierto]'), txt = $('[data-abierto-txt]');
  const pintar = () => {
    try {
      const st = kit.abierto();
      box.classList.toggle('abierto', st.abierto);
      txt.textContent = st.abierto ? `Abierto ahora · cierra a las ${st.cierra} hs` : st.abre ? `Cerrado · hoy abre a las ${st.abre} hs` : 'Cerrado ahora';
    } catch { txt.textContent = 'Horarios'; }
    const d = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short' }).format(new Date());
    const fila = { Mon: 0, Tue: 1, Wed: 1, Thu: 1, Fri: 2, Sat: 2, Sun: 2 }[d];
    $$('.horas div').forEach((x, i) => x.classList.toggle('hoy', i === fila));
  };
  pintar(); setInterval(pintar, 60000);
}

/* ---------------- WOW: el granero es tuyo ---------------- */
{
  const esc2 = esc;
  const escE = $('.escena');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); padre && padre.appendChild(e); return e; };
  const svg = $('svg', escE);
  const PRECIO = 135000;
  const fmt = n => '$' + n.toLocaleString('es-AR');

  const gT = $('.es-tablas', svg);
  for (let x = 66; x < 88; x += 7) el('line', { x1: x, y1: 472, x2: x, y2: 928 }, gT);
  for (let x = 718; x < 740; x += 7) el('line', { x1: x, y1: 472, x2: x, y2: 928 }, gT);
  for (let x = 112; x < 700; x += 28) {
    const yTecho = 268 + Math.abs(x - 400) * (202 / 340) + 6;
    el('line', { x1: x, y1: yTecho, x2: x, y2: 500, style: 'opacity:.16' }, gT);
  }
  const gL = $('.es-luces', svg);
  [[118, 452, 682, 452, 46], [196, 384, 604, 384, 34]].forEach(([x1, y1, x2, y2, caida], gi) => {
    el('path', { d: `M${x1} ${y1} Q${(x1 + x2) / 2} ${y1 + caida * 2} ${x2} ${y2}` }, gL);
    const n = Math.round((x2 - x1) / 42);
    for (let k = 1; k < n; k++) {
      const t = k / n, x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (y1 + caida * 2) + t * t * y2;
      el('circle', { cx: x.toFixed(1), cy: (y + 6).toFixed(1), r: 6, style: `--d:${((k * 0.37 + gi) % 3).toFixed(2)}s` }, gL);
    }
  });

  const REC = ['Shot mediterráneo', 'Pinchos de dátiles y jamón crudo', 'Vol-au-vent de trucha ahumada y palta', 'Roll Caesar', 'Bruschettas de morcilla, hinojo y manzana', 'Choripán criollo', 'Empanaditas de carne fritas'];
  const BRINDIS = ['Brindis con espumante', 'Nespresso', 'Petit four'];
  const MENUS = {
    pasos: [
      { c: 'Recepción', s: 'Finger', t: 'Recepción', l: REC },
      { c: 'Paso 1', s: 'Entrada', t: 'Paso 1', l: ['Croquetas de hongos, gruyere y bechamel', 'Provoleta Natalio Alba con pesto y tomates asados'] },
      { c: 'Paso 2', s: 'Principal', t: 'Paso 2', l: ['Bife de chorizo Angus con papines y vegetales al horno de barro', 'Trucha patagónica grillé con salsa romesco', 'Ensalada francesa con peras asadas y queso azul'] },
      { c: 'Postre', s: 'Paso 3', t: 'Postre', l: ['Tarta vasca Granero', 'Coulis de frutos rojos', 'Mousse de chocolate'] },
      { c: 'Brindis', s: 'Paso 4', t: 'Brindis', l: BRINDIS },
    ],
    estaciones: [
      { c: 'Recepción', s: 'Finger', t: 'Recepción', l: REC },
      { c: 'Quesos', s: 'Estación', t: 'Degustación de quesos', l: ['Mordier, Atuel y azul', 'Gruyere, Reggiano y sardo', 'Con panes caseros'] },
      { c: 'Cazuelas', s: 'Paso 1', t: 'Cazuelas', l: ['Risotto de langostinos', 'Risotto de lomo braseado', 'Ñoquis de espinaca, pomodoro y crema de hongos'] },
      { c: 'Pernil', s: 'Paso 2', t: 'Pernil y sándwiches', l: ['Pernil de cerdo con salsas y panes caseros', 'Mini sándwiches de bife de chorizo Angus'] },
      { c: 'Mesa dulce', s: 'Paso 3', t: 'Mesa dulce', l: ['Pinchos frutales', 'Panqueques con crema helada', 'Flan casero', 'Shots de lemon pie, tiramisú y mousse'] },
      { c: 'Brindis', s: 'Paso 4', t: 'Brindis', l: BRINDIS },
    ],
  };
  const POS = {
    pasos: [[205, 545], [400, 545], [595, 545], [300, 652], [500, 652]],
    estaciones: [[205, 545], [400, 545], [595, 545], [205, 652], [400, 652], [595, 652]],
  };
  const st = { modo: 'pasos', g: 60, prev: 0, abierto: -1 };
  const capa = $('.escena__carteles', escE), gHilos = $('.es-hilos', svg), gEsc = $('.es-escena', svg);
  const pop = $('.cartelito', escE);

  function carteles() {
    capa.innerHTML = ''; gHilos.innerHTML = '';
    MENUS[st.modo].forEach((m, i) => {
      const [x, y] = POS[st.modo][i];
      el('line', { x1: x - 40, y1: 505, x2: x - 40, y2: y }, gHilos);
      el('line', { x1: x + 40, y1: 505, x2: x + 40, y2: y }, gHilos);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cartel'; b.setAttribute('aria-expanded', 'false');
      b.style.left = x / 10 + '%'; b.style.top = y / 10 + '%';
      b.innerHTML = `<span><small>${esc2(m.s)}</small>${esc2(m.c)}</span>`;
      b.addEventListener('click', e => { e.stopPropagation(); abrir(i); });
      capa.appendChild(b);
    });
  }
  const azar = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function escena() {
    gEsc.innerHTML = '';
    const pts = [];
    if (st.modo === 'pasos') {
      const T = Math.ceil(st.g / 20);
      for (let t = 0; t < T; t++) {
        const col = t % 2, fila = Math.floor(t / 2), x0 = col ? 424 : 118, y = 796 + fila * 34, n = Math.min(20, st.g - t * 20);
        el('rect', { class: 'es-mesa', x: x0, y: y - 4, width: 258, height: 9 }, gEsc);
        for (let k = 0; k < n; k++) pts.push([x0 + 12 + (k % 10) * 26, k < 10 ? y - 12 : y + 15]);
      }
    } else {
      [[110, 892], [270, 892], [430, 892], [590, 892]].forEach(([x, y]) => el('rect', { class: 'es-isla', x, y, width: 100, height: 22 }, gEsc));
      for (let k = 0; k < st.g; k++) pts.push([108 + azar(k) * 584, 772 + azar(k + 999) * 102]);
    }
    pts.forEach(([x, y], k) => {
      const c = el('circle', { class: 'es-p', cx: x.toFixed(1), cy: y.toFixed(1), r: 6 }, gEsc);
      if (k < st.prev) c.style.animation = 'none'; else c.style.animationDelay = Math.min(400, (k - st.prev) * 12) + 'ms';
    });
    st.prev = st.g;
  }
  function ticket() {
    $$('[data-n]').forEach(n => n.textContent = st.g);
    $('[data-modo-t]').textContent = st.modo === 'pasos' ? 'por pasos' : 'por estaciones';
    $('[data-total]').textContent = fmt(st.g * PRECIO);
    const f = $('.fardo', escE); f.setAttribute('aria-valuenow', st.g); f.setAttribute('aria-valuetext', st.g + ' invitados');
  }
  function abrir(i) {
    const m = MENUS[st.modo][i];
    st.abierto = i;
    $$('.cartel', capa).forEach((b, k) => b.setAttribute('aria-expanded', k === i ? 'true' : 'false'));
    $('[data-paso-ev]', pop).textContent = m.s;
    $('[data-tit]', pop).textContent = m.t;
    $('[data-lista]', pop).innerHTML = m.l.map(x => `<li>${esc2(x)}</li>`).join('');
    pop.hidden = false; pop.style.animation = 'none'; void pop.offsetWidth; pop.style.animation = '';
    escE.classList.add('quieto');
  }
  function cerrar() {
    if (pop.hidden) return;
    pop.hidden = true; st.abierto = -1; escE.classList.remove('quieto');
    $$('.cartel', capa).forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  $('.cartelito__x', pop).addEventListener('click', cerrar);
  pop.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', e => { if (!e.target.closest('.cartel')) cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

  $$('.escena__modo button', escE).forEach(b => b.addEventListener('click', () => {
    if (st.modo === b.dataset.modo) return;
    st.modo = b.dataset.modo; st.prev = 0; cerrar();
    $$('.escena__modo button', escE).forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    escE.dataset.modo = st.modo; carteles(); escena(); ticket();
  }));

  const fardo = $('.fardo', escE), soga = $('.es-soga', svg);
  const MIN = 20, MAX = 150, Y0 = 17, Y1 = 76;
  const gDeY = y => Math.round((MIN + (Math.min(Y1, Math.max(Y0, y)) - Y0) / (Y1 - Y0) * (MAX - MIN)) / 5) * 5;
  const yDeG = g => Y0 + (g - MIN) / (MAX - MIN) * (Y1 - Y0);
  function ponerG(g, anim) {
    g = Math.min(MAX, Math.max(MIN, g));
    if (g === st.g && !anim) return;
    st.g = g;
    const y = yDeG(g);
    fardo.style.setProperty('--fy', y + '%'); soga.setAttribute('y2', (y * 10).toFixed(1));
    if (st.prev > g) st.prev = g;
    escena(); ticket();
  }
  let arr = null;
  fardo.addEventListener('pointerdown', e => {
    escE.classList.add('tocada');
    const r = escE.getBoundingClientRect();
    arr = { r, dy: (e.clientY - r.top) / r.height * 100 - yDeG(st.g) };
    fardo.setPointerCapture(e.pointerId); e.preventDefault();
  });
  fardo.addEventListener('pointermove', e => {
    if (!arr) return;
    const y = (e.clientY - arr.r.top) / arr.r.height * 100 - arr.dy;
    const yc = Math.min(Y1, Math.max(Y0, y));
    fardo.style.setProperty('--fy', yc + '%'); soga.setAttribute('y2', (yc * 10).toFixed(1));
    const g = gDeY(yc); if (g !== st.g) { st.g = g; if (st.prev > g) st.prev = g; escena(); ticket(); }
  });
  const soltar = () => { if (arr) { arr = null; ponerG(st.g, true); } };
  fardo.addEventListener('pointerup', soltar); fardo.addEventListener('pointercancel', soltar);
  fardo.addEventListener('keydown', e => {
    const d = { ArrowDown: 5, ArrowRight: 5, ArrowUp: -5, ArrowLeft: -5, PageDown: 20, PageUp: -20 }[e.key];
    if (e.key === 'Home') ponerG(MIN); else if (e.key === 'End') ponerG(MAX); else if (d) ponerG(st.g + d); else return;
    escE.classList.add('tocada'); e.preventDefault();
  });
  carteles(); ponerG(60, true);

  // presupuesto: el evento entra al carrito del kit (por persona) y sale por WhatsApp al panel
  $('[data-presu]').addEventListener('click', async () => {
    const c = kit.carrito; if (!c) return;
    await c.listo;
    c.vaciar();
    c.agregar(st.modo === 'pasos' ? 'evento-pasos' : 'evento-estaciones', st.g, { nota: `${st.g} invitados` });
    c.abrir();
  });
}
