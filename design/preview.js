/* Shared behavior for the three homepage directions.
   No dollar literals in this file. Money strings are built at runtime. */
(function () {
  var LANES = {
    trades: {
      label: 'Trades and contractors',
      note: 'Crews, bids, and more than one site. The work still routes through the owner.',
      rooms: { get: 'Bid room', do: 'The sites', paid: 'Get paid', back: 'The office', you: 'You' },
      leaks: [
        { id: 'quotes', room: 'get', name: 'Quotes going quiet', feel: 'The estimate leaves, and the silence stays.', look: 'The quotes that went out and never got a second touch.' },
        { id: 'head', room: 'you', name: 'Bids that live in your head', feel: 'The next bid still starts with you.', look: 'Whether someone else on the team can build the bid without calling you.' },
        { id: 'follow', room: 'get', name: 'Follow-ups', feel: 'The second touch waits until you remember it.', look: 'Who follows up on a quiet quote when you are in the field.' },
        { id: 'calls', room: 'back', name: 'Missed calls', feel: 'The phone rings while the crew is out.', look: 'What happens to a call nobody takes.' },
        { id: 'schedule', room: 'do', name: 'Scheduling', feel: 'The week gets rebuilt in texts, across sites.', look: 'How the crew week is set, and how often it is redone.' }
      ]
    },
    professional: {
      label: 'Professional services',
      note: 'CPA firms, law firms, insurance agencies, and agencies. Intake and follow-up still sit with one partner.',
      rooms: { get: 'Proposals', do: 'The work', paid: 'Getting paid', back: 'The desk', you: 'The partner' },
      leaks: [
        { id: 'intake', room: 'back', name: 'Intake paperwork', feel: 'A new client’s facts get typed more than once.', look: 'The paperwork a new client fills out, and who retypes it.' },
        { id: 'quotes', room: 'get', name: 'Proposals going quiet', feel: 'The proposal leaves, and the silence stays.', look: 'Proposals and engagement letters that go quiet.' },
        { id: 'follow', room: 'you', name: 'Follow-ups', feel: 'The next touch lives in one partner’s head.', look: 'The follow-up that lives in one partner’s head.' },
        { id: 'calls', room: 'back', name: 'Missed calls', feel: 'A call reaches the desk and then stalls.', look: 'Calls that reach the desk and then stall.' },
        { id: 'schedule', room: 'do', name: 'Scheduling', feel: 'Meetings get booked, moved, and chased by hand.', look: 'How meetings get booked, moved, and chased.' }
      ]
    },
    healthcare: {
      label: 'Healthcare practices',
      note: 'Dental, PT, chiropractic, and counseling. I only touch scheduling, the paperwork when someone new comes in, and billing follow-up. Never clinical work or patient records.',
      rooms: { get: 'The book', do: 'The visit', paid: 'Billing follow-up', back: 'The front desk', you: 'You' },
      leaks: [
        { id: 'calls', room: 'back', name: 'Missed calls', feel: 'The phone rings through and never becomes a visit.', look: 'Calls that ring through and never become a visit.' },
        { id: 'schedule', room: 'get', name: 'Scheduling', feel: 'Holes open in the book and wait on someone to notice.', look: 'How the book gets filled, and how holes get filled again.' },
        { id: 'intake', room: 'back', name: 'Intake paperwork', feel: 'The paperwork for someone new gets entered twice.', look: 'The paperwork when someone new comes in, and who re-enters it.' },
        { id: 'noshow', room: 'do', name: 'No-show follow-up', feel: 'Someone books and does not arrive, and the follow-up waits.', look: 'People who book and do not arrive, and whether anyone follows up.' },
        { id: 'billing', room: 'paid', name: 'Billing follow-up', feel: 'Billing follow-up waits on you. Not the chart.', look: 'Billing follow-up that waits on you. Not the clinical chart.' }
      ]
    }
  };

  function lane() {
    var checked = document.querySelector('input[name="lane"]:checked');
    return LANES[checked ? checked.value : 'trades'];
  }

  function moneyCents(n) {
    var sign = '$';
    return sign + (Math.round(n * 100) / 100).toFixed(2);
  }

  function moneyWhole(n) {
    var sign = '$';
    return sign + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function paintMarks(n) {
    var box = document.getElementById('marks');
    if (!box) return;
    var count = Math.max(0, Math.round(n) || 0);
    var show = Math.min(count, 36);
    box.replaceChildren();
    for (var i = 0; i < show; i++) {
      var dot = document.createElement('span');
      dot.className = 'mark';
      box.appendChild(dot);
    }
  }

  function runFormula() {
    var hoursEl = document.getElementById('hours');
    var peopleEl = document.getElementById('people-num');
    var costEl = document.getElementById('cost');
    var weeksEl = document.getElementById('weeks');
    var live = document.getElementById('formula-live');
    var result = document.getElementById('result');
    if (!hoursEl || !peopleEl || !costEl || !weeksEl || !result) return;
    var hours = parseFloat(hoursEl.value);
    var people = parseFloat(peopleEl.value);
    var cost = parseFloat(costEl.value);
    var weeks = parseFloat(weeksEl.value);
    var ready = hours > 0 && people > 0 && cost > 0 && weeks > 0;
    if (!ready) {
      if (live) live.textContent = 'hours × people × cost × weeks = estimated yearly leak';
      result.textContent = 'Enter hours lost per person per week. The estimate uses only the four numbers on this form.';
      return;
    }
    var yearly = hours * people * cost * weeks;
    var line = hours + ' × ' + people + ' × ' + moneyCents(cost) + ' × ' + weeks + ' = ' + moneyWhole(yearly);
    if (live) live.textContent = line;
    result.textContent = 'Estimated yearly leak: ' + moneyWhole(yearly) + '. From the numbers on this form.';
  }

  function setPeople(raw, fromRange) {
    var n = Math.round(Number(raw));
    if (!isFinite(n) || n < 1) n = 1;
    if (n > 2000) n = 2000;
    var num = document.getElementById('people-num');
    var range = document.getElementById('people-range');
    if (num) num.value = String(n);
    if (range) range.value = String(Math.min(n, Number(range.max) || 500));
    if (fromRange && range) {
      n = Number(range.value);
      if (num) num.value = String(n);
    }
    paintMarks(n);
    runFormula();
  }

  function paintRooms(data, selected) {
    var roomsOn = {};
    data.leaks.forEach(function (leak) {
      if (selected.indexOf(leak.id) !== -1) roomsOn[leak.room] = true;
    });
    document.querySelectorAll('[data-room]').forEach(function (room) {
      var id = room.getAttribute('data-room');
      if (id === 'clinical') return;
      room.classList.toggle('lit', !!roomsOn[id]);
    });
    Object.keys(data.rooms).forEach(function (key) {
      document.querySelectorAll('[data-room-label="' + key + '"]').forEach(function (el) {
        el.textContent = data.rooms[key];
      });
    });
    var clinical = document.querySelector('[data-room="clinical"]');
    if (clinical) clinical.hidden = data !== LANES.healthcare;
  }

  function renderLeaks() {
    var list = document.getElementById('leak-list');
    if (!list) return;
    var data = lane();
    var note = document.getElementById('lane-note');
    if (note) note.textContent = data.note;
    list.replaceChildren();
    data.leaks.forEach(function (leak) {
      var label = document.createElement('label');
      label.className = 'leak';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.value = leak.id;
      var name = document.createElement('span');
      name.className = 'leak-name';
      name.textContent = leak.name;
      var feel = document.createElement('span');
      feel.className = 'leak-feel';
      feel.textContent = leak.feel;
      var rule = document.createElement('span');
      rule.className = 'rule';
      rule.setAttribute('aria-hidden', 'true');
      label.appendChild(input);
      label.appendChild(rule);
      label.appendChild(name);
      label.appendChild(feel);
      list.appendChild(label);
    });
    paintRooms(data, []);
    var look = document.getElementById('look-list');
    if (look) {
      look.replaceChildren();
      var li = document.createElement('li');
      li.textContent = 'Mark a leak and I will name where I would look first.';
      look.appendChild(li);
    }
    var weight = document.getElementById('weight-line');
    if (weight) weight.textContent = 'Nothing marked. The drawing stays quiet.';
  }

  function onLeakChange() {
    var list = document.getElementById('leak-list');
    var data = lane();
    var selected = [];
    list.querySelectorAll('input:checked').forEach(function (input) {
      selected.push(input.value);
    });
    paintRooms(data, selected);
    var look = document.getElementById('look-list');
    if (look) {
      look.replaceChildren();
      if (!selected.length) {
        var empty = document.createElement('li');
        empty.textContent = 'Mark a leak and I will name where I would look first.';
        look.appendChild(empty);
      } else {
        data.leaks.forEach(function (leak) {
          if (selected.indexOf(leak.id) === -1) return;
          var li = document.createElement('li');
          li.textContent = leak.look;
          look.appendChild(li);
        });
      }
    }
    var weight = document.getElementById('weight-line');
    if (weight) {
      var n = selected.length;
      if (n === 0) weight.textContent = 'Nothing marked. The drawing stays quiet.';
      else if (n === 1) weight.textContent = 'One leak. It already has a shape. The formula further down measures one leak at a time.';
      else weight.textContent = 'You marked ' + n + ' leaks. I would still start with one. This page does not add them together.';
    }
  }

  function init() {
    var radios = document.querySelectorAll('input[name="lane"]');
    radios.forEach(function (radio) {
      radio.addEventListener('change', renderLeaks);
    });
    var list = document.getElementById('leak-list');
    if (list) {
      renderLeaks();
      list.addEventListener('change', onLeakChange);
    }
    var range = document.getElementById('people-range');
    var num = document.getElementById('people-num');
    if (range) {
      range.addEventListener('input', function () { setPeople(range.value, true); });
    }
    if (num) {
      num.addEventListener('input', function () { setPeople(num.value, false); });
    }
    ['hours', 'cost', 'weeks'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', runFormula);
    });
    if (num) setPeople(num.value, false);
    else runFormula();

    var frames = document.querySelectorAll('[data-time]');
    var code = document.getElementById('timecode');
    if (code && frames.length && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) code.textContent = entry.target.getAttribute('data-time');
        });
      }, { rootMargin: '-40% 0px -45% 0px' });
      frames.forEach(function (frame) { obs.observe(frame); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
