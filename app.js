// ===== HeStrong Word Flip · 闯关背单词 =====

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

// ---------- 关卡配置 ----------
// 词库暂无逐词词频数据，这里“按词频/难度”做简化处理：
// 把“高频核心300”按数组顺序粗略切成 5 关（词量相近、难度递进）。
// 想做到更精确的词频难度，可先按真实词频重排 WORD_LISTS 里的词序，再调 LEVEL_NAMES 即可。
const LEVEL_NAMES = ["热身", "进阶", "提高", "高阶", "挑战"];

const LEVELS = (function buildLevels() {
  const pool = WORD_LISTS[DEFAULT_LIST_ID].words;
  const per = Math.ceil(pool.length / LEVEL_NAMES.length);
  return LEVEL_NAMES.map((name, i) => ({
    id: i + 1,
    name: `第 ${i + 1} 关 · ${name}`,
    words: pool.slice(i * per, (i + 1) * per)
  }));
})();

// ---------- 闯关进度 ----------
const PROGRESS_KEY = "hsf_level_progress_v1";
const PASS_RATE = 0.9; // 正确率超过 90% 即通关

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (p && typeof p.unlocked === "number") {
      p.unlocked = Math.min(Math.max(1, p.unlocked), LEVELS.length);
      p.best = p.best || {};
      return p;
    }
  } catch (e) { /* 损坏则重置 */ }
  return { unlocked: 1, best: {} };
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

let progress = loadProgress();

// ---------- 发音 ----------
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

// ---------- 视图切换 ----------
const levelView = document.getElementById("level-view");
const playView = document.getElementById("play-view");
const resultView = document.getElementById("result-view");

function showView(view) {
  levelView.classList.toggle("hidden", view !== "level");
  playView.classList.toggle("hidden", view !== "play");
  resultView.classList.toggle("hidden", view !== "result");
}

// ---------- 闯关会话状态 ----------
let curLevel = null;          // 当前关卡对象 { id, name, words }
let queue = [];               // 本关待背的词（乱序）
let firstAnswered = new Set();// 已做过“首次作答”的词
let correctFirst = 0;         // 首次作答即“认识”的词数

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- 关卡列表 ----------
const levelList = document.getElementById("level-list");
const levelOverview = document.getElementById("level-overview");
const totalCount = document.getElementById("total-count");

function isCleared(levelId) {
  return (progress.best[levelId] || 0) > PASS_RATE;
}

function renderLevelList() {
  const total = WORD_LISTS[DEFAULT_LIST_ID].words.length;
  levelOverview.textContent = `已解锁到第 ${progress.unlocked} 关 · 词库共 ${total} 词`;
  totalCount.textContent = `HeStrong Word Flip · 共 ${total} 词`;
  levelList.innerHTML = "";

  LEVELS.forEach((lv) => {
    const locked = lv.id > progress.unlocked;
    const cleared = isCleared(lv.id);
    const el = document.createElement("button");
    el.className = "level-card" + (locked ? " locked" : "") + (cleared ? " cleared" : "");
    el.disabled = locked;
    const status = locked
      ? "🔒 未解锁"
      : (cleared ? `✅ 已通关 ${Math.round((progress.best[lv.id] || 0) * 100)}%` : "▶ 可挑战");
    el.innerHTML =
      `<div class="level-card-top"><span class="level-no">${lv.id}</span>` +
      `<span class="level-name">${lv.name}</span></div>` +
      `<div class="level-meta">${lv.words.length} 词 · ${status}</div>`;
    if (!locked) el.addEventListener("click", () => startLevel(lv));
    levelList.appendChild(el);
  });
}

// ---------- 闯关 ----------
const card = document.getElementById("card");
const wordText = document.getElementById("word-text");
const meaningText = document.getElementById("meaning-text");
const playProgress = document.getElementById("play-progress");
const barFill = document.getElementById("bar-fill");
const levelBadge = document.getElementById("level-badge");

function startLevel(lv) {
  curLevel = lv;
  queue = shuffle(lv.words);
  firstAnswered = new Set();
  correctFirst = 0;
  levelBadge.textContent = `${lv.name} · ${lv.words.length} 词`;
  showView("play");
  renderCard();
  renderPlayProgress();
}

function renderCard() {
  const item = queue[0];
  card.classList.remove("flipped");
  wordText.textContent = item.word;
  meaningText.textContent = item.meaning;
}

function renderPlayProgress() {
  const total = curLevel.words.length;
  const answered = firstAnswered.size;
  const rate = answered ? Math.round((correctFirst / answered) * 100) : 0;
  playProgress.textContent = `本轮 ${answered} / ${total} 词 · 首答正确率 ${rate}%（>90% 通关）`;
  barFill.style.width = (total ? (answered / total * 100) : 0) + "%";
}

function markKnown() {
  const item = queue.shift();
  if (!firstAnswered.has(item.word)) {
    firstAnswered.add(item.word);
    correctFirst++;
  }
  next();
}

function markUnknown() {
  const item = queue.shift();
  if (!firstAnswered.has(item.word)) {
    firstAnswered.add(item.word);
  }
  queue.push(item); // 本轮还会再出现，但不影响首答正确率
  next();
}

function next() {
  if (queue.length === 0) {
    finishLevel();
  } else {
    renderCard();
  }
  renderPlayProgress();
}

// ---------- 通关判定 ----------
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");

function finishLevel() {
  const total = curLevel.words.length;
  const rate = correctFirst / total;
  const passed = rate > PASS_RATE;
  const pct = Math.round(rate * 100);

  if (passed) {
    progress.best[curLevel.id] = Math.max(progress.best[curLevel.id] || 0, rate);
    if (curLevel.id < LEVELS.length) {
      progress.unlocked = Math.max(progress.unlocked, curLevel.id + 1);
    }
    saveProgress();
    resultTitle.textContent = "🎉 通关成功！";
    resultText.textContent = `${curLevel.name} 首答正确率 ${pct}%，下一关已解锁。`;
  } else {
    resultTitle.textContent = "💪 还差一点";
    resultText.textContent = `${curLevel.name} 首答正确率 ${pct}%，未达 90%，再挑战一次吧。`;
  }

  const nextBtn = document.getElementById("btn-next");
  if (passed && curLevel.id < LEVELS.length) {
    nextBtn.textContent = "下一关";
    nextBtn.onclick = () => startLevel(LEVELS[curLevel.id]); // 下一关下标 = 当前 id
  } else {
    nextBtn.textContent = "返回关卡列表";
    nextBtn.onclick = () => { showView("level"); renderLevelList(); };
  }
  document.getElementById("btn-retry").onclick = () => startLevel(curLevel);

  showView("result");
}

// ---------- 事件绑定 ----------
document.getElementById("btn-back").addEventListener("click", () => { showView("level"); renderLevelList(); });
document.getElementById("btn-known").addEventListener("click", markKnown);
document.getElementById("btn-unknown").addEventListener("click", markUnknown);
speakBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (speakSupported() && queue.length) speakWord(queue[0].word);
});

card.addEventListener("click", () => card.classList.toggle("flipped"));
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
showView("level");
renderLevelList();
