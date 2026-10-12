(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) api.boot(root.document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var EMPTY = 'I need this one to do the math.';
  var NAN = 'Numbers only, please.';
  var WHOLE = 'Use a whole number. Rounding is fine.';
  var AT_LEAST = 'This needs to be at least 1.';
  var RANGE = 'This needs to be between 1 and 100.';
  var QUOTES_MAX = "That's more than this calculator handles. Try 5,000 or less.";
  var VALUE_MAX = "That's more than this calculator handles. Try $10,000,000 or less.";

  function clean(raw) {
    return String(raw == null ? '' : raw).trim().replace(/[$,%\s]/g, '');
  }

  function idiv(n, d) {
    return (n - (n % d)) / d;
  }

  function parseField(kind, raw) {
    var cleaned = clean(raw);
    if (cleaned === '') {
      if (kind === 'close') return { ok: true, value: 10, empty: true, error: '' };
      return { ok: false, value: null, empty: true, error: EMPTY };
    }
    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      return { ok: false, value: null, empty: false, error: NAN };
    }
    if (kind !== 'value' && cleaned.indexOf('.') !== -1) {
      return { ok: false, value: null, empty: false, error: WHOLE };
    }
    var n = kind === 'value' ? parseInt(cleaned.split('.')[0], 10) : parseInt(cleaned, 10);
    if (kind === 'quotes' || kind === 'value') {
      if (n < 1) return { ok: false, value: n, empty: false, error: AT_LEAST };
      if (kind === 'quotes' && n > 5000) return { ok: false, value: n, empty: false, error: QUOTES_MAX };
      if (kind === 'value' && n > 10000000) return { ok: false, value: n, empty: false, error: VALUE_MAX };
    } else if (n < 1 || n > 100) {
      return { ok: false, value: n, empty: false, error: RANGE };
    }
    return { ok: true, value: n, empty: false, error: '' };
  }

  function headlineAmount(numerator) {
    if (numerator < 1000000) return null;
    var step = numerator < 100000000 ? 100
      : numerator < 1000000000 ? 1000
      : numerator < 10000000000 ? 10000
      : 100000;
    return idiv(numerator, 10000 * step) * step;
  }

  function compute(quotes, avg, quiet, close) {
    var numerator = quotes * 12 * quiet * close * avg;
    var quietTenths = idiv(quotes * 12 * quiet, 10);
    var jobsTenths = idiv(quotes * 12 * quiet * close, 1000);
    return {
      numerator: numerator,
      raw: numerator / 10000,
      amount: headlineAmount(numerator),
      year: quotes * 12,
      quietTenths: quietTenths,
      jobsTenths: jobsTenths
    };
  }

  function formatTenths(tenths) {
    if (tenths <= 0) return null;
    var whole = idiv(tenths, 10);
    var frac = tenths % 10;
    var grouped = whole.toLocaleString('en-US');
    return frac === 0 ? grouped : grouped + '.' + frac;
  }

  function formatMoney(n) {
    return '$' + n.toLocaleString('en-US');
  }

  function formatCount(n) {
    return n.toLocaleString('en-US');
  }

  return {
    clean: clean,
    parseField: parseField,
    compute: compute,
    formatTenths: formatTenths,
    formatMoney: formatMoney,
    formatCount: formatCount,
    headlineAmount: headlineAmount,
    boot: boot
  };

  function boot(document) {
    var fields = [
      { id: 'quotes', kind: 'quotes', revealed: false },
      { id: 'value', kind: 'value', revealed: false },
      { id: 'quiet', kind: 'quiet', revealed: false },
      { id: 'close', kind: 'close', revealed: false }
    ];
    var closeEdited = false;
    var hadResult = false;
    var result = document.getElementById('result');
    var live = document.getElementById('result-live');
    var summary = document.getElementById('result-summary');
    var sub = document.getElementById('result-sub');
    var steps = document.getElementById('result-steps');
    var caveatEl = document.getElementById('result-caveat');
    var showBtn = document.getElementById('show');
    var summaryText = '';

    fields.forEach(function (field) {
      field.input = document.getElementById(field.id);
      field.err = document.getElementById(field.id + '-err');
      field.input.addEventListener('input', function () {
        if (field.kind === 'close') closeEdited = clean(field.input.value) !== '';
        update(false);
      });
      field.input.addEventListener('blur', function () {
        if (field.kind === 'close' && clean(field.input.value) === '') {
          field.input.value = '10';
          closeEdited = false;
        }
        field.revealed = true;
        update(false);
      });
    });

    showBtn.addEventListener('click', onSubmit);
    document.getElementById('calc').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
    });

    function onSubmit() {
      var close = fields[3];
      if (clean(close.input.value) === '') {
        close.input.value = '10';
        closeEdited = false;
      }
      fields.forEach(function (field) { field.revealed = true; });
      var first = update(true);
      if (first) first.focus();
    }

    function update(fromSubmit) {
      var parsed = fields.map(function (field) { return parseField(field.kind, field.input.value); });
      var allOk = parsed.every(function (p) { return p.ok; });
      var firstBad = null;
      parsed.forEach(function (p, i) {
        var field = fields[i];
        var show = !p.ok && (field.revealed || hadResult || fromSubmit);
        if (show) {
          field.revealed = true;
          if (field.err.textContent !== p.error) field.err.textContent = p.error;
          field.input.setAttribute('aria-invalid', 'true');
          field.input.closest('.control').classList.add('bad');
          if (!firstBad) firstBad = field.input;
        } else {
          if (field.err.textContent !== '') field.err.textContent = '';
          field.input.setAttribute('aria-invalid', 'false');
          field.input.closest('.control').classList.remove('bad');
        }
      });
      if (allOk) {
        render(parsed, fromSubmit);
        hadResult = true;
      } else {
        result.hidden = true;
        if (!fromSubmit) {
          clearSummary();
          if (live.textContent !== '') live.textContent = '';
        }
        hadResult = false;
      }
      return firstBad;
    }

    function clearSummary() {
      summaryText = '';
      summary.textContent = '';
      summary.classList.remove('long');
    }

    function render(parsed, fromSubmit) {
      var quotes = parsed[0].value;
      var avg = parsed[1].value;
      var quiet = parsed[2].value;
      var close = parsed[3].value;
      var calc = compute(quotes, avg, quiet, close);
      var quietLabel = formatTenths(calc.quietTenths);
      var jobsLabel = formatTenths(calc.jobsTenths);
      var money = calc.amount == null ? null : formatMoney(calc.amount);
      var nextSummary = money == null ? 'Less than $100 a year' : 'About ' + money + ' a year';

      sub.textContent = money == null
        ? "By these numbers, quiet quotes aren't costing you much. That's good news. No need to fix what isn't broken."
        : 'in work you already quoted and never followed up on.';

      steps.replaceChildren();
      steps.appendChild(li([
        'You send ', el('strong', null, formatCount(quotes)), ' quotes a month. That\'s ',
        el('strong', null, formatCount(calc.year)), ' a year.'
      ]));
      steps.appendChild(li([
        'About ', el('strong', null, quiet + '%'), ' go quiet with no follow-up. That\'s ',
        el('strong', null, quietLabel || 'less than 0.1'), ' quotes.'
      ]));
      steps.appendChild(li([
        'If a follow-up brought back ', el('strong', null, close + '%'), ' of those, that\'s ',
        jobsLabel ? 'about ' : '',
        el('strong', null, jobsLabel || 'less than 0.1'), ' jobs.'
      ]));
      var lastBits = ['At ', el('strong', null, formatMoney(avg)), ' each, that comes to '];
      if (money == null) {
        lastBits.push('less than ');
        lastBits.push(el('strong', null, '$100'));
      } else {
        lastBits.push('about ');
        lastBits.push(el('strong', null, money));
      }
      lastBits.push(' a year.');
      steps.appendChild(li(lastBits));

      var caveat = 'A few honest notes. ';
      caveat += closeEdited
        ? 'The close rate is the number you entered.'
        : 'The 10% close rate is my assumption, not a statistic.';
      caveat += ' Change it if you know yours. This is sales, not profit, so your margin comes off it. And I rounded down. It\'s a rough number to think with, not a promise.';
      caveatEl.textContent = caveat;

      result.hidden = false;
      if (summaryText !== nextSummary) {
        summaryText = nextSummary;
        summary.classList.toggle('long', !!(money && money.length >= 12));
        summary.replaceChildren();
        if (money == null) {
          summary.appendChild(el('strong', null, nextSummary));
        } else {
          summary.appendChild(document.createTextNode('About '));
          summary.appendChild(el('strong', 'money', money));
          summary.appendChild(document.createTextNode(' a year'));
        }
      }
      // Announce the short summary when the inputs change it, not the steps.
      if (!fromSubmit && live.textContent !== nextSummary) live.textContent = nextSummary;
    }

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    function li(parts) {
      var node = document.createElement('li');
      parts.forEach(function (part) {
        if (!part) return;
        node.appendChild(typeof part === 'string' ? document.createTextNode(part) : part);
      });
      return node;
    }
  }
});
