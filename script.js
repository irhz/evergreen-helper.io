/* ===== Evergreen Helper — presentation site interactions ===== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Nav: shadow + active link ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const links = $$(".nav__links a");
  // Only in-page (#…) links drive the scroll-spy — external links (faq/, download/) are skipped
  // so querySelector never chokes on a non-selector href.
  const sections = links
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("#"))
    .map((h) => $(h))
    .filter(Boolean);
  const navIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = "#" + e.target.id;
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
    }),
    { threshold: 0.5 }
  );
  sections.forEach((s) => navIO.observe(s));

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastT;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ---------- Demo data ---------- */
  const ICONS = { answer: "💬", hint: "💡", cmd: "💻", ban: "🚫" };
  const BADGE = { answer: "ОТВЕТ", hint: "ПОДСКАЗКА", cmd: "КОМАНДА", ban: "БАНВОРД" };
  const BADGE_CLASS = { answer: "badge--answer", hint: "badge--hint", cmd: "badge--cmd", ban: "badge--ban" };

  const DATA = [
    { type: "answer", name: "Приветствие", sub: "Общие · Старт", tags: "привет здравствуйте ку",
      text: "Здравствуйте! Я администратор проекта. Опишите вашу ситуацию максимально подробно, и я постараюсь помочь." },
    { type: "answer", name: "Запрос доказательств", sub: "Общие · Жалобы", tags: "пруфы доказательства видео",
      text: "Приложите, пожалуйста, доказательства нарушения: скриншоты или видеозапись с таймкодом." },
    { type: "hint", name: "Правило 4.1 — Оскорбление проекта", sub: "Правила · ОПП", tags: "4.1 опп оскорбление",
      text: "Пункт 4.1: Оскорбление проекта, администрации или игроков вне рамок RP. Запрещено в любом виде общения.",
      punishment: "Бан 3–7 дней" },
    { type: "hint", name: "Правило 2.3 — Deathmatch (DM)", sub: "Правила · DM", tags: "2.3 дм деатчматч убийство",
      text: "Пункт 2.3: Беспричинное убийство игрока без отыгровки и веской причины (DM).",
      punishment: "Бан 1–3 дня" },
    { type: "cmd", name: "Режим администратора", sub: "Команды · Дежурство", tags: "gm админ режим",
      text: "/gm" },
    { type: "cmd", name: "Телепорт к игроку", sub: "Команды · Перемещение", tags: "tpto телепорт",
      text: "/tpto | id" },
    { type: "ban", name: "чит / cheat", sub: "Банворды", tags: "чит cheat софт",
      text: "Упоминание стороннего ПО для получения преимущества.", punishment: "Перм. бан" },
    { type: "answer", name: "Решение по жалобе", sub: "Общие · Итог", tags: "решение итог наказание",
      text: "Жалоба рассмотрена. По нарушителю принято соответствующее наказание согласно правилам проекта. Спасибо за обращение!" }
  ];

  const FAVS = DATA.filter((d) => d.type === "answer" || d.type === "cmd").slice(0, 6);

  /* ---------- Interactive mini-launcher (search) ---------- */
  const listEl = $("#demoList");
  const pvEl = $("#demoPreview");
  const searchEl = $("#demoSearch");
  let current = null;

  function tokens(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }
  function matches(item, toks) {
    const hay = (item.name + " " + item.text + " " + (item.tags || "")).toLowerCase();
    return toks.every((t) => hay.includes(t));
  }
  function highlight(text, toks) {
    if (!toks.length) return esc(text);
    let out = esc(text);
    // build a combined regex of escaped tokens
    const pat = toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    try {
      out = out.replace(new RegExp("(" + pat + ")", "gi"), '<span class="mark">$1</span>');
    } catch (e) {}
    return out;
  }

  function renderPreview(item, toks) {
    current = item;
    if (!item) { pvEl.innerHTML = '<span class="pv__badge">ПУСТО</span><div class="pv__name">Ничего не найдено</div>'; return; }
    const canCopy = item.type === "answer" || item.type === "cmd";
    pvEl.innerHTML =
      '<span class="pv__badge">' + BADGE[item.type] + "</span>" +
      '<div class="pv__name">' + highlight(item.name, toks) + "</div>" +
      '<div class="pv__text">' + highlight(item.text, toks) + "</div>" +
      (item.punishment ? '<div class="pv__pun">⚠ ' + esc(item.punishment) + "</div>" : "") +
      (canCopy ? '<button class="pv__copy" type="button">Копировать</button>' : "");
    const cp = $(".pv__copy", pvEl);
    if (cp) cp.addEventListener("click", () => showToast("Скопировано: " + item.name));
  }

  function renderList() {
    const toks = tokens(searchEl.value);
    const items = DATA.filter((d) => matches(d, toks));
    listEl.innerHTML = "";
    if (!items.length) { renderPreview(null, toks); return; }
    items.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "row" + (i === 0 ? " is-active" : "");
      li.innerHTML =
        '<div class="row__ic">' + ICONS[item.type] + "</div>" +
        '<div class="row__main">' +
          '<div class="row__name">' + highlight(item.name, toks) + "</div>" +
          '<div class="row__sub">' + esc(item.sub) + "</div>" +
        "</div>" +
        '<span class="badge ' + BADGE_CLASS[item.type] + '">' + BADGE[item.type] + "</span>";
      li.addEventListener("mouseenter", () => {
        $$(".row", listEl).forEach((r) => r.classList.remove("is-active"));
        li.classList.add("is-active");
        renderPreview(item, toks);
      });
      li.addEventListener("click", () => {
        if (item.type === "answer" || item.type === "cmd") showToast("Скопировано: " + item.name);
      });
      listEl.appendChild(li);
    });
    renderPreview(items[0], toks);
  }

  if (searchEl) {
    searchEl.addEventListener("input", renderList);
    renderList();
  }

  /* ---------- RMB favorites menu demo ---------- */
  const zone = $("#rmbZone");
  let ctx = null;
  function closeCtx() { if (ctx) { ctx.remove(); ctx = null; } }

  if (zone) {
    zone.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      closeCtx();
      ctx = document.createElement("div");
      ctx.className = "ctx";
      ctx.innerHTML =
        '<div class="ctx__head"><span>Избранное</span><span>печатайте для поиска</span></div>' +
        FAVS.map((f) =>
          '<div class="ctx__item" data-name="' + esc(f.name) + '">' +
            '<span class="ctx__star">★</span>' +
            '<div class="ctx__main">' +
              '<div class="ctx__name">' + esc(f.name) + "</div>" +
              '<div class="ctx__sub">' + esc(f.type === "cmd" ? f.text : f.text) + "</div>" +
            "</div>" +
          "</div>"
        ).join("");

      // position so the cursor sits at the bottom-left of the menu (like the app)
      document.body.appendChild(ctx);
      const w = ctx.offsetWidth, h = ctx.offsetHeight;
      let x = e.clientX, y = e.clientY - h;
      x = Math.min(x, window.innerWidth - w - 8);
      y = Math.max(8, y);
      ctx.style.left = x + "px";
      ctx.style.top = y + "px";

      $$(".ctx__item", ctx).forEach((it) =>
        it.addEventListener("click", () => {
          showToast("Вставлено в чат: " + it.dataset.name);
          closeCtx();
        })
      );
    });
  }
  document.addEventListener("click", (e) => { if (ctx && !ctx.contains(e.target)) closeCtx(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCtx(); });
  window.addEventListener("scroll", closeCtx, { passive: true });

  /* ---------- Subtle tilt on the hero mock ---------- */
  const tilt = $("[data-tilt] .mockup");
  const tiltHost = $("[data-tilt]");
  if (tilt && tiltHost && window.matchMedia("(pointer:fine)").matches) {
    tiltHost.addEventListener("mousemove", (e) => {
      const r = tiltHost.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = "perspective(1100px) rotateY(" + px * 5 + "deg) rotateX(" + -py * 5 + "deg)";
    });
    tiltHost.addEventListener("mouseleave", () => { tilt.style.transform = ""; });
  }

  /* ---------- Hero mode segments (visual only, but feel alive) ---------- */
  $$(".seg__btn").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".seg__btn").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    })
  );
})();
