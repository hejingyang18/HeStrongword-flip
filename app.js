// ===== HeStrong Word Flip 逻辑 =====
const STORAGE_KEY = "hsf_mastered_v1";

let mastered = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
let queue = [];

const card = document.getElementById("card");
const wordText = document.getElementById("word-text");
const meaningText = document.getElementById("meaning-text");
const progressText = document.getElementById("progress-text");
const barFill = document.getElementById("bar-fill");
const doneBox = document.getElementById("done");
const doneText = document.getElementById("done-text");
const totalCount = document.getElementById("total-count");

document.getElementById("total-count").textContent = `词库共 ${WORDS.length} 词`;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSession() {
  queue = shuffle(WORDS.filter(w => !mastered.has(w.word)));
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
  const total = WORDS.length;
  const done = mastered.size;
  progressText.textContent = `已掌握 ${done} / ${total}，本轮剩 ${queue.length}`;
  barFill.style.width = (done / total * 100) + "%";
}

function markKnown() {
  const item = queue.shift();
  mastered.add(item.word);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...mastered]));
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

// 事件绑定
card.addEventListener("click", () => card.classList.toggle("flipped"));
document.getElementById("btn-known").addEventListener("click", markKnown);
document.getElementById("btn-unknown").addEventListener("click", markUnknown);
document.getElementById("btn-restart").addEventListener("click", () => {
  mastered = new Set();
  localStorage.removeItem(STORAGE_KEY);
  startSession();
});

// 启动
startSession();
