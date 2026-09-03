/* LLM 面试题学习工作台 - app logic */
const LS_KEY = "llm-workshop-progress-v1";
const state = {
  view: "dashboard",       // dashboard | topic | quiz | search
  topic: 0,
  topicMode: "browse",     // browse | selftest
  topicFilter: "all",      // all | unlearned | review | mastered
  quizScope: "all",        // all | topic
  search: "",
  quiz: null,              // {t, i}
  openCards: {},           // "t-i" -> "open" | "revealed"
};

/* ---------- icons ---------- */
function icon(name){
  const paths = {
    check: '<path d="M3.5 8.5l3 3 6-7"/>',
    refresh: '<path d="M13.5 8A5.5 5.5 0 1 1 12 3.5"/><path d="M12 1.5v3h3"/>',
    x: '<path d="M4 4l8 8M12 4l-8 8"/>',
    arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
    dice: '<rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><circle cx="5.5" cy="5.5" r=".9"/><circle cx="10.5" cy="10.5" r=".9"/><circle cx="10.5" cy="5.5" r=".9"/><circle cx="5.5" cy="10.5" r=".9"/>',
  };
  return '<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
}

/* ---------- progress ---------- */
const VALID_STATUS = new Set(["new", "mastered", "review"]);
function loadItems(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && p.v === 2 && p.items && typeof p.items === "object") return p.items;
    if (p && typeof p === "object" && !Array.isArray(p)) return p; // legacy flat map
    return {};
  } catch(e){ return {}; }
}
function saveItems(items){
  localStorage.setItem(LS_KEY, JSON.stringify({ v: 2, savedAt: Date.now(), items }));
  renderSaveInfo();
}
function statusOf(t, i){ const v = loadItems()[`${t}-${i}`]; return VALID_STATUS.has(v) ? v : "new"; }
function setStatus(t, i, s){
  const p = loadItems();
  if (s === "new") delete p[`${t}-${i}`]; else p[`${t}-${i}`] = s;
  saveItems(p);
  render();
}
function renderProgressPanel(){
  const st = overallStats();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("ppOk", st.ok);
  set("ppRev", st.review);
  set("ppNew", st.total - st.ok - st.review);
  const bar = document.getElementById("ppBar");
  if (bar) bar.style.transform = "scaleX(" + (st.pct / 100) + ")";
  renderSaveInfo();
}
function renderSaveInfo(){
  const el = document.getElementById("saveInfo");
  if (!el) return;
  let ts = "";
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw){
      const p = JSON.parse(raw);
      if (p && p.savedAt){
        const d = new Date(p.savedAt);
        ts = "已保存 " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      }
    }
  } catch(e){}
  el.textContent = ts || "尚未保存";
}
function topicStats(t){
  const p = loadItems();
  let total = 0, ok = 0, review = 0;
  DATA[t].items.forEach((it, i) => {
    if (it.type !== "qa") return;
    total++;
    if (p[`${t}-${i}`] === "mastered") ok++;
    if (p[`${t}-${i}`] === "review") review++;
  });
  return { total, ok, review, pct: total ? Math.round(ok / total * 100) : 0 };
}
function overallStats(){
  const p = loadItems();
  let total = 0, ok = 0, review = 0;
  DATA.forEach((tpc, t) => tpc.items.forEach((it, i) => {
    if (it.type !== "qa") return;
    total++;
    if (p[`${t}-${i}`] === "mastered") ok++;
    if (p[`${t}-${i}`] === "review") review++;
  }));
  return { total, ok, review, pct: total ? Math.round(ok / total * 100) : 0 };
}

/* ---------- nav ---------- */
function renderNav(){
  const nav = document.getElementById("nav");
  const items = [];
  items.push(`<a href="#" class="${state.view==='dashboard'?'active':''}" data-t="-1">
    <span class="idx">◎</span>总览<span class="pct">${overallStats().pct}%</span></a>`);
  DATA.forEach((tpc, t) => {
    const st = topicStats(t);
    const cls = (state.view === "topic" && state.topic === t) ? "active" : "";
    items.push(`<a href="#" class="${cls}" data-t="${t}">
      <span class="idx">${String(t+1).padStart(2,"0")}</span>${tpc.topic}<span class="pct">${st.pct}%</span></a>`);
  });
  nav.innerHTML = items.join("");
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const t = Number(a.dataset.t);
    if (t === -1) goDashboard(); else goTopic(t);
    closeNav();
  }));
}

