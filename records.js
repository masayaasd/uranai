(function () {
  "use strict";

  const COLUMNS = [
    ["lineName", "LINE名"],
    ["tags", "タグ"],
    ["entry", "流入"],
    ["mainTypeName", "診断タイプ"],
    ["ageRange", "年代"],
    ["prefecture", "都道府県"],
    ["mainConcern", "悩み"],
    ["incomeRange", "年収"],
    ["freeNote", "自由記入"],
    ["completedAt", "完了日時"],
    ["lineUserId", "LINE userId"],
    ["friendId", "友だちID"],
    ["refCode", "refCode"],
    ["nickname", "ニックネーム"],
    ["birthdate", "生年月日"],
    ["gender", "性別"],
    ["occupation", "職業"],
    ["familyStructure", "家族構成"],
    ["interestTheme", "興味テーマ"],
    ["buyingIntent", "鑑定興味"],
    ["subLabel", "詳細タイプ"],
    ["createdAt", "友だち作成日時"],
    ["updatedAt", "友だち更新日時"]
  ];

  const elements = {
    key: document.getElementById("adminKey"),
    search: document.getElementById("searchText"),
    limit: document.getElementById("limitSelect"),
    load: document.getElementById("loadButton"),
    csv: document.getElementById("csvButton"),
    prev: document.getElementById("prevButton"),
    next: document.getElementById("nextButton"),
    status: document.getElementById("statusText"),
    body: document.getElementById("recordsBody")
  };

  let offset = 0;
  let lastItems = [];
  let total = 0;

  elements.key.value = localStorage.getItem("ryujin_records_admin_key") || "";
  elements.load.addEventListener("click", () => loadRecords(0));
  elements.csv.addEventListener("click", downloadCsv);
  elements.prev.addEventListener("click", () => loadRecords(Math.max(0, offset - currentLimit())));
  elements.next.addEventListener("click", () => loadRecords(offset + currentLimit()));
  elements.search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadRecords(0);
  });

  async function loadRecords(nextOffset) {
    const adminKey = elements.key.value.trim();
    if (!adminKey) {
      setStatus("閲覧キーを入力してください。", true);
      return;
    }

    localStorage.setItem("ryujin_records_admin_key", adminKey);
    offset = nextOffset;
    setStatus("読み込み中...");
    elements.load.disabled = true;

    try {
      const params = new URLSearchParams({
        limit: String(currentLimit()),
        offset: String(offset)
      });
      const search = elements.search.value.trim();
      if (search) params.set("search", search);

      const response = await fetch(`/api/diagnosis-records?${params.toString()}`, {
        headers: { "X-Admin-Key": adminKey }
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      lastItems = payload.data.items || [];
      total = payload.data.total || lastItems.length;
      renderRows(lastItems);
      updatePager(Boolean(payload.data.hasNextPage));
      setStatus(`${total}件中 ${offset + 1}〜${offset + lastItems.length}件を表示`);
    } catch (error) {
      lastItems = [];
      renderRows([]);
      updatePager(false);
      setStatus(`読み込みに失敗しました: ${error.message}`, true);
    } finally {
      elements.load.disabled = false;
    }
  }

  function renderRows(items) {
    if (!items.length) {
      elements.body.innerHTML = `<tr><td colspan="12" class="empty-cell">表示できるデータがありません。</td></tr>`;
      return;
    }

    elements.body.innerHTML = items.map((item) => `
      <tr>
        <td>${lineNameHtml(item)}</td>
        <td>${tagsHtml(item.tags)}</td>
        <td>${escapeHtml(item.entry || item.refCode || "")}</td>
        <td>${escapeHtml(item.mainTypeName || diagnosisTypeFromTags(item.tags))}</td>
        <td>${escapeHtml(item.ageRange || tagByPattern(item.tags, /代$/))}</td>
        <td>${escapeHtml(item.prefecture || tagByPattern(item.tags, /(都|道|府|県)$/))}</td>
        <td>${escapeHtml(item.mainConcern || concernFromTags(item.tags))}</td>
        <td>${escapeHtml(item.incomeRange || "")}</td>
        <td class="note-cell">${escapeHtml(item.freeNote || "")}</td>
        <td>${escapeHtml(formatDate(item.completedAt))}</td>
        <td class="mono">${escapeHtml(item.lineUserId)}</td>
        <td class="mono">${escapeHtml(item.friendId)}</td>
      </tr>
    `).join("");
  }

  function lineNameHtml(item) {
    const image = item.pictureUrl
      ? `<img src="${escapeAttr(item.pictureUrl)}" alt="">`
      : `<span class="avatar-placeholder"></span>`;
    const name = escapeHtml(item.lineName || "(名前なし)");
    const follow = item.isFollowing ? "友だち" : "ブロック/不明";
    return `
      <div class="line-name">
        ${image}
        <div>
          <strong>${name}</strong>
          <span>${escapeHtml(follow)}</span>
        </div>
      </div>
    `;
  }

  function tagsHtml(tags) {
    if (!Array.isArray(tags) || !tags.length) return "";
    return `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
  }

  function diagnosisTypeFromTags(tags) {
    return tagByPattern(tags, /(白龍|緑龍|月龍|金龍)タイプ/);
  }

  function concernFromTags(tags) {
    return tagByPattern(tags, /(不安|希望|家族|相談)/);
  }

  function tagByPattern(tags, pattern) {
    if (!Array.isArray(tags)) return "";
    return tags.find((tag) => pattern.test(tag)) || "";
  }

  function updatePager(hasNextPage) {
    elements.prev.disabled = offset <= 0;
    elements.next.disabled = !hasNextPage;
  }

  function currentLimit() {
    return Number(elements.limit.value || 100);
  }

  function setStatus(text, isError = false) {
    elements.status.textContent = text;
    elements.status.classList.toggle("is-error", isError);
  }

  function downloadCsv() {
    if (!lastItems.length) {
      setStatus("CSV出力できるデータがありません。", true);
      return;
    }

    const rows = [COLUMNS.map(([, label]) => csvCell(label)).join(",")].concat(
      lastItems.map((item) => COLUMNS.map(([key]) => csvCell(csvValue(item, key))).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `line-diagnosis-records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvValue(item, key) {
    const value = item[key];
    if (Array.isArray(value)) return value.join("|");
    return value || "";
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
