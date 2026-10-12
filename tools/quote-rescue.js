(function () {
  var MAX = 4000;
  var form = document.getElementById('writer');
  var quote = document.getElementById('quote');
  var count = document.getElementById('quote-count');
  var error = document.getElementById('form-error');
  var button = document.getElementById('write');
  var status = document.getElementById('status');
  var result = document.getElementById('result');
  var checkin = document.getElementById('checkin');
  var closeNote = document.getElementById('close');
  var emailForm = document.getElementById('email-form');
  var emailStatus = document.getElementById('email-status');
  var busy = false;

  function setError(message) {
    error.textContent = message || '';
  }

  function setCount() {
    var n = quote.value.length;
    count.textContent = n.toLocaleString('en-US') + ' / 4,000';
    count.classList.toggle('full', n >= MAX);
  }

  quote.addEventListener('input', setCount);
  setCount();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    var text = quote.value.trim();
    var business = document.getElementById('business').value;
    if (!business) {
      setError('Pick the kind of business, then try again.');
      document.getElementById('business').focus();
      return;
    }
    if (!text) {
      setError('Paste the quote, proposal, or engagement letter first.');
      quote.focus();
      return;
    }
    if (text.length < 40) {
      setError('That\'s too short to be a quote. Paste the one that went quiet.');
      quote.focus();
      return;
    }
    if (text.length > MAX) {
      setError('That\'s longer than this page can take. Paste one quote, up to about 4,000 characters.');
      quote.focus();
      return;
    }
    var payload = {
      quote: text,
      businessType: business,
      customer: document.getElementById('customer').value.trim(),
      name: document.getElementById('name').value.trim(),
      website: document.getElementById('website').value
    };
    busy = true;
    button.disabled = true;
    button.textContent = 'Writing them…';
    status.textContent = 'Writing the two follow-ups.';
    fetch('/api/quote-rescue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, data: data };
      });
    }).then(function (out) {
      if (!out.ok || !out.data.checkin || !out.data.close) {
        setError(out.data.error || 'The drafts didn\'t come back. Try once more.');
        status.textContent = '';
        return;
      }
      checkin.textContent = out.data.checkin;
      closeNote.textContent = out.data.close;
      result.hidden = false;
      status.textContent = 'Two drafts are ready. You send them.';
      emailStatus.textContent = '';
      var fields = document.getElementById('email-note');
      fields.hidden = false;
      emailForm.querySelector('button').disabled = false;
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      result.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }).catch(function () {
      setError('The drafts didn\'t come back. Check your connection and try once more.');
      status.textContent = '';
    }).then(function () {
      busy = false;
      button.disabled = false;
      button.textContent = 'Write the two follow-ups';
    });
  });

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-copy');
      var text = document.getElementById(id).textContent;
      var done = function () {
        var original = btn.textContent;
        btn.textContent = 'Copied';
        status.textContent = 'Copied.';
        window.setTimeout(function () {
          btn.textContent = original;
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
      } else {
        fallback(text, done);
      }
    });
  });

  function fallback(text, done) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '0';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(area);
    done();
  }

  emailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    emailStatus.textContent = '';
    var email = document.getElementById('email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailStatus.textContent = 'Check the email address and try again.';
      document.getElementById('email').focus();
      return;
    }
    var labels = {
      trades: 'Contractor / trades',
      manufacturer: 'Manufacturer / distributor',
      professional: 'Professional services'
    };
    var payload = {
      email: email,
      name: document.getElementById('name').value.trim(),
      businessType: labels[document.getElementById('business').value] || '',
      source: 'quote-rescue'
    };
    var hp = document.getElementById('email-website').value;
    if (hp) payload.website = hp;
    var send = emailForm.querySelector('button');
    send.disabled = true;
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('no');
      emailStatus.textContent = 'Sent. Sam will email you tips. Copy the drafts above before you go. The quote is not stored, and it is not in that note.';
      emailForm.querySelector('.email-fields').hidden = true;
    }).catch(function () {
      emailStatus.textContent = 'That didn\'t send. You can email info@servleadsolutions.com instead.';
      send.disabled = false;
    });
  });
})();