/* ---------- views ---------- */
function goDashboard(){ state.view = "dashboard"; state.search = ""; document.getElementById("searchInput").value=""; render(); }
function goTopic(t){ state.view = "topic"; state.topic = t; render(); window.scrollTo(0,0); }
function goQuiz(scope){ state.view = "quiz"; state.quizScope = scope; pickQuiz(); render(); }
function goSearch(q){ state.view = "search"; state.search = q; render(); }

function render(){
  renderNav();
  renderProgressPanel();
  document.getElementById("crumb").innerHTML = crumbHTML();
  const v = document.getElementById("view");
  if (state.view === "dashboard") v.innerHTML = dashboardHTML();
  else if (state.view === "topic") v.innerHTML = topicHTML();
  else if (state.view === "quiz") v.innerHTML = quizHTML();
  else v.innerHTML = searchHTML();
  bindView();
}

function crumbHTML(){
  if (state.view === "dashboard") return `<button onclick="goDashboard()">总览</button>`;
  if (state.view === "topic") return `<button onclick="goDashboard()">总览</button> <span>/</span> <b>${esc(DATA[state.topic].topic)}</b>`;
  if (state.view === "quiz") return `<button onclick="goDashboard()">总览</button> <span>/</span> <b>抽题练习</b>`;
  return `<button onclick="goDashboard()">总览</button> <span>/</span> <b>搜索</b>`;
}

