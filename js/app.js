(function () {
  var POLL_MS = 5 * 60 * 1000;
  var WARN_MS = 10 * 60 * 1000;
  var DOWN_MS = 60 * 60 * 1000;
  var UNLOCK_KEY = 'crew-pulse-auth';
  var STAGES = ['signal', 'path', 'impact'];
  var STAGE_LABEL = { signal: '信号', path: '路径', impact: '影响' };

  var state = {
    bots: [],
    reports: new Map(),
    lastOkAt: 0,
    focus: '',
    cardOpen: new Set(),
    histOpen: new Set(),
    pastOpen: new Set(),
    timeOpen: new Set()
  };
  var started = false;
  var primed = false;
  var signature = '';

  var app = document.getElementById('app');
  var gateForm = document.getElementById('gate-form');
  var gateInput = document.getElementById('gate-input');
  var gateError = document.getElementById('gate-error');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function figs(text) {
    return esc(text).replace(/(\d+(?:\.\d+)?)/g, '<b class="fig">$1</b>');
  }

  function pageBase() {
    var url = new URL(window.location.href);
    if (!url.pathname.endsWith('/')) url.pathname = url.pathname.replace(/[^/]*$/, '');
    url.search = '';
    url.hash = '';
    return url.href;
  }

  function resolveData(rel) {
    var configured = (window.CREW_SITE && window.CREW_SITE.DATA_BASE_URL || '').trim();
    if (configured) return configured.replace(/\/$/, '') + '/' + String(rel).replace(/^\//, '');
    return new URL(rel, pageBase()).href;
  }

  function getText(rel) {
    var url = resolveData(rel);
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return fetch(url + sep + 't=' + Date.now(), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error(res.status + ' ' + rel);
      return res.text();
    });
  }

  function sha256(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function passwordOk(value) {
    var expected = String((window.CREW_SITE && window.CREW_SITE.PASSWORD_HASH) || '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected)) return Promise.resolve(false);
    return sha256(value).then(function (actual) {
      var diff = 0;
      for (var i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
      return diff === 0;
    });
  }

  function parseReport(text, path) {
    var match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) throw new Error('frontmatter');
    var data = window.jsyaml.load(match[1]) || {};
    var timestamp = data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp;
    var status = data.status;
    if (status !== 'ok' && status !== 'warn' && status !== 'down') status = 'down';
    var strength = Number(data.signal_strength);
    if (!isFinite(strength)) strength = null;
    var flow = Array.isArray(data.flow) ? data.flow.filter(function (step) {
      return step && STAGES.indexOf(step.stage) >= 0 && step.text;
    }) : [];
    return {
      path: path,
      bot_id: String(data.bot_id || ''),
      en_name: String(data.en_name || ''),
      timestamp: String(timestamp || ''),
      status: status,
      summary: String(data.summary || ''),
      role: String(data.role || ''),
      tag: String(data.tag || ''),
      signal_strength: strength,
      sources: Array.isArray(data.sources) ? data.sources : [],
      flow: flow,
      body: match[2].trim()
    };
  }

  function sanitize(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.body.querySelectorAll('script, iframe, object, embed, link, style').forEach(function (node) {
      node.remove();
    });
    doc.body.querySelectorAll('*').forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var value = attr.value.trim();
        if (name.indexOf('on') === 0 || name === 'style') el.removeAttribute(attr.name);
        if ((name === 'href' || name === 'src') && !/^https?:\/\//i.test(value)) el.removeAttribute(attr.name);
      });
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return doc.body.innerHTML;
  }

  function mdHtml(src) {
    var parse = window.marked && (window.marked.parse || window.marked);
    if (typeof parse !== 'function') return '<p>' + esc(src) + '</p>';
    var raw = parse(src, { async: false, gfm: true });
    if (typeof raw !== 'string') return '<p>' + esc(src) + '</p>';
    return sanitize(raw);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatReportTime(iso) {
    var match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return String(iso || '');
    return Number(match[2]) + '月' + Number(match[3]) + '日 ' + match[4] + ':' + match[5];
  }

  function dayKey(iso) {
    var match = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  function localDay(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function shiftDay(key, delta) {
    var parts = key.split('-');
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    date.setDate(date.getDate() + delta);
    return localDay(date);
  }

  function formatClock(ms) {
    var date = new Date(ms);
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function formatShort(ms) {
    var date = new Date(ms);
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function syncState() {
    var sim = new URLSearchParams(window.location.search).get('simulate');
    if (sim === 'warn') return { level: 'warn', at: Date.now() - 11 * 60 * 1000 };
    if (sim === 'down') return { level: 'down', at: Date.now() - 61 * 60 * 1000 };
    if (!state.lastOkAt) return { level: 'down', at: 0 };
    var age = Date.now() - state.lastOkAt;
    if (age > DOWN_MS) return { level: 'down', at: state.lastOkAt };
    if (age > WARN_MS) return { level: 'warn', at: state.lastOkAt };
    return { level: 'ok', at: state.lastOkAt };
  }

  function liveSummary(original, sync) {
    if (sync.level === 'warn') return '等待同步';
    if (sync.level === 'down') {
      return sync.at ? '连接中断，最后更新时间是 ' + formatClock(sync.at) : '连接中断';
    }
    return original || '—';
  }

  function byTime(a, b) { return Date.parse(b.timestamp) - Date.parse(a.timestamp); }

  function reportsFor(botId) {
    var list = [];
    state.reports.forEach(function (report) {
      if (report.bot_id === botId) list.push(report);
    });
    list.sort(byTime);
    return list;
  }

  function allReports() {
    var list = [];
    state.bots.forEach(function (bot) {
      reportsFor(bot.bot_id).forEach(function (report) {
        list.push(Object.assign({ name: bot.en_name }, report));
      });
    });
    list.sort(byTime);
    return list;
  }

  function seriesPoints(values, w, h, pad) {
    var nums = values.filter(function (v) { return v != null && isFinite(v); });
    if (!nums.length) return null;
    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);
    var span = Math.max(1, max - min);
    var pts = nums.map(function (v, i) {
      var x = nums.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (nums.length - 1);
      var y = h - pad - ((v - min) / span) * (h - pad * 2);
      return { x: x, y: y };
    });
    return pts;
  }

  function sparkline(values) {
    var pts = seriesPoints(values, 160, 28, 3);
    if (!pts) return '';
    var line = pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    var last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 160 28" aria-hidden="true"><polyline points="' + line + '" />' +
      '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="2.2" /></svg>';
  }

  function areaChart(values) {
    var pts = seriesPoints(values, 320, 56, 2);
    if (!pts) return '';
    var line = pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    var area = '2,54 ' + line + ' 318,54';
    return '<svg class="area" viewBox="0 0 320 56" aria-hidden="true"><polygon points="' + area + '" /><polyline points="' + line + '" /></svg>';
  }

  function accentOf(botId) {
    var bot = null;
    state.bots.forEach(function (item) { if (item.bot_id === botId) bot = item; });
    var color = bot && bot.color;
    return /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#5C6770';
  }

  function sourceType(source) {
    var type = source && source.type;
    return type === 'paper' || type === 'patent' || type === 'news' ? type : 'news';
  }

  function pillsHtml(sources) {
    if (!sources || !sources.length) return '';
    return '<ul class="pills">' + sources.map(function (source) {
      var type = sourceType(source);
      var name = esc(source.name || source.url || '');
      var url = String(source.url || '');
      if (!/^https?:\/\//i.test(url)) return '<li><span class="pill ' + type + '">' + name + '</span></li>';
      return '<li><a class="pill ' + type + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + name + '</a></li>';
    }).join('') + '</ul>';
  }

  function citesHtml(sources) {
    if (!sources || !sources.length) return '';
    return '<p class="cites">' + sources.map(function (source) {
      var name = esc(source.name || source.url || '');
      var url = String(source.url || '');
      if (!/^https?:\/\//i.test(url)) return '<span>' + name + '</span>';
      return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + name + '</a>';
    }).join('') + '</p>';
  }

  function flowHtml(report) {
    var steps = report.flow || [];
    if (!steps.length) return '';
    var color = accentOf(report.bot_id);
    return '<div class="flow" style="--accent:' + color + '">' + steps.map(function (step, index) {
      var node = '<div class="node"><span class="stage">' + esc(STAGE_LABEL[step.stage] || step.stage) + '</span><p>' + figs(step.text) + '</p></div>';
      return index ? '<div class="arrow" aria-hidden="true"></div>' + node : node;
    }).join('') + '</div>';
  }

  function detailHtml(report) {
    return flowHtml(report) + '<div class="md">' + mdHtml(report.body) + '</div>' + citesHtml(report.sources);
  }

  function markHtml(status) {
    if (status === 'down') return '<span class="mark down" aria-hidden="true"></span>';
    if (status === 'warn') return '<span class="mark warn" aria-hidden="true"></span>';
    return '<span class="mark" aria-hidden="true"></span>';
  }

  function statusDot(sync) {
    var level = sync && sync.level;
    if (level === 'down') return '<span class="dot hollow" aria-hidden="true"></span>';
    if (level === 'warn') return '<span class="dot warn" aria-hidden="true"></span>';
    return '<span class="dot iron glow" aria-hidden="true"></span>';
  }

  function trendHtml(delta) {
    if (delta == null || !isFinite(delta) || delta === 0) return '';
    var arrow = delta > 0 ? '↑' : '↓';
    return '<span class="trend">' + arrow + ' ' + Math.abs(delta) + '</span>';
  }

  function metrics(sync) {
    var today = localDay(new Date());
    var yesterday = shiftDay(today, -1);
    var todayList = [];
    var yList = [];
    state.reports.forEach(function (report) {
      var day = dayKey(report.timestamp);
      if (day === today) todayList.push(report);
      if (day === yesterday) yList.push(report);
    });
    var active = state.bots.filter(function (bot) {
      var latest = reportsFor(bot.bot_id)[0];
      return latest && latest.status !== 'down';
    }).length;
    function avg(list) {
      var nums = list.map(function (r) { return r.signal_strength; }).filter(function (n) { return n != null; });
      if (!nums.length) return null;
      return Math.round(nums.reduce(function (a, b) { return a + b; }, 0) / nums.length);
    }
    var signal = avg(state.bots.map(function (bot) { return reportsFor(bot.bot_id)[0]; }).filter(Boolean));
    var signalDelta = null;
    var yAvg = avg(yList);
    var tAvg = avg(todayList);
    if (tAvg != null && yAvg != null) signalDelta = tAvg - yAvg;
    return {
      today: todayList.length,
      todayDelta: yList.length || todayList.length ? todayList.length - yList.length : null,
      active: active,
      sync: sync.at ? formatShort(sync.at) : '—',
      signal: signal == null ? '—' : signal,
      signalDelta: signalDelta
    };
  }

  function currentSignature() {
    var paths = Array.from(state.reports.keys()).sort().join('|');
    var bots = state.bots.map(function (bot) { return bot.bot_id + ':' + bot.display_order + ':' + bot.en_name; }).join(',');
    return bots + '#' + paths + '#' + state.focus;
  }

  function visibleBots() {
    if (!state.focus) return state.bots;
    return state.bots.filter(function (bot) { return bot.bot_id === state.focus; });
  }

  function paint(fresh) {
    var next = currentSignature();
    if (signature && signature === next && (!fresh || fresh.size === 0)) {
      paintSync();
      return;
    }
    signature = next;
    var sync = syncState();
    var stats = metrics(sync);
    var globalDot = document.getElementById('global-dot');
    globalDot.className = 'dot ' + (sync.level === 'down' ? 'hollow' : sync.level === 'warn' ? 'warn' : 'iron glow');
    document.documentElement.classList.remove('sync-ok', 'sync-warn', 'sync-down');
    document.documentElement.classList.add('sync-' + sync.level);

    var series = allReports().slice().reverse().map(function (report) { return report.signal_strength; });
    document.getElementById('kpis').innerHTML =
      kpi('今日', stats.today, stats.todayDelta) +
      kpi('在岗', stats.active, null) +
      kpi('同步', esc(stats.sync), null) +
      kpi('信号', stats.signal, stats.signalDelta) +
      '<div class="kpi-chart">' + areaChart(series) + '</div>';

    var nav = '<button type="button" class="nav-item' + (state.focus ? '' : ' is-on') + '" data-focus="">全部</button>' +
      state.bots.map(function (bot) {
        return '<button type="button" class="nav-item' + (state.focus === bot.bot_id ? ' is-on' : '') + '" data-focus="' + esc(bot.bot_id) + '" style="--accent:' + accentOf(bot.bot_id) + '">' +
          markHtml() + esc(bot.en_name) + '</button>';
      }).join('');
    document.getElementById('side').innerHTML = nav;
    document.getElementById('chips').innerHTML = nav.replace(/nav-item/g, 'chip');

    document.getElementById('cards').innerHTML = visibleBots().map(function (bot) {
      var list = reportsFor(bot.bot_id);
      var latest = list[0];
      if (!latest) return '';
      var older = list.slice(1);
      var open = state.cardOpen.has(bot.bot_id);
      var hist = state.histOpen.has(bot.bot_id);
      var cardNew = fresh && fresh.has(latest.path) ? ' is-new' : '';
      var picked = state.focus === bot.bot_id ? ' is-picked' : '';
      var values = list.slice().reverse().map(function (report) { return report.signal_strength; });
      var past = older.map(function (report) {
        var rowOpen = state.pastOpen.has(report.path);
        return '<div style="--accent:' + accentOf(bot.bot_id) + '"><button type="button" class="line" data-toggle="past" data-path="' + esc(report.path) + '" aria-expanded="' + (rowOpen ? 'true' : 'false') + '">' +
          markHtml(report.status) +
          '<span class="tag">' + esc(report.tag) + '</span>' +
          '<span class="when">' + esc(formatReportTime(report.timestamp)) + '</span>' +
          '<span class="sum">' + esc(report.summary) + '</span></button>' +
          '<div class="expand" data-panel="past" data-path="' + esc(report.path) + '"' + (rowOpen ? '' : ' hidden') + '>' + detailHtml(report) + '</div></div>';
      }).join('');
      return '<article class="card sync-' + sync.level + cardNew + picked + '" data-card="' + esc(bot.bot_id) + '" data-path="' + esc(latest.path) + '" style="--accent:' + accentOf(bot.bot_id) + '">' +
        '<div class="accent"></div>' +
        sparkline(values) +
        '<div class="who-row"><h2>' + esc(bot.en_name) + '</h2>' + statusDot(sync) + '</div>' +
        '<p class="role">' + esc(latest.role || '') + '</p>' +
        '<p class="when">' + esc(formatReportTime(latest.timestamp)) + '</p>' +
        '<p class="summary" data-summary="' + esc(latest.summary) + '">' + esc(liveSummary(latest.summary, sync)) + '</p>' +
        pillsHtml(latest.sources) +
        '<div class="expand" data-panel="card" data-path="' + esc(latest.path) + '"' + (open ? '' : ' hidden') + '>' + detailHtml(latest) + '</div>' +
        '<button type="button" class="hist" data-history="' + esc(bot.bot_id) + '" aria-expanded="' + (hist ? 'true' : 'false') + '">历史</button>' +
        '<div class="past" data-history-panel="' + esc(bot.bot_id) + '"' + (hist ? '' : ' hidden') + '>' + past + '</div>' +
        '</article>';
    }).join('');

    var rows = allReports().filter(function (report) {
      return !state.focus || report.bot_id === state.focus;
    });
    document.getElementById('timeline').innerHTML = '<h3>时间线</h3>' + rows.map(function (report) {
      var open = state.timeOpen.has(report.path);
      var freshClass = fresh && fresh.has(report.path) ? ' is-new' : '';
      return '<div class="' + freshClass.trim() + '" style="--accent:' + accentOf(report.bot_id) + '"><button type="button" class="tl" data-toggle="time" data-path="' + esc(report.path) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        markHtml(report.status) +
        '<span class="tag">' + esc(report.tag) + '</span>' +
        '<span class="person">' + esc(report.name) + '</span>' +
        '<span class="when">' + esc(formatReportTime(report.timestamp)) + '</span>' +
        '<span class="sum">' + esc(report.summary) + '</span></button>' +
        '<div class="expand" data-panel="time" data-path="' + esc(report.path) + '"' + (open ? '' : ' hidden') + '>' + detailHtml(report) + '</div></div>';
    }).join('');

    if (!document.documentElement.classList.contains('ready')) {
      document.documentElement.classList.add('ready');
    }
  }

function kpi(label, value, delta) {
  var id = label === '同步' ? ' id="kpi-sync"' : '';
  return '<div class="kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value"' + id + '>' +
    value + trendHtml(delta) + '</div></div>';
}

  function paintSync() {
    var sync = syncState();
    if (!signature) return;
    var globalDot = document.getElementById('global-dot');
    if (globalDot) globalDot.className = 'dot ' + (sync.level === 'down' ? 'hollow' : sync.level === 'warn' ? 'warn' : 'iron glow');
    document.documentElement.classList.remove('sync-ok', 'sync-warn', 'sync-down');
    document.documentElement.classList.add('sync-' + sync.level);
    var syncNode = document.getElementById('kpi-sync');
    if (syncNode) {
      var trend = syncNode.querySelector('.trend');
      syncNode.textContent = sync.at ? formatShort(sync.at) : '—';
      if (trend) syncNode.appendChild(trend);
    }
    document.querySelectorAll('.card').forEach(function (card) {
      card.classList.remove('sync-ok', 'sync-warn', 'sync-down');
      card.classList.add('sync-' + sync.level);
    });
    document.querySelectorAll('.summary[data-summary]').forEach(function (node) {
      node.textContent = liveSummary(node.getAttribute('data-summary'), sync);
    });
  }

  function openSet(kind) {
    if (kind === 'card') return state.cardOpen;
    if (kind === 'past') return state.pastOpen;
    return state.timeOpen;
  }

  function togglePanel(kind, path) {
    var set = openSet(kind);
    var on = !set.has(path);
    if (on) set.add(path); else set.delete(path);
    document.querySelectorAll('[data-panel="' + kind + '"]').forEach(function (el) {
      if (el.getAttribute('data-path') !== path) return;
      el.hidden = !on;
      if (on) el.classList.add('reveal');
    });
    document.querySelectorAll('[data-toggle="' + kind + '"]').forEach(function (el) {
      if (el.getAttribute('data-path') !== path) return;
      el.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    if (kind === 'card') {
      document.querySelectorAll('[data-card]').forEach(function (card) {
        if (card.getAttribute('data-path') === path) card.setAttribute('data-open', on ? 'true' : 'false');
      });
    }
  }

  function onClick(event) {
    if (event.target.closest('a')) return;
    var focus = event.target.closest('[data-focus]');
    if (focus) {
      var id = focus.getAttribute('data-focus');
      state.focus = state.focus === id ? '' : id;
      signature = '';
      paint(new Set());
      if (state.focus) {
        var card = document.querySelector('[data-card="' + CSS.escape(state.focus) + '"]');
        if (card) card.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
      return;
    }
    var history = event.target.closest('[data-history]');
    if (history) {
      event.stopPropagation();
      var botId = history.getAttribute('data-history');
      var open = !state.histOpen.has(botId);
      if (open) state.histOpen.add(botId); else state.histOpen.delete(botId);
      var panel = document.querySelector('[data-history-panel="' + CSS.escape(botId) + '"]');
      if (panel) panel.hidden = !open;
      history.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    var toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      togglePanel(toggle.getAttribute('data-toggle'), toggle.getAttribute('data-path'));
      return;
    }
    if (event.target.closest('.expand') || event.target.closest('.pills')) return;
    var card = event.target.closest('[data-card]');
    if (card) togglePanel('card', card.getAttribute('data-path'));
  }

  function mapPool(items, limit, fn) {
    var cursor = 0;
    var workers = [];
    function worker() {
      if (cursor >= items.length) return Promise.resolve();
      var index = cursor++;
      return Promise.resolve(fn(items[index])).then(worker);
    }
    var size = Math.min(limit, items.length);
    for (var i = 0; i < size; i++) workers.push(worker());
    return Promise.all(workers);
  }

  function loadCrew() {
    return getText('config/crew.json').then(function (text) {
      var crew = JSON.parse(text);
      var bots = Array.isArray(crew.bots) ? crew.bots.slice() : [];
      bots.sort(function (a, b) { return Number(a.display_order) - Number(b.display_order); });
      state.bots = bots;
      document.title = 'Crew';
    });
  }

  function refresh() {
    var fresh = new Set();
    return loadCrew().then(function () {
      return getText('reports/index.json');
    }).then(function (text) {
      var index = JSON.parse(text);
      var ids = new Set(state.bots.map(function (bot) { return bot.bot_id; }));
      var paths = (index.reports || []).map(function (item) { return item.path; });
      var missing = paths.filter(function (path) { return !state.reports.has(path); });
      return mapPool(missing, 8, function (path) {
        return getText(path).then(function (body) {
          var report = parseReport(body, path);
          if (!ids.has(report.bot_id)) return;
          state.reports.set(path, report);
          fresh.add(path);
        }).catch(function (error) { console.warn(path, error); });
      });
    }).then(function () {
      state.lastOkAt = Date.now();
      paint(primed ? fresh : new Set());
      primed = true;
    }).catch(function (error) {
      console.warn(error);
      paint(primed ? fresh : new Set());
      primed = true;
    });
  }

  function start() {
    if (started) return Promise.resolve();
    started = true;
    return refresh().then(function () {
      setInterval(refresh, POLL_MS);
      setInterval(paintSync, 20000);
    });
  }

  app.addEventListener('click', onClick);

  function renderShell() {
    document.documentElement.classList.add('ready');
    var block = '<div class="kpi"><div class="kpi-label">今日</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi"><div class="kpi-label">在岗</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi"><div class="kpi-label">同步</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi"><div class="kpi-label">信号</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi-chart"><div class="sk" style="height:56px"></div></div>';
    document.getElementById('kpis').innerHTML = block;
    document.getElementById('side').innerHTML = '<div class="sk sk-nav"></div><div class="sk sk-nav"></div><div class="sk sk-nav"></div>';
    document.getElementById('chips').innerHTML = '<span class="sk sk-chip"></span><span class="sk sk-chip"></span><span class="sk sk-chip"></span>';
    document.getElementById('cards').innerHTML = '<div class="card sk-card"><div class="sk sk-bar"></div><div class="sk sk-bar"></div><div class="sk sk-bar"></div></div>' +
      '<div class="card sk-card"><div class="sk sk-bar"></div><div class="sk sk-bar"></div><div class="sk sk-bar"></div></div>';
    document.getElementById('timeline').innerHTML = '<h3>时间线</h3><div class="sk sk-row"></div><div class="sk sk-row"></div><div class="sk sk-row"></div><div class="sk sk-row"></div>';
  }

  function setPopover(open) {
    if (document.documentElement.classList.contains('unlocked')) open = false;
    gateForm.hidden = !open;
    lockBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) gateInput.focus();
  }

  var lockBtn = document.getElementById('lock-btn');
  var lockWrap = document.getElementById('lock-wrap');
  lockBtn.addEventListener('click', function () { setPopover(gateForm.hidden); });
  lockWrap.addEventListener('click', function (event) { event.stopPropagation(); });
  document.addEventListener('click', function () { setPopover(false); });

  gateForm.addEventListener('submit', function (event) {
    event.preventDefault();
    passwordOk(gateInput.value).then(function (ok) {
      if (!ok) {
        gateError.classList.add('is-shown');
        gateInput.value = '';
        gateInput.focus();
        return;
      }
      gateError.classList.remove('is-shown');
      try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
      document.documentElement.classList.add('unlocked');
      setPopover(false);
      start();
    }).catch(function () {
      gateError.classList.add('is-shown');
    });
  });

  renderShell();
  if (document.documentElement.classList.contains('unlocked')) start();
})();
