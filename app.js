// ===== HeStrong Word Flip 逻辑 =====

// ---------- 深色模式 ----------
const THEME_KEY = "hsf_theme_v1";
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

themeToggle.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

// ---------- 词表与进度（进度按词表分别保存）----------
function storageKeyFor(listId) {
  return "hsf_mastered_" + listId + "_v2";
}

let currentListId = DEFAULT_LIST_ID;
let mastered = new Set();
let queue = [];

const listSelect = document.getElementById("list-select");

function populateListSelect() {
  listSelect.innerHTML = "";
  for (const id of Object.keys(WORD_LISTS)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = WORD_LISTS[id].name + "（" + WORD_LISTS[id].words.length + " 词）";
    listSelect.appendChild(opt);
  }
  listSelect.value = currentListId;
}

function loadList(id) {
  currentListId = id;
  mastered = new Set(JSON.parse(localStorage.getItem(storageKeyFor(id)) || "[]"));
  startSession();
}

listSelect.addEventListener("change", () => loadList(listSelect.value));

// ---------- 发音（Web Speech API）----------
const speakBtn = document.getElementById("btn-speak");

function speakSupported() {
  return "speechSynthesis" in window;
}

function speakWord(word) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

function updateSpeakState() {
  speakBtn.classList.toggle("speak-disabled", !speakSupported());
}

speakBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // 不要触发卡片翻面
  if (speakSupported() && queue.length) speakWord(queue[0].word);
});

// ---------- 卡片逻辑 ----------
const card = document.getElementById("card");
const wordText = document.getElementById("word-text");
const meaningText = document.getElementById("meaning-text");
const progressText = document.getElementById("progress-text");
const barFill = document.getElementById("bar-fill");
const doneBox = document.getElementById("done");
const doneText = document.getElementById("done-text");
const totalCount = document.getElementById("total-count");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentWords() {
  return WORD_LISTS[currentListId].words;
}

function startSession() {
  queue = shuffle(currentWords().filter(w => !mastered.has(w.word)));
  if (queue.length === 0) {
    showDone();
  } else {
    doneBox.classList.add("hidden");
    card.classList.remove("hidden");
    document.querySelector(".actions").classList.remove("hidden");
    renderCard();
  }
  renderProgress();
}

function renderCard() {
  const item = queue[0];
  card.classList.remove("flipped");
  wordText.textContent = item.word;
  meaningText.textContent = item.meaning;
}

function renderProgress() {
  const total = currentWords().length;
  const done = mastered.size;
  progressText.textContent = `已掌握 ${done} / ${total}，本轮剩 ${queue.length}`;
  barFill.style.width = (total ? (done / total * 100) : 0) + "%";
  totalCount.textContent = `当前词表：${WORD_LISTS[currentListId].name} · 共 ${total} 词`;
}

function markKnown() {
  const item = queue.shift();
  mastered.add(item.word);
  localStorage.setItem(storageKeyFor(currentListId), JSON.stringify([...mastered]));
  next();
}

function markUnknown() {
  const item = queue.shift();
  queue.push(item); // 放回队尾，这轮还会再出现
  next();
}

function next() {
  if (queue.length === 0) {
    showDone();
  } else {
    renderCard();
  }
  renderProgress();
}

function showDone() {
  card.classList.add("hidden");
  document.querySelector(".actions").classList.add("hidden");
  doneBox.classList.remove("hidden");
  doneText.textContent = `你已经掌握了全部 ${mastered.size} 个词！`;
}

// ---------- 事件绑定 ----------
card.addEventListener("click", () => card.classList.toggle("flipped"));
document.getElementById("btn-known").addEventListener("click", markKnown);
document.getElementById("btn-unknown").addEventListener("click", markUnknown);
document.getElementById("btn-restart").addEventListener("click", () => {
  mastered = new Set();
  localStorage.removeItem(storageKeyFor(currentListId));
  startSession();
});

// 键盘快捷键：空格/回车翻面，← 不认识，→ 认识
card.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    card.classList.toggle("flipped");
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    markUnknown();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    markKnown();
  }
});

// ---------- 启动 ----------
initTheme();
updateSpeakState();
populateListSelect();
loadList(currentListId);
