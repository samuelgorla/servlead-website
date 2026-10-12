(function () {
  var QUOTE_MAX = 4000;
  var form = document.getElementById('rescue');
  var quote = document.getElementById('quote');
  var business = document.getElementById('business');
  var customer = document.getElementById('customer');
  var name = document.getElementById('name');
  var honeypot = document.getElementById('f_web');
  var count = document.getElementById('count');
  var writeBtn = document.getElementById('write');
  var formErr = document.getElementById('form-err');
  var out = document.getElementById('out');
  var outTitle = document.getElementById('out-title');
  var checkin = document.getElementById('checkin');
  var closeNote = document.getElementById('close');
  var save = document.getElementById('save');
  var saveEmail = document.getElementById('save-email');
  var saveBtn = document.getElementById('save-btn');
  var saveErr = document.getElementById('save-err');
  var saveWeb = document.getElementById('save-web');
  var saved = document.getElementById('saved');
  var emailed = false;

  var LABELS = {
    contractor: 'Contractor or trades',
    manufacturer: 'Manufacturer or distributor',
    professional: 'Professional services'
  };

  function setCount() {
    var n = quote.value.length;
    count.textContent = n.toLocaleString('en-US') + ' / 4,000';
    count.classList.toggle('over', n > QUOTE_MAX);
  }

  quote.addEventListener('input', setCount);
  setCount();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    write();
  });

  document.getElementById('copy-checkin').addEventListener('click', function () {
    copyFrom(checkin, this, 'Copy the check-in');
  });
  document.getElementById('copy-close').addEventListener('click', function () {
    copyFrom(closeNote, this, 'Copy the close-the-loop note');
  });

  save.addEventListener('submit', function (event) {
    event.preventDefault();
    sendEmail();
  });

  document.getElementById('again').addEventListener('click', function () {
    quote.value = '';
    customer.value = '';
    setCount();
    formErr.textContent = '';
    quote.classList.remove('bad');
    out.hidden = true;
    checkin.textContent = '';
    closeNote.textContent = '';
    quote.focus();
  });

  function write() {
    formErr.textContent = '';
    quote.classList.remove('bad');
    business.classList.remove('bad');
    name.classList.remove('bad');
    var text = quote.value.trim();
    if (!text) {
      fail(quote, 'Paste the quote, proposal, or engagement letter.');
      return;
    }
    if (text.length > QUOTE_MAX) {
      fail(quote, 'That is over 4,000 characters. Cut it down and try again.');
      return;
    }
    if (text.length < 40) {
      fail(quote, 'Paste more of it. A few words is not enough to write an honest follow-up.');
      return;
    }
    if (!LABELS[business.value]) {
      fail(business, 'Pick the kind of business. It only sets the tone.');
      return;
    }
    var first = name.value.trim();
    if (first.length > 40 || (first && first.split(/\s+/).length > 3)) {
      fail(name, 'First name only, please.');
      return;
    }

    writeBtn.disabled = true;
    writeBtn.textContent = 'Writing…';
    fetch('/api/quote-rescue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        quote: text,
        business_type: business.value,
        customer: customer.value.trim(),
        name: first,
        f_web: honeypot.value
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data || {} };
      }).catch(function () {
        return { ok: false, status: res.status, data: {} };
      });
    }).then(function (result) {
      var data = result.data;
      if (data.checkin && data.close) {
        showDrafts(data.checkin, data.close);
        return;
      }
      formErr.textContent = data.error || 'The writer didn\'t answer. Nothing was saved. Try again in a minute.';
    }).catch(function () {
      formErr.textContent = 'The writer didn\'t answer. Nothing was saved. Try again in a minute.';
    }).then(function () {
      writeBtn.disabled = false;
      writeBtn.textContent = 'Write the two follow-ups';
    });
  }

  function showDrafts(checkinText, closeText) {
    checkin.textContent = checkinText;
    closeNote.textContent = closeText;
    document.getElementById('status').textContent = 'Two follow-ups are ready. You send them yourself.';
    document.getElementById('copy-checkin').textContent = 'Copy';
    document.getElementById('copy-close').textContent = 'Copy';
    out.hidden = false;
    if (!emailed) {
      save.hidden = false;
      saved.hidden = true;
      saveErr.textContent = '';
    }
    outTitle.focus();
  }

  function fail(field, message) {
    field.classList.add('bad');
    formErr.textContent = message;
    field.focus();
  }

  function copyFrom(node, button, label) {
    var text = node.textContent || '';
    copyText(text).then(function () {
      button.textContent = 'Copied';
      window.setTimeout(function () {
        if (button.textContent === 'Copied') button.textContent = 'Copy';
      }, 2000);
    }).catch(function () {
      button.textContent = 'Copy failed';
      window.setTimeout(function () { button.textContent = 'Copy'; }, 2000);
    });
    button.setAttribute('aria-label', label);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(area);
        ok ? resolve() : reject(new Error('copy'));
      } catch (err) {
        document.body.removeChild(area);
        reject(err);
      }
    });
  }

  function sendEmail() {
    if (emailed) return;
    saveErr.textContent = '';
    var email = saveEmail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      saveErr.textContent = 'That email doesn\'t look right.';
      saveEmail.focus();
      return;
    }
    var payload = {
      email: email,
      name: name.value.trim(),
      business_type: LABELS[business.value] || business.value,
      source: 'quote-rescue',
      f_web: saveWeb.value
    };
    saveBtn.disabled = true;
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok && data && data.ok !== false, data: data };
      });
    }).then(function (result) {
      if (!result.ok) {
        saveErr.textContent = 'That didn\'t send. Try again, or use the subscribe link in the footer.';
        saveBtn.disabled = false;
        return;
      }
      emailed = true;
      saveEmail.closest('.email-row').hidden = true;
      save.querySelector('label').hidden = true;
      save.querySelector('.help').hidden = true;
      saved.hidden = false;
    }).catch(function () {
      saveErr.textContent = 'That didn\'t send. Try again, or use the subscribe link in the footer.';
      saveBtn.disabled = false;
    });
  }
})();