/* ---------- dashboard ---------- */
function dashboardHTML(){
  const st = overallStats();
  const reviewCards = collectReview();
  const today = pickRandomUnlearned();
  let todayHTML = "";
  if (today){
    todayHTML = `<div class="today">
      <div class="tag">今日推荐</div>
      <div class="q">${esc(short(today.q, 90))}</div>
      <button onclick="goTopic(${today.t})">去练习 ${icon("arrow")}</button>
    </div>`;
  }
  let reviewHTML = "";
  if (reviewCards.length){
    reviewHTML = `<div class="section-title"><h3>待复习</h3><span class="note">${reviewCards.length} 题</span></div>
    <div class="qa-list">${reviewCards.map(c => miniCard(c)).join("")}</div>`;
  }
  const cards = DATA.map((tpc, t) => {
    const s = topicStats(t);
    const done = s.ok === s.total && s.total > 0;
    return `<button class="tcard ${done?'done':''}" onclick="goTopic(${t})">
      <div class="t-title">${esc(tpc.topic)}<small>${String(t+1).padStart(2,"0")} · ${s.total} 题</small></div>
      <div class="t-meta"><span>掌握 <b>${s.ok}</b> / ${s.total}</span><span>待复习 <b>${s.review}</b></span></div>
      <div class="barwrap"><div class="bar" style="transform:scaleX(${s.pct/100})"></div></div>
      <div class="go">${done ? "已全部掌握" : "进入学习"} ${icon("arrow")}</div>
    </button>`;
  }).join("");
  return `
    <div class="hero">
      <h2>把 12 份面试题变成你的知识库</h2>
      <p>共 ${st.total} 道题，覆盖 Attention、RLHF/PPO、损失函数、层归一化、负样本挖掘、SFT 数据生成等主题。建议先用「自测模式」过一遍，再针对薄弱点复习。</p>
      <div class="stats">
        <div class="stat ok"><div class="num">${st.ok}<small> / ${st.total}</small></div><div class="lbl">已掌握</div></div>
        <div class="stat warn"><div class="num">${st.review}</div><div class="lbl">需复习</div></div>
        <div class="stat"><div class="num">${st.total - st.ok - st.review}</div><div class="lbl">未开始</div></div>
        <div class="stat"><div class="num">${DATA.length}</div><div class="lbl">主题</div></div>
      </div>
      <div class="barwrap"><div class="bar" style="transform:scaleX(${st.pct/100})"></div></div>
    </div>
    ${todayHTML}
    <div class="section-title"><h3>全部主题</h3><span class="note">点击进入学习</span></div>
    <div class="grid">${cards}</div>
    ${reviewHTML}
  `;
}
function collectReview(){
  const out = [];
  DATA.forEach((tpc, t) => tpc.items.forEach((it, i) => {
    if (it.type === "qa" && statusOf(t, i) === "review") out.push({ t, i, q: it.q, topic: tpc.topic });
  }));
  return out;
}
function pickRandomUnlearned(){
  const pool = [];
  DATA.forEach((tpc, t) => tpc.items.forEach((it, i) => {
    if (it.type === "qa" && statusOf(t, i) === "new") pool.push({ t, i, q: it.q });
  }));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
function miniCard(c){
  return `<div class="card open">
    <button type="button" class="qrow" onclick="goTopic(${c.t})">
      <span class="num">${String(c.i+1).padStart(2,"0")}</span>
      <div class="qtext">${esc(short(c.q, 80))}</div>
      <span class="status-dot" style="background:var(--warn)"></span>
    </button>
    <div class="afoot" style="display:flex;padding-bottom:16px">
      <span class="pill warn">${esc(c.topic)}</span>
      <button class="on-ok" onclick="event.stopPropagation();setStatus(${c.t},${c.i},'mastered')">${icon("check")}已掌握</button>
      <button onclick="event.stopPropagation();setStatus(${c.t},${c.i},'new')">${icon("x")}取消标记</button>
    </div></div>`;
}

/* ---------- topic ---------- */
function visibleItems(t){
  const filter = state.topicFilter;
  const items = [];
  DATA[t].items.forEach((it, i) => {
    if (it.type === "qa"){
      const s = statusOf(t, i);
      if (filter === "unlearned" && s !== "new") return;
      if (filter === "review" && s !== "review") return;
      if (filter === "mastered" && s !== "mastered") return;
      items.push({ idx: i, it });
    } else {
      items.push({ idx: -1, it });
    }
  });
  return items;
}
function topicHTML(){
  const t = state.topic;
  const tpc = DATA[t];
  const st = topicStats(t);
  const mode = state.topicMode;
  const items = visibleItems(t);
  const list = items.map(({idx, it}) => {
    if (it.type === "section") return `<div class="sec-div"><span>${esc(it.q)}</span></div>`;
    return cardHTML(t, idx, it, mode);
  }).join("");
  return `
    <div class="thead">
      <h2>${esc(tpc.topic)}</h2>
      <div class="meta">
        <span class="pill acc">共 ${st.total} 题</span>
        <span class="pill ok">掌握 ${st.ok}</span>
        <span class="pill warn">待复习 ${st.review}</span>
        <span class="pill">进度 ${st.pct}%</span>
      </div>
    </div>
    <div class="modebar">
      <div class="seg">
        <button class="${mode==='browse'?'on':''}" data-mode="browse">浏览模式</button>
        <button class="${mode==='selftest'?'acc-on':''}" data-mode="selftest">自测模式</button>
      </div>
      <button class="pill acc" style="font-weight:600" data-act="quiz">${icon("dice")}抽一题</button>
      <div class="chips" data-chips>
        <button class="${state.topicFilter==='all'?'on':''}" data-f="all">全部</button>
        <button class="${state.topicFilter==='unlearned'?'on':''}" data-f="unlearned">未学</button>
        <button class="${state.topicFilter==='review'?'on':''}" data-f="review">需复习</button>
        <button class="${state.topicFilter==='mastered'?'on':''}" data-f="mastered">已掌握</button>
      </div>
    </div>
    ${items.length ? `<div class="qa-list">${list}</div>` : `<div class="empty"><div class="big">这个筛选项下没有题目</div>换个筛选条件看看</div>`}
    <div class="section-title"><span class="note">原文档：${esc(tpc.source)}.pdf · 公式为图片的题目请对照原 PDF</span></div>
  `;
}
function cardHTML(t, i, it, mode){
  const s = statusOf(t, i);
  const stCls = s === "mastered" ? "st-mastered" : (s === "review" ? "st-review" : "");
  const hasA = it.a && it.a.trim().length > 0;
  const answer = hasA ? esc(it.a) : `<span class="hint">（原文中该题为公式/代码图，请对照原 PDF 自查）</span>`;
  const qm = mode === "selftest" ? "quizmode" : "";
  const openState = state.openCards[`${t}-${i}`];
  const openCls = qm === "quizmode" ? (openState === "revealed" ? "revealed" : "") : (openState === "open" ? "open" : "");
  const expanded = openCls !== "";
  return `<div class="card ${stCls} ${qm} ${openCls}" id="qa-${t}-${i}" data-t="${t}" data-i="${i}">
    <button type="button" class="qrow" data-act="toggle" aria-expanded="${expanded}">
      <span class="num">${String(i+1).padStart(2,"0")}</span>
      <div class="qtext">${esc(it.q)}</div>
      <span class="status-dot"></span>
    </button>
    <div class="a">${answer}</div>
    <div class="afoot">
      <button data-act="ok" class="${s==='mastered'?'on-ok':''}">${icon("check")}已掌握</button>
      <button data-act="review" class="${s==='review'?'on-warn':''}">${icon("refresh")}需复习</button>
      <button data-act="new">${icon("x")}重置为未学</button>
    </div>
  </div>`;
}

/* ---------- quiz ---------- */
function pickQuiz(){
  let pool = [];
  if (state.quizScope === "topic"){
    DATA[state.topic].items.forEach((it, i) => { if (it.type === "qa") pool.push({ t: state.topic, i }); });
  } else {
    DATA.forEach((tpc, t) => tpc.items.forEach((it, i) => { if (it.type === "qa") pool.push({ t, i }); }));
  }
  if (!pool.length){ state.quiz = null; return; }
  // prefer unlearned/review, fall back to any
  const weaker = pool.filter(x => statusOf(x.t, x.i) !== "mastered");
  const src = weaker.length ? weaker : pool;
  state.quiz = src[Math.floor(Math.random() * src.length)];
}
function quizHTML(){
  if (!state.quiz){ return `<div class="empty"><div class="big">没有可抽的题目</div></div>`; }
  const { t, i } = state.quiz;
  const it = DATA[t].items[i];
  const hasA = it.a && it.a.trim().length > 0;
  const answer = hasA ? esc(it.a) : `<span class="hint">（原文中该题为公式/代码图，请对照原 PDF 自查）</span>`;
  return `
    <div class="modebar">
      <div class="seg">
        <button class="${state.quizScope==='all'?'on':''}" data-scope="all">全部主题</button>
        <button class="${state.quizScope==='topic'?'on':''}" data-scope="topic">仅「${esc(DATA[state.topic].topic)}」</button>
      </div>
      <div class="chips"><button onclick="goDashboard()">${icon("arrow")}返回总览</button></div>
    </div>
    <div class="quiz-stage" id="quizStage">
      <div class="q-topic">${esc(DATA[t].topic)} · 第 ${i+1} 题</div>
      <div class="q-big">${esc(it.q)}</div>
      <div class="a-big">${answer}</div>
      <div class="quiz-actions" id="quizActions">
        <button class="primary" data-act="reveal">显示答案</button>
        <button class="ghost" data-act="skip">换一题</button>
      </div>
    </div>
  `;
}
function revealQuiz(){
  const stage = document.getElementById("quizStage");
  stage.classList.add("revealed");
  document.getElementById("quizActions").innerHTML = `
    <button class="okbtn" data-act="know">${icon("check")}会了 · 已掌握</button>
    <button class="nobtn" data-act="notknow">${icon("refresh")}不会 · 需复习</button>
    <button class="ghost" data-act="next">下一题</button>
  `;
  bindView();
}

/* ---------- search ---------- */
function searchHTML(){
  const q = state.search.trim();
  if (!q) return `<div class="empty"><div class="big">输入关键词开始搜索</div>支持搜索题目和答案内容，按 / 快速聚焦搜索框</div>`;
  const groups = [];
  const re = new RegExp(escRe(q), "gi");
  DATA.forEach((tpc, t) => {
    const hits = [];
    tpc.items.forEach((it, i) => {
      if (it.type !== "qa") return;
      const inQ = it.q.includes(q) || it.q.toLowerCase().includes(q.toLowerCase());
      const inA = it.a.includes(q) || it.a.toLowerCase().includes(q.toLowerCase());
      if (!inQ && !inA) return;
      hits.push(`<div class="card open" onclick="goTopic(${t})">
        <button type="button" class="qrow"><span class="num">${String(i+1).padStart(2,"0")}</span>
        <div class="qtext">${inQ ? hl(it.q, re) : esc(short(it.q, 100))}</div>
        <span class="status-dot"></span></button>
        ${inA ? `<div class="a">…${hl(snippet(it.a, q), re)}…</div>` : ""}
      </div>`);
    });
    if (hits.length) groups.push(`<div class="res-group">
      <div class="g-title"><b>${esc(tpc.topic)}</b> · ${hits.length} 条匹配</div>
      <div class="qa-list">${hits.join("")}</div></div>`);
  });
  const body = groups.length ? groups.join("") : `<div class="empty"><div class="big">没有找到「${esc(q)}」相关内容</div>试试其他关键词</div>`;
  return `<div class="section-title"><h3>搜索结果</h3><span class="note">${groups.length ? "共 " + groups.length + " 个主题命中" : ""}</span></div>${body}`;
}
function snippet(a, q){
  const idx = a.indexOf(q);
  if (idx < 0) return a.slice(0, 140);
  const s = Math.max(0, idx - 60);
  return a.slice(s, s + 160);
}

/* ---------- events ---------- */
function bindView(){
  if (state.view === "topic"){
    document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
      state.topicMode = b.dataset.mode; render();
    }));
    document.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => {
      state.topicFilter = b.dataset.f; render();
    }));
    document.querySelectorAll("[data-act='quiz']").forEach(b => b.addEventListener("click", () => goQuiz("topic")));
    document.querySelectorAll(".card").forEach(card => {
      const t = Number(card.dataset.t), i = Number(card.dataset.i);
      card.querySelectorAll("[data-act='toggle']").forEach(el => el.addEventListener("click", () => {
        if (state.topicMode === "selftest"){
          card.classList.toggle("revealed");
          state.openCards[`${t}-${i}`] = card.classList.contains("revealed") ? "revealed" : "";
        } else {
          card.classList.toggle("open");
          state.openCards[`${t}-${i}`] = card.classList.contains("open") ? "open" : "";
        }
        const openNow = card.classList.contains("open") || card.classList.contains("revealed");
        el.setAttribute("aria-expanded", String(openNow));
      }));
      card.querySelectorAll("[data-act='ok']").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); setStatus(t, i, "mastered"); }));
      card.querySelectorAll("[data-act='review']").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); setStatus(t, i, "review"); }));
      card.querySelectorAll("[data-act='new']").forEach(el => el.addEventListener("click", e => { e.stopPropagation(); setStatus(t, i, "new"); }));
    });
  }
  if (state.view === "quiz"){
    document.querySelectorAll("[data-scope]").forEach(b => b.addEventListener("click", () => {
      state.quizScope = b.dataset.scope; goQuiz(state.quizScope);
    }));
    document.querySelectorAll("[data-act='reveal']").forEach(b => b.addEventListener("click", revealQuiz));
    document.querySelectorAll("[data-act='skip']").forEach(b => b.addEventListener("click", () => pickQuiz() && render()));
    document.querySelectorAll("[data-act='next']").forEach(b => b.addEventListener("click", () => pickQuiz() && render()));
    document.querySelectorAll("[data-act='know']").forEach(b => b.addEventListener("click", () => {
      const {t, i} = state.quiz; setStatus(t, i, "mastered"); pickQuiz(); render();
    }));
    document.querySelectorAll("[data-act='notknow']").forEach(b => b.addEventListener("click", () => {
      const {t, i} = state.quiz; setStatus(t, i, "review"); pickQuiz(); render();
    }));
  }
}

