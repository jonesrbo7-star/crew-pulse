(function () {
  var POLL_MS = 5 * 60 * 1000;
  var WARN_MS = 10 * 60 * 1000;
  var DOWN_MS = 60 * 60 * 1000;
  var UNLOCK_KEY = 'crew-pulse-unlocked';

  var state = {
    bots: [],
    reports: new Map(),
    lastOkAt: 0,
    cardOpen: new Set(),
    histOpen: new Set(),
    timeOpen: new Set(),
    historyOpen: new Set()
  };

  var started = false;
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
    var parts = path.split('/');
    return {
      path: path,
      folder: parts[1] || '',
      bot_id: String(data.bot_id || ''),
      en_name: String(data.en_name || ''),
      timestamp: String(timestamp || ''),
      status: status,
      summary: String(data.summary || ''),
      sources: Array.isArray(data.sources) ? data.sources : [],
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

  function sourcesHtml(sources) {
    if (!sources || !sources.length) return '';
    var items = sources.map(function (source) {
      var name = esc(source && (source.name || source.url) || '');
      var url = String(source && source.url || '');
      if (!/^https?:\/\//i.test(url)) return '<li><span>' + name + '</span></li>';
      return '<li><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + name + '</a></li>';
    }).join('');
    return '<ul class="sources">' + items + '</ul>';
  }

  function formatReportTime(iso) {
    var match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return String(iso || '');
    return Number(match[2]) + '月' + Number(match[3]) + '日 ' + match[4] + ':' + match[5];
  }

  function pad(n) { return String(n).padStart(2, '0'); }

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

  function syncLabel(sync) {
    if (sync.level === 'warn') return '等待同步 · ' + formatShort(sync.at);
    if (sync.level === 'down') return liveSummary('', sync);
    return sync.at ? formatShort(sync.at) : '';
  }

  function reportsFor(bot) {
    var list = [];
    state.reports.forEach(function (report) {
      if (report.folder === bot.folder) list.push(report);
    });
    list.sort(function (a, b) {
      return Date.parse(b.timestamp) - Date.parse(a.timestamp);
    });
    return list;
  }

  function dotHtml(status, sync) {
    var glow = sync.level === 'ok' ? ' glow' : '';
    return '<span class="dot ' + status + glow + '" aria-hidden="true"></span>';
  }

  function isOpen(scope, path) {
    if (scope === 'card') return state.cardOpen.has(path);
    if (scope === 'hist') return state.histOpen.has(path);
    return state.timeOpen.has(path);
  }

  function markdownBlock(report, className, scope) {
    var open = isOpen(scope, report.path);
    return '<div class="' + className + '" data-scope="' + scope + '" data-path="' + esc(report.path) + '" data-body' + (open ? '' : ' hidden') + '>' +
      mdHtml(report.body) + '</div>';
  }

  function currentSignature() {
    var paths = Array.from(state.reports.keys()).sort().join('|');
    var bots = state.bots.map(function (bot) {
      return bot.bot_id + ':' + bot.display_order + ':' + bot.en_name;
    }).join(',');
    return bots + '#' + paths;
  }

  function paint(fresh) {
    var next = currentSignature();
    if (signature && signature === next && (!fresh || fresh.size === 0)) {
      paintSync();
      return;
    }
    signature = next;
    var sync = syncState();
    var counts = { ok: 0, warn: 0, down: 0 };
    var dots = state.bots.map(function (bot) {
      var latest = reportsFor(bot)[0];
      var status = latest ? latest.status : 'down';
      if (latest) counts[status] += 1;
      return dotHtml(status, sync);
    }).join('');

    var top = document.getElementById('topbar');
    top.className = 'topbar sync-' + sync.level;
    top.innerHTML =
      '<div class="dots">' + dots + '</div>' +
      '<div class="counts" aria-label="正常 ' + counts.ok + '，关注 ' + counts.warn + '，中断 ' + counts.down + '">' +
        '<span class="ok">' + counts.ok + '</span>' +
        '<span class="warn">' + counts.warn + '</span>' +
        '<span class="down">' + counts.down + '</span>' +
      '</div>' +
      '<div id="sync-label" class="sync' + (sync.level === 'down' ? ' long' : '') + '">' + esc(syncLabel(sync)) + '</div>';

    var columns = state.bots.map(function (bot) {
      var list = reportsFor(bot);
      var latest = list[0];
      var cardNew = latest && fresh && fresh.has(latest.path) ? ' is-new' : '';
      var summary = latest ? latest.summary : '';
      var body = latest ? (
        '<div class="card-hit" data-scope="card" data-path="' + esc(latest.path) + '" data-toggle tabindex="0" role="button" aria-expanded="' + (state.cardOpen.has(latest.path) ? 'true' : 'false') + '">' +
          '<div class="card-top">' + dotHtml(latest.status, sync) +
            '<div><h2>' + esc(bot.en_name) + '</h2><p class="when">' + esc(formatReportTime(latest.timestamp)) + '</p></div>' +
          '</div>' +
          '<p class="summary" data-summary="' + esc(summary) + '">' + esc(liveSummary(summary, sync)) + '</p>' +
        '</div>' +
        markdownBlock(latest, 'card-body md', 'card') +
        sourcesHtml(latest.sources)
      ) : (
        '<div class="card-top">' + dotHtml('down', sync) + '<div><h2>' + esc(bot.en_name) + '</h2></div></div>' +
        '<p class="summary" data-summary="—">' + esc(liveSummary('—', sync)) + '</p>'
      );

      var historyRows = list.slice(1).map(function (report) {
        var open = state.histOpen.has(report.path);
        return '<div>' +
          '<button type="button" class="line" data-scope="hist" data-path="' + esc(report.path) + '" data-toggle aria-expanded="' + (open ? 'true' : 'false') + '">' +
            dotHtml(report.status, sync) +
            '<span class="when">' + esc(formatReportTime(report.timestamp)) + '</span>' +
            '<span class="sum">' + esc(report.summary) + '</span>' +
          '</button>' +
          '<div class="detail" data-scope="hist" data-path="' + esc(report.path) + '" data-body' + (open ? '' : ' hidden') + '>' +
            '<div class="md">' + mdHtml(report.body) + '</div>' + sourcesHtml(report.sources) +
          '</div></div>';
      }).join('');

      var historyOpen = state.historyOpen.has(bot.bot_id);
      return '<article class="bot sync-' + sync.level + cardNew + '" data-bot="' + esc(bot.bot_id) + '">' +
        '<div class="card">' + body + '</div>' +
        '<button type="button" class="history-toggle" data-history="' + esc(bot.bot_id) + '" aria-expanded="' + (historyOpen ? 'true' : 'false') + '">查看历史</button>' +
        '<div class="history" data-history-panel="' + esc(bot.bot_id) + '"' + (historyOpen ? '' : ' hidden') + '>' +
          (historyRows || '') +
        '</div></article>';
    }).join('');

    document.getElementById('board').innerHTML = columns;

    var all = [];
    state.bots.forEach(function (bot) {
      reportsFor(bot).forEach(function (report) {
        all.push(Object.assign({ name: bot.en_name }, report));
      });
    });
    all.sort(function (a, b) { return Date.parse(b.timestamp) - Date.parse(a.timestamp); });

    document.getElementById('timeline').innerHTML = all.map(function (report) {
      var open = state.timeOpen.has(report.path);
      var freshClass = fresh && fresh.has(report.path) ? ' is-new' : '';
      return '<div class="' + freshClass.trim() + '">' +
        '<button type="button" class="tl" data-scope="time" data-path="' + esc(report.path) + '" data-toggle aria-expanded="' + (open ? 'true' : 'false') + '">' +
          dotHtml(report.status, sync) +
          '<span class="who">' + esc(report.name) + '</span>' +
          '<span class="when">' + esc(formatReportTime(report.timestamp)) + '</span>' +
          '<span class="sum">' + esc(report.summary) + '</span>' +
        '</button>' +
        '<div class="detail" data-scope="time" data-path="' + esc(report.path) + '" data-body' + (open ? '' : ' hidden') + '>' +
          '<div class="md">' + mdHtml(report.body) + '</div>' + sourcesHtml(report.sources) +
        '</div></div>';
    }).join('');

    if (!document.documentElement.classList.contains('ready')) {
      document.documentElement.classList.add('ready');
    }
  }

  function paintSync() {
    var sync = syncState();
    var top = document.getElementById('topbar');
    if (!top || !signature) return;
    top.classList.remove('sync-ok', 'sync-warn', 'sync-down');
    top.classList.add('sync-' + sync.level);
    var label = document.getElementById('sync-label');
    if (label) {
      label.textContent = syncLabel(sync);
      label.classList.toggle('long', sync.level === 'down');
    }
    document.querySelectorAll('.bot').forEach(function (bot) {
      bot.classList.remove('sync-ok', 'sync-warn', 'sync-down');
      bot.classList.add('sync-' + sync.level);
    });
    document.querySelectorAll('.card .summary[data-summary]').forEach(function (node) {
      node.textContent = liveSummary(node.getAttribute('data-summary'), sync);
    });
    var glow = sync.level === 'ok';
    document.querySelectorAll('.dot').forEach(function (dot) {
      dot.classList.toggle('glow', glow);
      if (sync.level === 'warn') dot.style.background = '';
    });
  }

  function replayFade() {
    document.querySelectorAll('.is-new').forEach(function (el) {
      el.classList.remove('is-new');
      void el.offsetWidth;
      el.classList.add('is-new');
    });
  }

  function setOpen(set, scope, path) {
    if (set.has(path)) set.delete(path);
    else set.add(path);
    var on = set.has(path);
    document.querySelectorAll('[data-scope="' + scope + '"]').forEach(function (el) {
      if (el.getAttribute('data-path') !== path) return;
      if (el.hasAttribute('data-body')) el.hidden = !on;
      if (el.hasAttribute('data-toggle')) el.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  function onClick(event) {
    if (event.target.closest('a')) return;
    var history = event.target.closest('[data-history]');
    if (history) {
      var id = history.getAttribute('data-history');
      var panel = document.querySelector('[data-history-panel="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      var open = !state.historyOpen.has(id);
      if (open) state.historyOpen.add(id);
      else state.historyOpen.delete(id);
      if (panel) panel.hidden = !open;
      history.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    var hit = event.target.closest('[data-toggle]');
    if (!hit) return;
    var path = hit.getAttribute('data-path');
    var scope = hit.getAttribute('data-scope');
    var sets = { card: state.cardOpen, hist: state.histOpen, time: state.timeOpen };
    setOpen(sets[scope] || state.cardOpen, scope, path);
  }

  function onKey(event) {
    var hit = event.target.closest('[data-toggle]');
    if (!hit || hit.tagName === 'BUTTON') return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      hit.click();
    }
  }

  function mapPool(items, limit, fn) {
    var cursor = 0;
    var workers = [];
    var size = Math.min(limit, items.length);
    function worker() {
      if (cursor >= items.length) return Promise.resolve();
      var index = cursor++;
      return Promise.resolve(fn(items[index])).then(worker);
    }
    for (var i = 0; i < size; i++) workers.push(worker());
    return Promise.all(workers);
  }

  function loadCrew() {
    return getText('config/crew.json').then(function (text) {
      var crew = JSON.parse(text);
      var bots = Array.isArray(crew.bots) ? crew.bots.slice() : [];
      bots.sort(function (a, b) { return Number(a.display_order) - Number(b.display_order); });
      state.bots = bots;
      if (bots.length) document.title = bots.map(function (bot) { return bot.en_name; }).join(' · ');
    });
  }

  function refresh() {
    var fresh = new Set();
    return loadCrew().then(function () {
      return getText('reports/index.json');
    }).then(function (text) {
      var index = JSON.parse(text);
      var folders = new Set(state.bots.map(function (bot) { return bot.folder; }));
      var paths = (index.reports || []).map(function (item) { return item.path; }).filter(function (path) {
        var folder = String(path || '').split('/')[1];
        return folders.has(folder);
      });
      var missing = paths.filter(function (path) { return !state.reports.has(path); });
      return mapPool(missing, 8, function (path) {
        return getText(path).then(function (body) {
          state.reports.set(path, parseReport(body, path));
          fresh.add(path);
        }).catch(function (error) {
          console.warn(path, error);
        });
      });
    }).then(function () {
      state.lastOkAt = Date.now();
      paint(fresh);
    }).catch(function (error) {
      console.warn(error);
      paint(fresh);
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
  app.addEventListener('keydown', onKey);

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
      start().then(function () {
        document.documentElement.classList.add('unlocked');
        replayFade();
      });
    }).catch(function () {
      gateError.classList.add('is-shown');
    });
  });

  if (document.documentElement.classList.contains('unlocked')) {
    start().then(replayFade);
  } else if (gateInput) {
    gateInput.focus();
  }
})();
