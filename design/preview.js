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

  var LOOK_EMPTY = "I'll show you where I'd look first.";

  function lane() {
    var checked = document.querySelector('input[name="lane"]:checked');
    return LANES[checked ? checked.value : 'trades'];
  }

  function moneyCents(n) {
    var sign = '$';
    return sign + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function moneyWhole(n) {
    var sign = '$';
    return sign + Math.round(n).toLocaleString('en-US');
  }

  function paintMarks(n) {
    var box = document.getElementById('marks');
    var key = document.getElementById('marks-key');
    if (!box) return;
    var count = Math.max(0, Math.round(n) || 0);
    var each = count > 36 ? 10 : 1;
    var show = each === 1 ? count : Math.ceil(count / each);
    box.replaceChildren();
    for (var i = 0; i < show; i++) {
      var dot = document.createElement('span');
      dot.className = 'mark';
      box.appendChild(dot);
    }
    if (key) {
      if (!count) key.textContent = 'Marks appear when you set a number of people.';
      else if (each === 1) key.textContent = 'Each mark is one person on the slider.';
      else key.textContent = 'Each mark stands for 10 people on the slider.';
    }
  }

  function readNum(el) {
    if (!el) return NaN;
    var raw = String(el.value).trim();
    if (raw === '') return NaN;
    var n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }

  function runFormula() {
    var hoursEl = document.getElementById('hours');
    var peopleEl = document.getElementById('people-num');
    var costEl = document.getElementById('cost');
    var weeksEl = document.getElementById('weeks');
    var live = document.getElementById('formula-live');
    var result = document.getElementById('result');
    if (!hoursEl || !peopleEl || !costEl || !weeksEl || !result) return;
    var hours = readNum(hoursEl);
    var people = readNum(peopleEl);
    var cost = readNum(costEl);
    var weeks = readNum(weeksEl);
    var ready = Number.isFinite(hours) && Number.isFinite(people) && Number.isFinite(cost) && Number.isFinite(weeks);
    if (!ready) {
      if (live) live.textContent = '';
      result.textContent = 'Enter hours lost per person per week. The estimate uses only the four numbers on this form.';
      return;
    }
    if (hours < 0.1 || hours > 168 || people < 1 || people > 2000 || cost <= 0 || cost > 10000 || weeks < 1 || weeks > 52) {
      if (live) live.textContent = '';
      result.textContent = 'Hours from 0.1 to 168, people from 1 to 2000, hourly cost above zero and at most 10000, weeks from 1 to 52.';
      return;
    }
    var yearly = hours * people * cost * weeks;
    if (!Number.isFinite(yearly)) {
      if (live) live.textContent = '';
      result.textContent = 'Those numbers are too large to show. Try a smaller entry.';
      return;
    }
    var line = hours + ' × ' + people + ' × ' + moneyCents(cost) + ' × ' + weeks + ' = ' + moneyWhole(yearly);
    if (live) live.textContent = line;
    result.textContent = 'Estimated yearly leak: ' + moneyWhole(yearly) + '. From the numbers on this form.';
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function commitPeople() {
    var num = document.getElementById('people-num');
    var range = document.getElementById('people-range');
    if (!num) return;
    var n = readNum(num);
    if (!Number.isFinite(n)) n = 25;
    n = clamp(Math.round(n), 1, 2000);
    num.value = String(n);
    if (range) range.value = String(Math.min(n, Number(range.max) || 500));
    paintMarks(n);
    runFormula();
  }

  function onPeopleInput() {
    var num = document.getElementById('people-num');
    var range = document.getElementById('people-range');
    var raw = String(num.value).trim();
    if (raw === '') {
      paintMarks(0);
      runFormula();
      return;
    }
    var n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (range && n >= 1) range.value = String(Math.min(Math.round(n), Number(range.max) || 500));
    if (n >= 1 && n <= 2000) paintMarks(Math.round(n));
    runFormula();
  }

  function onRangeInput() {
    var num = document.getElementById('people-num');
    var range = document.getElementById('people-range');
    var n = Math.round(Number(range.value));
    if (!Number.isFinite(n)) return;
    if (num) num.value = String(n);
    paintMarks(n);
    runFormula();
  }

  function clampField(el, min, max) {
    var n = readNum(el);
    if (!Number.isFinite(n)) return;
    el.value = String(clamp(n, min, max));
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

  function selectedIds(list) {
    var selected = [];
    list.querySelectorAll('input:checked').forEach(function (input) {
      selected.push(input.value);
    });
    return selected;
  }

  function paintLook(data, selected) {
    var look = document.getElementById('look-list');
    var empty = document.getElementById('look-empty');
    var weight = document.getElementById('weight-line');
    var hasDrawing = !!document.querySelector('[data-room]');
    document.querySelectorAll('[data-book-follow]').forEach(function (el) {
      el.hidden = selected.length < 1;
    });
    if (look) {
      look.replaceChildren();
      if (selected.length) {
        data.leaks.forEach(function (leak) {
          if (selected.indexOf(leak.id) === -1) return;
          var li = document.createElement('li');
          li.textContent = leak.look;
          look.appendChild(li);
        });
      }
    }
    if (empty) {
      empty.hidden = selected.length > 0;
      empty.textContent = LOOK_EMPTY;
    }
    if (weight) {
      var n = selected.length;
      if (n === 0) weight.textContent = hasDrawing ? 'Nothing marked. The drawing stays quiet.' : 'Nothing marked.';
      else if (n === 1) weight.textContent = 'One leak. It already has a shape. The formula further down measures one leak at a time.';
      else weight.textContent = 'You marked ' + n + ' leaks. I\'d still start with one. This page doesn\'t add them together.';
    }
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
    paintLook(data, []);
  }

  function onLeakChange() {
    var list = document.getElementById('leak-list');
    var data = lane();
    var selected = selectedIds(list);
    paintRooms(data, selected);
    paintLook(data, selected);
  }

  function init() {
    document.querySelectorAll('input[name="lane"]').forEach(function (radio) {
      radio.addEventListener('change', renderLeaks);
    });
    var list = document.getElementById('leak-list');
    if (list) {
      renderLeaks();
      list.addEventListener('change', onLeakChange);
    }
    var range = document.getElementById('people-range');
    var num = document.getElementById('people-num');
    if (range) range.addEventListener('input', onRangeInput);
    if (num) {
      num.addEventListener('input', onPeopleInput);
      num.addEventListener('change', commitPeople);
      num.addEventListener('blur', commitPeople);
    }
    var hours = document.getElementById('hours');
    var cost = document.getElementById('cost');
    var weeks = document.getElementById('weeks');
    if (hours) {
      hours.addEventListener('input', runFormula);
      hours.addEventListener('change', function () { clampField(hours, 0.1, 168); });
    }
    if (cost) {
      cost.addEventListener('input', runFormula);
      cost.addEventListener('change', function () { clampField(cost, 0.01, 10000); });
    }
    if (weeks) {
      weeks.addEventListener('input', runFormula);
      weeks.addEventListener('change', function () { clampField(weeks, 1, 52); });
    }
    if (num) onPeopleInput();
    else runFormula();

    var motion = document.getElementById('motion-toggle');
    if (motion) {
      motion.addEventListener('click', function () {
        var paused = document.body.classList.toggle('motion-paused');
        motion.textContent = paused ? 'Play motion' : 'Pause motion';
        motion.setAttribute('aria-pressed', paused ? 'true' : 'false');
      });
    }

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
