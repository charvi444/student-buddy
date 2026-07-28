// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// ── Motivational Quote ─────────────────────────────────────────────────────
// quotable.io shut down in 2023 — replaced with working alternatives
async function loadQuote() {
  const quoteEl  = document.getElementById('quoteText');
  const stripEl  = document.getElementById('quoteStrip');

  const fallback = [
    '"The secret of getting ahead is getting started." — Mark Twain',
    '"An investment in knowledge pays the best interest." — Benjamin Franklin',
    '"The beautiful thing about learning is nobody can take it away from you." — B.B. King',
    '"Push yourself, because no one else is going to do it for you."',
    '"Success is the sum of small efforts repeated day in and day out." — Robert Collier',
    '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson',
    '"Education is the passport to the future." — Malcolm X',
    '"The expert in anything was once a beginner." — Helen Hayes',
    '"Believe you can and you\'re halfway there." — Theodore Roosevelt',
  ];

  // Try API #1: quoteslate.it (free, no auth, CORS-enabled)
  try {
    const res = await fetch('https://quoteslate.vercel.app/api/quotes/random', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('quoteslate failed');
    const data = await res.json();
    if (data.quote && data.author) {
      quoteEl.textContent = `"${data.quote}" — ${data.author}`;
      stripEl.classList.remove('loading');
      return;
    }
    throw new Error('bad response shape');
  } catch (_) {}

  // Try API #2: zenquotes.io proxy (free, public)
  try {
    const res = await fetch('https://zenquotes.io/api/random', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('zenquotes failed');
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : data;
    if (q && q.q && q.a) {
      quoteEl.textContent = `"${q.q}" — ${q.a}`;
      stripEl.classList.remove('loading');
      return;
    }
    throw new Error('bad response shape');
  } catch (_) {}

  // Fallback: curated local quotes
  quoteEl.textContent = fallback[Math.floor(Math.random() * fallback.length)];
  stripEl.classList.remove('loading');
}
loadQuote();

// ── TODOS ──────────────────────────────────────────────────────────────────
const todoInput  = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList   = document.getElementById('todoList');
const todoEmpty  = document.getElementById('todoEmpty');

function saveTodos(todos) {
  chrome.storage.local.set({ todos });
}

function renderTodos(todos) {
  todoList.innerHTML = '';
  todoEmpty.style.display = todos.length === 0 ? 'block' : 'none';

  todos.forEach((todo, idx) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (todo.done ? ' done' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-check';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () => {
      todos[idx].done = checkbox.checked;
      li.classList.toggle('done', checkbox.checked);
      saveTodos(todos);
    });

    const label = document.createElement('span');
    label.className = 'task-label';
    label.textContent = todo.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-del';
    delBtn.textContent = '×';
    delBtn.title = 'Delete task';
    delBtn.addEventListener('click', () => {
      todos.splice(idx, 1);
      renderTodos(todos);
      saveTodos(todos);
    });

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(delBtn);
    todoList.appendChild(li);
  });
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  chrome.storage.local.get(['todos'], result => {
    const todos = result.todos || [];
    todos.unshift({ text, done: false });
    renderTodos(todos);
    saveTodos(todos);
    todoInput.value = '';
    todoInput.focus();
  });
}

addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

chrome.storage.local.get(['todos'], result => {
  renderTodos(result.todos || []);
});

// ── NOTES ──────────────────────────────────────────────────────────────────
const noteArea    = document.getElementById('noteArea');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const charCount   = document.getElementById('charCount');
const saveStatus  = document.getElementById('saveStatus');
const MAX_NOTE    = 2000;

chrome.storage.local.get(['note'], result => {
  if (result.note) {
    noteArea.value = result.note;
    charCount.textContent = `${result.note.length} / ${MAX_NOTE}`;
  }
});

noteArea.addEventListener('input', () => {
  const len = noteArea.value.length;
  if (len > MAX_NOTE) {
    noteArea.value = noteArea.value.slice(0, MAX_NOTE);
  }
  charCount.textContent = `${Math.min(len, MAX_NOTE)} / ${MAX_NOTE}`;
  saveStatus.textContent = '';
});

saveNoteBtn.addEventListener('click', () => {
  chrome.storage.local.set({ note: noteArea.value }, () => {
    saveStatus.textContent = '✓ Saved';
    setTimeout(() => { saveStatus.textContent = ''; }, 1800);
  });
});

// ── QUICK LINKS ────────────────────────────────────────────────────────────
const linkLabel  = document.getElementById('linkLabel');
const linkUrl    = document.getElementById('linkUrl');
const addLinkBtn = document.getElementById('addLinkBtn');
const linkList   = document.getElementById('linkList');
const linkEmpty  = document.getElementById('linkEmpty');

function saveLinks(links) {
  chrome.storage.local.set({ links });
}

function renderLinks(links) {
  linkList.innerHTML = '';
  linkEmpty.style.display = links.length === 0 ? 'block' : 'none';

  links.forEach((link, idx) => {
    const li = document.createElement('li');
    li.className = 'link-item';

    const favicon = document.createElement('img');
    favicon.className = 'link-favicon';
    try {
      const domain = new URL(link.url).origin;
      favicon.src = `${domain}/favicon.ico`;
    } catch (_) {
      favicon.src = '';
    }
    favicon.onerror = () => { favicon.style.display = 'none'; };

    const anchor = document.createElement('a');
    anchor.className = 'link-anchor';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label || link.url;
    anchor.title = link.url;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-del';
    delBtn.textContent = '×';
    delBtn.title = 'Remove shortcut';
    delBtn.addEventListener('click', () => {
      links.splice(idx, 1);
      renderLinks(links);
      saveLinks(links);
    });

    li.appendChild(favicon);
    li.appendChild(anchor);
    li.appendChild(delBtn);
    linkList.appendChild(li);
  });
}

function addLink() {
  const label = linkLabel.value.trim();
  let url = linkUrl.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  chrome.storage.local.get(['links'], result => {
    const links = result.links || [];
    links.unshift({ label: label || url, url });
    renderLinks(links);
    saveLinks(links);
    linkLabel.value = '';
    linkUrl.value = '';
  });
}

addLinkBtn.addEventListener('click', addLink);
linkUrl.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

chrome.storage.local.get(['links'], result => {
  renderLinks(result.links || []);
});
