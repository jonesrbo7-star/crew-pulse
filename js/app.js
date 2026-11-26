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
      style: data.style === 'fable' ? 'fable' : '',
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

  function mdHtml(src, style) {
    var parse = window.marked && (window.marked.parse || window.marked);
    if (typeof parse !== 'function') return '<p>' + esc(src) + '</p>';
    var raw = parse(src, { async: false, gfm: true });
    if (typeof raw !== 'string') return '<p>' + esc(src) + '</p>';
    return decorateMd(sanitize(raw), style);
  }

  function decorateMd(html, style) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var kids = Array.prototype.slice.call(doc.body.childNodes);
    var frag = doc.createDocumentFragment();
    var i = 0;
    var n = 0;
    while (i < kids.length) {
      var node = kids[i];
      if (node.nodeType === 1 && node.tagName === 'H2') {
        var title = (node.textContent || '').replace(/\s+/g, '');
        node.id = 's' + (++n);
        var section = doc.createElement('section');
        if (style === 'fable' && title.indexOf('先看要点') === 0) section.className = 'tldr';
        else if (style === 'fable' && (title.indexOf('把握与缺口') === 0 || title.indexOf('下一步') === 0)) section.className = 'verdict';
        else if (title.indexOf('摘要') === 0) section.className = 'tldr';
        else if (title.indexOf('结论') === 0) section.className = 'verdict';
        section.appendChild(node);
        i += 1;
        while (i < kids.length && !(kids[i].nodeType === 1 && kids[i].tagName === 'H2')) {
          section.appendChild(kids[i]);
          i += 1;
        }
        frag.appendChild(section);
      } else {
        frag.appendChild(node);
        i += 1;
      }
    }
    doc.body.innerHTML = '';
    doc.body.appendChild(frag);
    softenMd(doc);
    quietTables(doc);
    if (style === 'fable') fableMd(doc);
    return doc.body.innerHTML;
  }

  function quietTables(doc) {
    Array.prototype.forEach.call(doc.body.querySelectorAll('table'), function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      var wrap = doc.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function fableMd(doc) {
    var kids = Array.prototype.slice.call(doc.body.children);
    var i = 0;
    while (i < kids.length) {
      var node = kids[i];
      if (node.classList && node.classList.contains('verdict')) {
        var wrap = doc.createElement('div');
        wrap.className = 'verdict';
        node.classList.remove('verdict');
        doc.body.insertBefore(wrap, node);
        wrap.appendChild(node);
        while (kids[i + 1] && kids[i + 1].classList && kids[i + 1].classList.contains('verdict')) {
          kids[i + 1].classList.remove('verdict');
          wrap.appendChild(kids[i + 1]);
          i += 1;
        }
      }
      i += 1;
    }
    Array.prototype.forEach.call(doc.body.querySelectorAll('section'), function (sec) {
      var heading = sec.querySelector('h2');
      var title = heading ? (heading.textContent || '').replace(/\s+/g, '') : '';
      if (title.indexOf('来源') !== 0) return;
      var ol = sec.querySelector('ol');
      if (!ol) return;
      ol.classList.add('sources');
      var n = 0;
      Array.prototype.forEach.call(ol.children, function (li) {
        if (li.tagName !== 'LI') return;
        n += 1;
        li.id = 'src-' + n;
      });
    });
    var texts = [];
    var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(function (node) {
      if (!/\[\d+\]/.test(node.textContent || '')) return;
      var parent = node.parentElement;
      if (!parent || parent.closest('a, ol.sources, pre, code')) return;
      var section = parent.closest('section');
      var heading = section && section.querySelector('h2');
      if (heading && (heading.textContent || '').replace(/\s+/g, '').indexOf('来源') === 0) return;
      var frag = doc.createDocumentFragment();
      var rest = node.textContent;
      var re = /\[(\d+)\]/g;
      var last = 0;
      var match;
      while ((match = re.exec(rest))) {
        if (match.index > last) frag.appendChild(doc.createTextNode(rest.slice(last, match.index)));
        var link = doc.createElement('a');
        link.className = 'cite';
        link.setAttribute('href', '#src-' + match[1]);
        link.textContent = match[1];
        frag.appendChild(link);
        last = match.index + match[0].length;
      }
      if (last < rest.length) frag.appendChild(doc.createTextNode(rest.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function softenMd(doc) {
    Array.prototype.forEach.call(doc.body.querySelectorAll('li, p'), function (el) {
      var kids = Array.prototype.filter.call(el.childNodes, function (node) {
        return !(node.nodeType === 3 && !String(node.textContent || '').trim());
      });
      if (kids.length === 1 && kids[0].nodeType === 1 && kids[0].tagName === 'STRONG') {
        var strong = kids[0];
        while (strong.firstChild) el.insertBefore(strong.firstChild, strong);
        el.removeChild(strong);
      }
    });
    Array.prototype.forEach.call(doc.body.querySelectorAll('ul'), function (ul) {
      var items = Array.prototype.filter.call(ul.children, function (node) { return node.tagName === 'LI'; });
      if (!items.length) return;
      var numbered = items.every(function (li) {
        return /^\d+[).、]/.test(String(li.textContent || '').trim());
      });
      if (!numbered) return;
      var ol = doc.createElement('ol');
      items.forEach(function (li) {
        var walker = doc.createTreeWalker(li, NodeFilter.SHOW_TEXT, null);
        var text = walker.nextNode();
        while (text && !String(text.textContent || '').trim()) text = walker.nextNode();
        var raw = text ? String(text.textContent) : '';
        var num = raw.match(/^\s*(\d+)[).、]\s*/);
        if (num) li.setAttribute('value', num[1]);
        if (text) text.textContent = raw.replace(/^\s*\d+[).、]\s*/, '');
        ol.appendChild(li);
      });
      ul.parentNode.replaceChild(ol, ul);
    });
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

  // Sync times are instants (Date.now()); show them in US Eastern, like the card dates.
  var NY_TIME = (function () {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      });
    } catch (e) { return null; }
  })();

  function nyParts(ms) {
    var date = new Date(ms);
    if (!NY_TIME) {
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
    }
    var out = {};
    NY_TIME.formatToParts(date).forEach(function (part) { out[part.type] = Number(part.value); });
    return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute };
  }

  function nyDay(ms) {
    var p = nyParts(ms);
    return p.year + '-' + pad(p.month) + '-' + pad(p.day);
  }

  function formatClock(ms) {
    var p = nyParts(ms);
    return p.year + '年' + p.month + '月' + p.day + '日 ' + pad(p.hour) + ':' + pad(p.minute);
  }

  function formatShort(ms) {
    var p = nyParts(ms);
    return p.month + '月' + p.day + '日 ' + pad(p.hour) + ':' + pad(p.minute);
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

  function cardSummary(report) {
    var raw = String(report.summary || '').replace(/\*\*/g, '').trim();
    var clipped = /…$|\.\.\.$/.test(raw);
    if (raw && !clipped) return raw;
    var lead = '';
    String(report.body || '').split(/\n/).some(function (line) {
      var text = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^[-*]\s+/, '').replace(/^>\s*/, '').trim();
      if (!text) return false;
      lead = text;
      return true;
    });
    if (lead && !/…$|\.\.\.$/.test(lead)) return lead;
    return raw || lead || '—';
  }

  function fullerText(text, body) {
    var raw = String(text || '');
    if (!/…$|\.\.\.$/.test(raw)) return raw;
    var stem = raw.replace(/…$|\.\.\.$/, '').replace(/\s+/g, '');
    if (stem.length < 8) return raw;
    var flat = String(body || '').replace(/\*\*/g, '').replace(/\s+/g, '');
    var at = flat.indexOf(stem);
    if (at < 0) return raw;
    var slice = flat.slice(at);
    var end = slice.search(/[。！？]/);
    if (end > stem.length && end < 360) return slice.slice(0, end + 1);
    return raw;
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
    var seen = {};
    var list = (sources || []).filter(function (source) {
      var key = String((source && (source.name || source.url)) || '').trim().toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    if (!list.length) return '';
    return '<ul class="pills">' + list.map(function (source) {
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
      var text = fullerText(step.text, report.body);
      var node = '<div class="node"><span class="stage">' + esc(STAGE_LABEL[step.stage] || step.stage) + '</span><p>' + figs(text) + '</p></div>';
      return index ? '<div class="arrow" aria-hidden="true"></div>' + node : node;
    }).join('') + '</div>';
  }

  function detailHtml(report, withSources) {
    var sources = withSources ? pillsHtml(report.sources) : '';
    return '<div class="expand-layout"><div class="md">' + mdHtml(report.body, report.style) + '</div>' + sources + '</div>';
  }

  function botById(id) {
    var found = null;
    state.bots.forEach(function (bot) { if (bot.bot_id === id) found = bot; });
    return found;
  }

  function cadenceMs(bot) {
    var hours = Number(bot && bot.cadence_hours);
    if (!isFinite(hours) || hours <= 0) hours = 24;
    return hours * 60 * 60 * 1000;
  }

  function freshLevel(bot, iso) {
    var at = Date.parse(iso || '');
    if (!isFinite(at)) return 'down';
    if (Date.now() - at >= cadenceMs(bot) * 2) return 'down';
    return 'ok';
  }

  function dotClass(level) {
    if (level === 'down') return 'dot hollow';
    if (level === 'warn') return 'dot warn';
    return 'dot fresh';
  }

  function markHtml(status) {
    if (status === 'down') return '<span class="mark down" aria-hidden="true"></span>';
    if (status === 'warn') return '<span class="mark warn" aria-hidden="true"></span>';
    return '<span class="mark" aria-hidden="true"></span>';
  }

  function statusDot(bot, iso) {
    var level = freshLevel(bot, iso);
    return '<span class="' + dotClass(level) + '" data-fresh="' + esc(bot.bot_id) + '" data-at="' + esc(iso || '') + '" aria-hidden="true"></span>';
  }

  function deltaNote(delta) {
    if (delta == null || !isFinite(delta) || delta === 0) return '';
    var arrow = delta > 0 ? '↑' : '↓';
    return '<div class="kpi-note">较昨日 ' + arrow + ' ' + Math.abs(delta) + '</div>';
  }

  function metrics(sync) {
    var today = nyDay(Date.now());
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
    globalDot.className = dotClass(sync.level);
    document.documentElement.classList.remove('sync-ok', 'sync-warn', 'sync-down');
    document.documentElement.classList.add('sync-' + sync.level);

    var series = allReports().slice().reverse().map(function (report) { return report.signal_strength; });
    document.getElementById('kpis').innerHTML =
      kpi('今日新增', stats.today, stats.todayDelta, '今天新到的条数') +
      kpi('在岗', stats.active, null, '最近一条仍可读取的人数') +
      kpi('最近同步', esc(stats.sync), null, '上次拉取成功的时间', true) +
      kpi('累计信号', stats.signal, stats.signalDelta, '各人最新信号的均值') +
      '<div class="kpi kpi-chart" title="按时间排列的信号强弱"><div class="kpi-label">信号走势</div>' + areaChart(series) + '</div>';

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
      var past = older.map(function (report) {
        var rowOpen = state.pastOpen.has(report.path);
        var blurb = cardSummary(report);
        return '<div style="--accent:' + accentOf(bot.bot_id) + '"><button type="button" class="line" data-toggle="past" data-path="' + esc(report.path) + '" aria-expanded="' + (rowOpen ? 'true' : 'false') + '">' +
          '<span class="when">' + esc(formatReportTime(report.timestamp)) + '</span>' +
          '<span class="tag">' + esc(report.tag) + '</span>' +
          '<span class="sum" title="' + esc(blurb) + '">' + esc(blurb) + '</span>' +
          markHtml(report.status) + '</button>' +
          '<div class="expand" data-panel="past" data-path="' + esc(report.path) + '"' + (rowOpen ? '' : ' hidden') + '>' + detailHtml(report, true) + '</div></div>';
      }).join('');
      var blurb = cardSummary(latest);
      return '<article class="card sync-' + sync.level + cardNew + picked + (open ? ' is-open' : '') + '" data-card="' + esc(bot.bot_id) + '" data-path="' + esc(latest.path) + '" style="--accent:' + accentOf(bot.bot_id) + '">' +
        '<div class="sheet">' +
        '<div class="who-row"><h2>' + esc(bot.en_name) + '</h2>' + statusDot(bot, latest.timestamp) + '</div>' +
        '<p class="role">' + esc(latest.role || '') + '</p>' +
        '<p class="when">' + esc(formatReportTime(latest.timestamp)) + '</p>' +
        '<p class="summary" data-summary="' + esc(blurb) + '">' + esc(liveSummary(blurb, sync)) + '</p>' +
        '<div class="meta-row">' + pillsHtml(latest.sources) +
        '<button type="button" class="hist" data-history="' + esc(bot.bot_id) + '" aria-expanded="' + (hist ? 'true' : 'false') + '">历史</button></div>' +
        '<div class="past" data-history-panel="' + esc(bot.bot_id) + '"' + (hist ? '' : ' hidden') + '>' + past + '</div>' +
        '<div class="expand" data-panel="card" data-path="' + esc(latest.path) + '"' + (open ? '' : ' hidden') + '>' + detailHtml(latest) + '</div>' +
        '</div></article>';
    }).join('');

    var rows = allReports().filter(function (report) {
      return !state.focus || report.bot_id === state.focus;
    });
    document.getElementById('timeline').innerHTML = '<h3>时间线</h3>' + rows.map(function (report) {
      var open = state.timeOpen.has(report.path);
      var freshClass = fresh && fresh.has(report.path) ? ' is-new' : '';
      var blurb = cardSummary(report);
      return '<div class="' + freshClass.trim() + '" style="--accent:' + accentOf(report.bot_id) + '"><button type="button" class="tl" data-toggle="time" data-path="' + esc(report.path) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="when">' + esc(formatReportTime(report.timestamp)) + '</span>' +
        '<span class="person">' + esc(report.name) + '</span>' +
        '<span class="tag">' + esc(report.tag) + '</span>' +
        '<span class="sum" title="' + esc(blurb) + '">' + esc(blurb) + '</span>' +
        markHtml(report.status) + '</button>' +
        '<div class="expand" data-panel="time" data-path="' + esc(report.path) + '"' + (open ? '' : ' hidden') + '>' + detailHtml(report, true) + '</div></div>';
    }).join('');

    if (!document.documentElement.classList.contains('ready')) {
      document.documentElement.classList.add('ready');
    }
  }

  function kpi(label, value, delta, hint, wide) {
    var id = label === '最近同步' ? ' id="kpi-sync"' : '';
    return '<div class="kpi' + (wide ? ' kpi-wide' : '') + '" title="' + esc(hint || '') + '"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value"' + id + '>' +
      value + '</div>' + deltaNote(delta) + '</div>';
  }

  function paintSync() {
    var sync = syncState();
    if (!signature) return;
    var globalDot = document.getElementById('global-dot');
    if (globalDot) globalDot.className = dotClass(sync.level);
    document.querySelectorAll('[data-fresh]').forEach(function (dot) {
      dot.className = dotClass(freshLevel(botById(dot.getAttribute('data-fresh')), dot.getAttribute('data-at')));
    });
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
    document.querySelectorAll('.card').forEach(function (card) {
      var open = card.querySelector('.expand:not([hidden])');
      card.classList.toggle('is-open', !!open);
    });
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
    var block = '<div class="kpi"><div class="kpi-label">今日新增</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi"><div class="kpi-label">在岗</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi kpi-wide"><div class="kpi-label">最近同步</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi"><div class="kpi-label">累计信号</div><div class="sk sk-kpi"></div></div>' +
      '<div class="kpi kpi-chart"><div class="kpi-label">信号走势</div><div class="sk" style="height:40px"></div></div>';
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
