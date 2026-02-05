(function () {
  // =========================
  // Helpers
  // =========================
  function qs(sel) { return document.querySelector(sel); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function clearOverlayInlineStyle(overlayEl) {
    if (!overlayEl) return;
    overlayEl.style.left = "";
    overlayEl.style.top = "";
    overlayEl.style.width = "";
    overlayEl.style.maxHeight = "";
  }

  function setOverlayRect(overlayEl, anchorEl) {
    if (!overlayEl || !anchorEl) return;

    var r = anchorEl.getBoundingClientRect();
    var left = Math.round(r.left);
    var top = Math.round(r.bottom);
    var width = Math.round(r.width);

    overlayEl.style.left = left + "px";
    overlayEl.style.top = top + "px";
    overlayEl.style.width = width + "px";

    var maxH = window.innerHeight - top - 8;
    overlayEl.style.maxHeight = clamp(maxH, 140, 520) + "px";
  }

  function openOverlay(overlayEl, anchorEl) {
    if (!overlayEl) return;
    setOverlayRect(overlayEl, anchorEl);
    overlayEl.classList.add("is-open");
    overlayEl.setAttribute("aria-hidden", "false");
  }

  function closeOverlay(overlayEl) {
    if (!overlayEl) return;
    overlayEl.classList.remove("is-open");
    overlayEl.setAttribute("aria-hidden", "true");
  }

  function isClickOutside(e, boxEls) {
    for (var i = 0; i < boxEls.length; i++) {
      var el = boxEls[i];
      if (el && el.contains(e.target)) return false;
    }
    return true;
  }

  // =========================
  // Main
  // =========================
  document.addEventListener("DOMContentLoaded", function () {
    // ----- Section overlay -----
    var sectionCell = qs("#sectionCell");
    var sectionBtn = qs("#sectionToggleBtn");
    var sectionOverlay = qs("#sectionOverlay");

    // ----- Search overlay -----
    var searchCell = qs("#searchCell");
    var searchInput = qs("#searchInput");
    var searchOverlay = qs("#searchOverlay");
    var headEl = qs("#searchOverlayHead");
    var listEl = qs("#searchOverlayList");

    var indexCache = null;
    var indexLoading = null;

    function fetchIndexOnce() {
      if (indexCache) return Promise.resolve(indexCache);
      if (indexLoading) return indexLoading;

      indexLoading = fetch("/index.json", { cache: "no-store" })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          indexCache = Array.isArray(data) ? data : [];
          return indexCache;
        })
        .catch(function () {
          indexCache = [];
          return indexCache;
        });

      return indexLoading;
    }

    function renderResults(q, items) {
      if (!listEl) return;

      listEl.innerHTML = "";

      var query = (q || "").trim().toLowerCase();
      if (!query) {
        if (headEl) headEl.textContent = "Search";
        return;
      }

      var results = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        var title = (it.title || "").toString();
        var summary = (it.summary || it.description || "").toString();
        var content = (it.content || "").toString();
        var href = (it.permalink || it.relpermalink || it.url || "").toString();

        var hay = (title + " " + summary + " " + content).toLowerCase();
        if (hay.indexOf(query) !== -1 && href) {
          results.push({ title: title, summary: summary, href: href });
        }
      }

      if (headEl) headEl.textContent = "Results: " + results.length;

      var limit = 30;
      for (var j = 0; j < results.length && j < limit; j++) {
        var r = results[j];

        var a = document.createElement("a");
        a.className = "so-item";
        a.href = r.href;

        var t = document.createElement("div");
        t.className = "so-title";
        t.textContent = r.title || "(no title)";

        var s = document.createElement("div");
        s.className = "so-sub";
        s.textContent = r.summary ? r.summary : r.href;

        a.appendChild(t);
        a.appendChild(s);
        listEl.appendChild(a);
      }
    }

    // =========================
    // 강제 리셋(핵심)
    // =========================
    function hardResetUI() {
      // 1) 섹션 닫기 + 상태정리
      if (sectionOverlay) closeOverlay(sectionOverlay);
      if (sectionBtn) sectionBtn.setAttribute("aria-expanded", "false");
      clearOverlayInlineStyle(sectionOverlay);

      // 2) 검색 닫기 + 상태정리
      if (searchOverlay) closeOverlay(searchOverlay);
      if (searchInput) searchInput.setAttribute("aria-expanded", "false");
      clearOverlayInlineStyle(searchOverlay);

      // 3) 검색 결과/헤더 초기화
      if (listEl) listEl.innerHTML = "";
      if (headEl) headEl.textContent = "Search";
    }

    function showSearchOverlay() {
      if (!searchOverlay || !searchInput) return;
      openOverlay(searchOverlay, searchCell || searchInput);
      searchInput.setAttribute("aria-expanded", "true");
    }

    function hideSearchOverlay() {
      if (!searchOverlay || !searchInput) return;
      closeOverlay(searchOverlay);
      searchInput.setAttribute("aria-expanded", "false");
      clearOverlayInlineStyle(searchOverlay);
    }

    // ----- Section toggle -----
    if (sectionBtn && sectionOverlay) {
      sectionBtn.addEventListener("click", function () {
        // 섹션 열기 전에 검색이 열려있으면 닫아준다(충돌 방지)
        if (searchOverlay && searchOverlay.classList.contains("is-open")) {
          hideSearchOverlay();
        }

        var isOpen = sectionOverlay.classList.contains("is-open");
        if (isOpen) {
          closeOverlay(sectionOverlay);
          sectionBtn.setAttribute("aria-expanded", "false");
          clearOverlayInlineStyle(sectionOverlay);
        } else {
          openOverlay(sectionOverlay, sectionCell || sectionBtn);
          sectionBtn.setAttribute("aria-expanded", "true");
        }
      });
    }

    // ----- Search behaviors -----
    if (searchInput && searchOverlay) {
      // 모바일에서 “터치 순간”에 먼저 리셋되게 (focus보다 앞서 실행되는 경우 많음)
      searchInput.addEventListener("pointerdown", function () {
        hardResetUI();
      });

      // 포커스될 때도 확실하게 1번 더 리셋
      searchInput.addEventListener("focus", function () {
        hardResetUI();
        showSearchOverlay();
        fetchIndexOnce().then(function (items) {
          renderResults(searchInput.value, items);
        });
      });

      searchInput.addEventListener("input", function () {
        showSearchOverlay();
        fetchIndexOnce().then(function (items) {
          renderResults(searchInput.value, items);
        });
      });

      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          hideSearchOverlay();
          searchInput.blur();
        }
      });
    }

    // ----- Reposition on resize -----
    window.addEventListener("resize", function () {
      if (sectionOverlay && sectionOverlay.classList.contains("is-open")) {
        openOverlay(sectionOverlay, sectionCell || sectionBtn);
      }
      if (searchOverlay && searchOverlay.classList.contains("is-open")) {
        openOverlay(searchOverlay, searchCell || searchInput);
      }
    });

    // ----- Close on outside click -----
    document.addEventListener("click", function (e) {
      if (sectionOverlay && sectionOverlay.classList.contains("is-open")) {
        if (isClickOutside(e, [sectionCell, sectionOverlay])) {
          closeOverlay(sectionOverlay);
          if (sectionBtn) sectionBtn.setAttribute("aria-expanded", "false");
          clearOverlayInlineStyle(sectionOverlay);
        }
      }

      if (searchOverlay && searchOverlay.classList.contains("is-open")) {
        if (isClickOutside(e, [searchCell, searchOverlay])) {
          hideSearchOverlay();
        }
      }
    });

    // ----- Escape closes all -----
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;

      if (sectionOverlay && sectionOverlay.classList.contains("is-open")) {
        closeOverlay(sectionOverlay);
        if (sectionBtn) sectionBtn.setAttribute("aria-expanded", "false");
        clearOverlayInlineStyle(sectionOverlay);
      }
      if (searchOverlay && searchOverlay.classList.contains("is-open")) {
        hideSearchOverlay();
      }
    });
  });
})();
