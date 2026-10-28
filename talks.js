(function () {
  'use strict';

  function currentDate() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = type => parts.find(part => part.type === type).value;
    return value('year') + '-' + value('month') + '-' + value('day');
  }

  function dateLabel(item) {
    if (item.dateLabel) return item.dateLabel;
    if (!item.date) return 'Short talk';
    if (item.date.length === 4) return item.date;
    const date = new Date(item.date + (item.date.length === 7 ? '-01' : '') + 'T12:00:00Z');
    const options = { month: 'long', year: 'numeric', timeZone: 'UTC' };
    if (item.date.length === 10) options.day = 'numeric';
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(href, text) {
    const node = element('a', '', text);
    node.href = href;
    return node;
  }

  function talkEntry(item, scheduled, headingLevel) {
    const row = element('li', 'talk-entry');
    const date = element('div', 'talk-date');
    if (item.date) {
      const time = element('time', '', dateLabel(item));
      time.dateTime = item.date;
      date.append(time);
    } else date.append(document.createTextNode('Short talk'));
    if (scheduled) date.append(element('span', 'talk-status', 'Scheduled'));
    const details = element('div', 'talk-details');
    details.append(element(headingLevel || 'h3', '', item.title));
    details.append(element('p', '', item.venue));
    if (item.note) details.append(element('p', '', item.note));
    const links = element('div', 'talk-links');
    if (item.slides) links.append(link(item.slides, 'Slides (PDF)'));
    if (item.eventUrl) links.append(link(item.eventUrl, 'Event page'));
    if (links.childElementCount) details.append(links);
    row.append(date, details);
    return row;
  }

  function renderArchive(data, today) {
    const upcoming = document.getElementById('talks-upcoming-list');
    if (!upcoming) return;
    const scheduled = data.talks.filter(t => (t.endDate || t.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const past = data.talks.filter(t => (t.endDate || t.date) < today)
      .sort((a, b) => b.date.localeCompare(a.date));
    upcoming.replaceChildren(...scheduled.map(t => talkEntry(t, true, 'h3')));
    document.getElementById('no-upcoming-talks').hidden = scheduled.length > 0;
    const archive = document.getElementById('talks-past-list');
    archive.replaceChildren();
    for (const year of [...new Set(past.map(t => t.date.slice(0, 4)))]) {
      archive.append(element('h3', 'talk-year', year));
      const list = element('ol', 'talk-list');
      list.append(...past.filter(t => t.date.startsWith(year)).map(t => talkEntry(t, false, 'h4')));
      archive.append(list);
    }
    const short = document.getElementById('short-talks-list');
    short.replaceChildren(...data.shortTalks.map(t => talkEntry(t, false, 'h3')));
    const posters = document.getElementById('posters-list');
    posters.replaceChildren(...data.posters.slice().sort((a, b) => b.date.localeCompare(a.date))
      .map(t => talkEntry(t, false, 'h3')));
    const materials = document.getElementById('materials-list');
    materials.replaceChildren(...data.materials.map(item => {
      const row = element('li');
      row.append(link(item.url, item.title + ' · ' + item.kind + ' (PDF)'));
      return row;
    }));
  }

  function renderHome(data, today) {
    const container = document.getElementById('home-upcoming-list');
    if (!container) return;
    const scheduled = data.talks.filter(t => (t.endDate || t.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    container.replaceChildren(...scheduled.map(item => {
      const card = element('div', 'event-card');
      const date = element('div', 'event-date');
      date.append(element('span', 'event-day', String(Number(item.date.slice(8, 10)))));
      const month = new Intl.DateTimeFormat('en-GB', {month: 'short', timeZone: 'UTC'})
        .format(new Date(item.date + 'T12:00:00Z')).toUpperCase();
      date.append(element('span', 'event-month', month));
      date.append(element('span', 'event-year', item.date.slice(0, 4)));
      const info = element('div', 'event-info');
      info.append(element('h3', '', item.title));
      info.append(element('p', '', item.venue));
      if (item.note) info.append(element('p', '', item.note));
      if (item.eventUrl) info.append(link(item.eventUrl, 'Event page'));
      if (item.slides) info.append(link(item.slides, 'Slides (PDF)'));
      card.append(date, info);
      return card;
    }));
    document.getElementById('home-no-upcoming').hidden = scheduled.length > 0;
  }

  fetch('talks-data.json').then(response => {
    if (!response.ok) throw new Error('Talk data unavailable');
    return response.json();
  }).then(data => {
    const today = currentDate();
    renderArchive(data, today);
    renderHome(data, today);
  }).catch(() => {
    // The pre-rendered HTML keeps the lists and links available offline.
  });
}());
