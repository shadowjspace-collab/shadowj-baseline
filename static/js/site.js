(function () {
  const sectionOverlay = document.getElementById("sectionOverlay");
  const searchOverlay = document.getElementById("searchOverlay");

  const btnSection =
    document.getElementById("btnSection") || document.getElementById("sectionToggleBtn");

  // Search uses input itself as the trigger (keep 3-button layout)
  const searchInput = document.getElementById("searchInput");
  const soHead = document.getElementById("searchOverlayHead");
  const soList = document.getElementById("searchOverlayList");

  function getViewportHeight() {
    if (window.visualViewport && window.visualViewport.height) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  /* =========================
     Section overlay (sealed)
     ========================= */
  function layoutSectionOverlay() {
    if (!sectionOverlay || !btnSection) return;

    const vpH = getViewportHeight();
    const btnRect = btnSection.getBoundingClientRect();

    const top = Math.round(btnRect.bottom + 1);
    const left = Math.round(btnRect.left);
    const width = Math.round(btnRect.width);

    const paddingBottom = 8;
    const availableH = Math.max(160, Math.floor(vpH - top - paddingBottom));

    sectionOverlay.style.top = top + "px";
    sectionOverlay.style.left = left + "px";
    sectionOverlay.style.width = width + "px";

    sectionOverlay.style.height = "auto";
    sectionOverlay.style.maxHeight = availableH + "px";
  }

  /* =========================
     Search overlay layout
     ========================= */
  function layoutSearchOverlay() {
    if (!searchOverlay || !searchInput) return;

    const vpH = getViewportHeight();
    const rect = searchInput.getBoundingClientRect();

    const top = Math.round(rect.bottom + 1);
    const left = Math.round(rect.left);
    const width = Math.round(rect.width);

    const paddingBottom = 8;
    const availableH = Math.max(160, Math.floor(vpH - top - paddingBottom));

    searchOverlay.style.top = top + "px";
    searchOverlay.style.left = left + "px";
    searchOverlay.style.width = width + "px";

    searchOverlay.style.height = "auto";
    searchOverlay.style.maxHeight = availableH + "px";
  }

  function isOpen(el) {
    return el && (el.classList.contains("isOpen") || el.classList.contains("is-open"));
  }

  function setOpen(el, open) {
    if (!el) return;

    if (open) {
      el.classList.add("isOpen", "is-open");
      el.classList.remove("is-close");
      el.setAttribute("aria-hidden", "false");

      if (el === sectionOverlay) {
        requestAnimationFrame(() => layoutSectionOverlay());
        setTimeout(() => layoutSectionOverlay(), 50);
      }

      if (el === searchOverlay) {
        requestAnimationFrame(() => layoutSearchOverlay());
        setTimeout(() => layoutSearchOverlay(), 50);
      }
    } else {
      el.classList.remove("isOpen", "is-open");
      el.setAttribute("aria-hidden", "true");

      if (el === sectionOverlay) {
        sectionOverlay.style.top = "";
        sectionOverlay.style.left = "";
        sectionOverlay.style.width = "";
        sectionOverlay.style.height = "";
        sectionOverlay.style.maxHeight = "";
      }

      if (el === searchOverlay) {
        searchOverlay.style.top = "";
        searchOverlay.style.left = "";
        searchOverlay.style.width = "";
        searchOverlay.style.height = "";
        searchOverlay.style.maxHeight = "";
      }
    }

    if (btnSection && el === sectionOverlay)
      btnSection.setAttribute("aria-expanded", open ? "true" : "false");

    if (searchInput && el === searchOverlay)
      searchInput.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeAll() {
    [sectionOverlay, searchOverlay].forEach((el) => setOpen(el, false));
  }

  function toggle(el) {
    if (!el) return;
    const open = isOpen(el);
    if (open) setOpen(el, false);
    else {
      [sectionOverlay, searchOverlay].forEach((x) => {
        if (x && x !== el) setOpen(x, false);
      });
      setOpen(el, true);
    }
  }

  /* =========================
     Search data + logic
     - Results: title list only
     - Search targets: title + summary + content + reasoning_type + year
     - Year search: 2026 or 2026(year)
     - Reasoning filter: button only
     - Reasoning filter: exact match on full English label
     ========================= */

  const REASONING = [
    { label: "Evidence-Based Reasoning", label_ko: "근거기반 사고" },
    { label: "Hybrid Reasoning (Evidence + Insight)", label_ko: "근거+통찰 혼합" },
    { label: "Pure Intuitive Insight", label_ko: "순수 직관 통찰" }
  ];

  // Filter stores the full English label. null means no filter.
  let activeReasoningLabel = null;

  let indexLoaded = false;
  let indexData = [];
  let loadPromise = null;

  function normalizeText(s) {
    return (s || "").toString().replace(/\s+/g, " ").trim();
  }

  function lower(s) {
    return normalizeText(s).toLowerCase();
  }

  function extractYearFromQuery(q) {
    const m = q.match(/(19|20)\d{2}/);
    if (!m) return null;
    return m[0];
  }

  function ensureIndexLoaded() {
    if (indexLoaded) return Promise.resolve(true);
    if (loadPromise) return loadPromise;

    loadPromise = fetch("/index.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("index.json fetch failed");
        return r.json();
      })
      .then((arr) => {
        indexData = Array.isArray(arr) ? arr : [];
        indexLoaded = true;
        return true;
      })
      .catch(() => {
        indexData = [];
        indexLoaded = true;
        return false;
      });

    return loadPromise;
  }

  function buildYearSuggestions(limit) {
    const years = new Set();
    indexData.forEach((p) => {
      if (p && p.year) years.add(String(p.year));
    });
    const sorted = Array.from(years).sort((a, b) => (a < b ? 1 : -1));
    return sorted.slice(0, limit || 2);
  }

  function renderOverlayHead(text) {
    if (!soHead) return;
    soHead.textContent = text || "Search";
  }

  function clearOverlayList() {
    if (!soList) return;
    soList.innerHTML = "";
  }

  function addSuggestButton(title, subtitle, onClick) {
    if (!soList) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "so-suggest";
    btn.innerHTML = '<div class="so-title"></div><div class="so-sub"></div>';

    btn.querySelector(".so-title").textContent = title;
    btn.querySelector(".so-sub").textContent = subtitle || "";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onClick) onClick();
    });

    soList.appendChild(btn);
  }

  function addResultLink(title, subtitle, url) {
    if (!soList) return;

    const a = document.createElement("a");
    a.className = "so-item";
    a.href = url || "#";
    a.innerHTML = '<div class="so-title"></div><div class="so-sub"></div>';

    a.querySelector(".so-title").textContent = title;
    a.querySelector(".so-sub").textContent = subtitle || "";

    soList.appendChild(a);
  }

  function showSearchOverlay() {
    if (!searchOverlay) return;
    if (!isOpen(searchOverlay)) setOpen(searchOverlay, true);
  }

  function hideSearchOverlay() {
    if (!searchOverlay) return;
    if (isOpen(searchOverlay)) setOpen(searchOverlay, false);
  }

  /* =========================
     Reset search state (1회용 세션 강제)
     - Clear query
     - Clear reasoning filter
     - Close overlay
     - Blur input (모바일에서 focus 갇힘 방지)
     ========================= */
  let didEverSearch = false;
  let lastScrollY = window.scrollY || 0;

  // 오버레이 내부 터치 직후에는 window scroll reset을 잠깐 막는다(오버레이 리스트 스크롤 보호)
  let lastOverlayInteractAt = 0;

  // ✅ 2단계: "검색창을 다시 누르는 순간 = 무조건 새 세션" 구현용
  // 마지막으로 searchInput에서 "세션 리셋"을 실행한 시각 (중복 호출 방지)
  let lastSearchTapResetAt = 0;

  function resetSearchState() {
    if (!searchInput) return;

    searchInput.value = "";
    activeReasoningLabel = null;

    hideSearchOverlay();
    renderOverlayHead("검색 제안");
    clearOverlayList();

    didEverSearch = false;

    searchInput.setAttribute("aria-expanded", "false");

    // 모바일에서 "터치에 갇힘" 방지: 본문으로 나가면 포커스를 풀어준다
    try {
      searchInput.blur();
    } catch (_) {}
  }

  function renderDefaultSuggestions() {
    renderOverlayHead("검색 제안");
    clearOverlayList();

    addSuggestButton(
      "필터 해제",
      activeReasoningLabel ? "추론 필터: ON" : "필터 없음",
      () => {
        activeReasoningLabel = null;
        runSearch();
        if (searchInput) searchInput.focus();
      }
    );

    addSuggestButton(
      "단어 검색",
      "Matches title/summary/content/reasoning_type/year; shows title list",
      () => {
        if (searchInput) searchInput.focus();
      }
    );

    REASONING.forEach((r) => {
      const onTxt = activeReasoningLabel === r.label ? " (ON)" : "";
      addSuggestButton(
        r.label_ko + onTxt,
        r.label,
        () => {
          activeReasoningLabel = r.label;
          runSearch();
          if (searchInput) searchInput.focus();
        }
      );
    });

    addSuggestButton(
      "연도 검색",
      "예: 2026 (직접 입력)",
      () => {
        if (searchInput) searchInput.focus();
      }
    );

    if (indexLoaded && indexData.length) {
      const years = buildYearSuggestions(2);
      years.forEach((y) => {
        addSuggestButton(
          y + " (예시)",
          "입력값으로 연도 필터",
          () => {
            if (searchInput) searchInput.value = y;
            runSearch();
            if (searchInput) searchInput.focus();
          }
        );
      });
    }

    showSearchOverlay();
    requestAnimationFrame(() => layoutSearchOverlay());
  }

  function applyReasoningFilter(results) {
    if (!activeReasoningLabel) return results;

    const target = normalizeText(activeReasoningLabel);
    return results.filter((p) => {
      const rt = normalizeText(p && p.reasoning_type);
      return rt && rt === target;
    });
  }

  function runSearch() {
    if (!searchInput) return;

    const raw = normalizeText(searchInput.value);

    // "검색 세션 시작" 표시: (타이핑 or 필터) 한번이라도 만지면 1회용으로 본다
    if (raw || activeReasoningLabel) didEverSearch = true;

    if (!raw) {
      if (!activeReasoningLabel) {
        renderDefaultSuggestions();
        return;
      }

      ensureIndexLoaded().then(() => {
        if (!indexData.length) {
          renderOverlayHead("Search");
          clearOverlayList();
          addSuggestButton("Index is empty", "Check index.json generation/deploy", () => {});
          showSearchOverlay();
          return;
        }

        let results = applyReasoningFilter(indexData.slice());

        renderOverlayHead("Results: " + results.length);
        clearOverlayList();

        if (!results.length) {
          addSuggestButton("No results", "Check front matter reasoning_type exact match", () => {});
          showSearchOverlay();
          return;
        }

        const MAX = 60;
        results.slice(0, MAX).forEach((p) => {
          const t = p.title || "(untitled)";
          const sub =
            (p.year ? String(p.year) : "") +
            (p.reasoning_type ? " · " + p.reasoning_type : "");
          addResultLink(t, sub, p.url || "#");
        });

        showSearchOverlay();
        requestAnimationFrame(() => layoutSearchOverlay());
      });

      return;
    }

    ensureIndexLoaded().then(() => {
      const q = raw;
      const year = extractYearFromQuery(q);
      const justYear = year && normalizeText(q).replace("year", "").replace(" ", "") === year;

      if (!indexData.length) {
        renderOverlayHead("Search");
        clearOverlayList();
        addSuggestButton("Index is empty", "Check index.json generation/deploy", () => {});
        showSearchOverlay();
        return;
      }

      let results = [];

      if (justYear) {
        results = indexData.filter((p) => String(p.year) === year);
      } else {
        const qL = lower(q);
        results = indexData.filter((p) => {
          const hay = lower(
            (p.title || "") +
              " " +
              (p.summary || "") +
              " " +
              (p.content || "") +
              " " +
              (p.reasoning_type || "") +
              " " +
              (p.year || "")
          );
          return hay.indexOf(qL) !== -1;
        });

        if (year) {
          results = results.filter((p) => String(p.year) === year);
        }
      }

      results = applyReasoningFilter(results);

      renderOverlayHead("Results: " + results.length);
      clearOverlayList();

      if (!results.length) {
        addSuggestButton("No results", "Check spelling/year/filter state", () => {});
        showSearchOverlay();
        return;
      }

      const MAX = 60;
      results.slice(0, MAX).forEach((p) => {
        const t = p.title || "(untitled)";
        const sub =
          (p.year ? String(p.year) : "") +
          (p.reasoning_type ? " · " + p.reasoning_type : "");
        addResultLink(t, sub, p.url || "#");
      });

      showSearchOverlay();
      requestAnimationFrame(() => layoutSearchOverlay());
    });
  }

  /* =========================
     Event wiring
     ========================= */

  if (btnSection) {
    btnSection.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle(sectionOverlay);
    });
  }

  [sectionOverlay].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });

  // --- 핵심 수정 1: focus뿐 아니라 "click/pointerdown"에서도 무조건 안내리스트를 다시 띄운다 ---
  function openSearchUI() {
    ensureIndexLoaded().then(() => {
      runSearch();
    });
  }

  // ✅ 2단계: 검색창을 다시 누르는 순간 무조건 새 세션으로 리셋
  // - "검색창 내부 탭"만 잡아서 리셋한다(본문 터치/스크롤 리셋과 별개).
  // - 너무 연속으로 호출되면(이벤트 중복: pointerdown+click 등) 200ms 가드로 1번만 실행.
  function resetToNewSessionOnSearchTap(e) {
    if (!searchInput) return;

    const now = Date.now();
    if (now - lastSearchTapResetAt < 200) return; // 중복 호출 방지
    lastSearchTapResetAt = now;

    // 이미 열려 있든/필터가 켜져 있든/값이 있든 상관없이 "무조건" 새 세션
    // 다만, 이 리셋이 overlay 내부(버튼 클릭)에서 올라온 이벤트면 안 됨 (여긴 searchInput 전용이므로 안전)
    resetSearchState();

    // resetSearchState()가 blur를 해버리므로, 즉시 다시 포커스를 잡아주고 UI를 띄운다
    try {
      searchInput.focus();
    } catch (_) {}

    openSearchUI();

    if (e && e.stopPropagation) e.stopPropagation();
  }

  if (searchInput) {
    searchInput.addEventListener("focus", (e) => {
      // focus는 단순히 UI만 띄움 (새 세션 강제는 "다시 누르는 순간"에만)
      e.stopPropagation();
      openSearchUI();
    });

    // ✅ "다시 누르는 순간"을 확실히 잡기 위해 pointerdown/touchstart에서 새 세션 리셋
    searchInput.addEventListener("pointerdown", resetToNewSessionOnSearchTap);
    searchInput.addEventListener("touchstart", resetToNewSessionOnSearchTap);

    // click은 일부 브라우저에서 pointerdown 뒤에 오므로(중복) 가드가 막아준다
    searchInput.addEventListener("click", resetToNewSessionOnSearchTap);

    searchInput.addEventListener("input", (e) => {
      e.stopPropagation();
      runSearch();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        // ✅ 1단계: Enter 완전 비활성화
        e.preventDefault();
        e.stopPropagation();
        try {
          searchInput.blur();
        } catch (_) {}
        return;
      } else if (e.key === "Escape") {
        hideSearchOverlay();
      }
    });
  }

  if (searchOverlay) {
    // 오버레이 내부 조작 중에는 window scroll reset을 잠깐 막는다
    const markOverlayInteract = () => {
      lastOverlayInteractAt = Date.now();
    };

    searchOverlay.addEventListener("click", (e) => {
      e.stopPropagation();
      markOverlayInteract();
    });
    searchOverlay.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      markOverlayInteract();
    });
    searchOverlay.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      markOverlayInteract();
    });

    if (soList) {
      soList.addEventListener("pointerdown", markOverlayInteract);
      soList.addEventListener("touchstart", markOverlayInteract);
    }
  }

  // --- 핵심 수정 2: "본문 터치/클릭" 순간에도 1회용 세션을 무조건 종료(reset) ---
  function shouldResetSearchByOutsideInteraction(target) {
    const hasQuery = searchInput && normalizeText(searchInput.value).length > 0;
    const overlayOpen = searchOverlay && isOpen(searchOverlay);
    const filterOn = !!activeReasoningLabel;

    const searchSessionActive = didEverSearch || hasQuery || overlayOpen || filterOn;
    if (!searchSessionActive) return false;

    const clickedInsideOverlay = searchOverlay && searchOverlay.contains(target);
    const clickedInput = searchInput && searchInput.contains(target);

    if (clickedInsideOverlay || clickedInput) return false;
    return true;
  }

  function isClickOnResultLink(e) {
    if (!soList) return null;
    const link = e.target && e.target.closest ? e.target.closest("a.so-item") : null;
    if (link && soList.contains(link)) return link;
    return null;
  }

  document.addEventListener("click", (e) => {
    const resLink = isClickOnResultLink(e);
    if (resLink) {
      resetSearchState();
      return;
    }

    if (shouldResetSearchByOutsideInteraction(e.target)) {
      resetSearchState();
      return;
    }

    if (sectionOverlay && isOpen(sectionOverlay)) {
      const clickedInsideMenu = sectionOverlay.contains(e.target);
      const clickedToggleBtn = btnSection && btnSection.contains(e.target);
      if (!clickedInsideMenu && !clickedToggleBtn) setOpen(sectionOverlay, false);
    }

    if (searchOverlay && isOpen(searchOverlay)) {
      const clickedInsideOverlay = searchOverlay.contains(e.target);
      const clickedInput = searchInput && searchInput.contains(e.target);
      if (!clickedInsideOverlay && !clickedInput) setOpen(searchOverlay, false);
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (shouldResetSearchByOutsideInteraction(e.target)) {
      resetSearchState();
    }
  });

  document.addEventListener("touchstart", (e) => {
    if (shouldResetSearchByOutsideInteraction(e.target)) {
      resetSearchState();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  // --- 핵심 수정 3: 본문 스크롤하면 무조건 reset (단, 오버레이 내부 스크롤은 보호) ---
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY || 0;
      const moved = Math.abs(y - lastScrollY) > 2;
      lastScrollY = y;

      if (!moved) return;
      if (Date.now() - lastOverlayInteractAt < 400) return;

      const hasQuery = searchInput && normalizeText(searchInput.value).length > 0;
      const overlayOpen = searchOverlay && isOpen(searchOverlay);
      const filterOn = !!activeReasoningLabel;

      if (hasQuery || overlayOpen || filterOn || didEverSearch) {
        resetSearchState();
      }
    },
    { passive: true }
  );

  function reflowIfOpen() {
    if (isOpen(sectionOverlay)) {
      requestAnimationFrame(() => layoutSectionOverlay());
      setTimeout(() => layoutSectionOverlay(), 50);
    }
    if (isOpen(searchOverlay)) {
      requestAnimationFrame(() => layoutSearchOverlay());
      setTimeout(() => layoutSearchOverlay(), 50);
    }
  }

  window.addEventListener("resize", reflowIfOpen);
  window.addEventListener("orientationchange", reflowIfOpen);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", reflowIfOpen);
    window.visualViewport.addEventListener("scroll", reflowIfOpen);
  }
})();