/* ---------- progress io ---------- */
function exportProgress(){
  const items = loadItems();
  const blob = new Blob([JSON.stringify({ v: 2, savedAt: Date.now(), items }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "面试工作台-学习进度-" + new Date().toISOString().slice(0,10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("进度已导出（" + Object.keys(items).length + " 条）");
}
function importProgress(ev){
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const p = JSON.parse(r.result);
      let items = null;
      if (p && typeof p === "object" && p.v === 2 && p.items && typeof p.items === "object") items = p.items;
      else if (p && typeof p === "object" && !Array.isArray(p)) items = p;
      if (!items) throw new Error("bad shape");
      const clean = {};
      for (const k of Object.keys(items)){
        if (VALID_STATUS.has(items[k])) clean[k] = items[k];
      }
      const cur = loadItems();
      let n = 0;
      for (const k of Object.keys(clean)){
        if (cur[k] !== clean[k]){ cur[k] = clean[k]; n++; }
      }
      saveItems(cur);
      toast(n ? "已导入 " + n + " 条进度（与现有进度合并）" : "文件有效，但没有新的进度变化");
      render();
    } catch(e){ toast("导入失败：文件格式不对"); }
    ev.target.value = "";
  };
  r.readAsText(f);
}
function resetProgress(){
  if (confirm("确定清空全部学习进度？此操作不可撤销。")){
    localStorage.removeItem(LS_KEY);
    toast("进度已重置");
    render();
  }
}

/* ---------- utils ---------- */
function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function hl(s, re){ return esc(s).replace(re, m => `<span class="hl">${m}</span>`); }
function short(s, n){ s = String(s); return s.length > n ? s.slice(0, n) + "…" : s; }
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}
function toggleNav(){ document.getElementById("sidebar").classList.toggle("open"); document.getElementById("scrim").classList.toggle("show"); }
function closeNav(){ document.getElementById("sidebar").classList.remove("open"); document.getElementById("scrim").classList.remove("show"); }
function onSearchInput(v){ if (state.view !== "search" && v.trim()) goSearch(v.trim()); else if (!v.trim() && state.view === "search") goDashboard(); else if (state.view === "search") goSearch(v.trim()); }

window.addEventListener("storage", e => { if (e.key === LS_KEY) render(); });

document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT"){
    e.preventDefault();
    document.getElementById("searchInput").focus();
  }
});

render();
