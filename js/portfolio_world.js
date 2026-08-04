/* ============================================================
 * 作品集 · 世界观设定（纯前端 / localStorage: hannah_pf_world）
 * 结构：{ geography:[], race:[], faction:[], history:[] }
 * 每个分类下可添加条目，支持 富文本编辑 + 图片上传。
 * 分类：地理设定 / 种族设定 / 势力设定 / 历史设定
 * ============================================================ */
(function () {
  'use strict';
  const U = window.PFUtil;
  const KEY = U.K.WORLD;

  const CATS = [
    { key: 'geography', label: '🌍 地理设定' },
    { key: 'race',      label: '👥 种族设定' },
    { key: 'faction',   label: '⚔️ 势力设定' },
    { key: 'history',   label: '📜 历史设定' }
  ];
  const CAT_LABEL = {}; CATS.forEach(c => CAT_LABEL[c.key] = c.label);

  // 模块内 UI 状态
  const ui = { cat: 'geography', search: '' };

  function getAll() {
    const d = U.load(KEY, {});
    return { geography: [], race: [], faction: [], history: [], ...d };
  }
  function saveAll(obj) { U.save(KEY, obj); }

  function catList(cat) { return getAll()[cat] || []; }

  // 富文本转纯文本（用于列表预览）
  function rtToText(html) {
    if (!html) return '';
    return String(html)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------- 渲染 ----------
  function render() {
    const root = document.getElementById('pfPanelWorld');
    if (!root) return;
    const data = getAll();
    const total = CATS.reduce((s, c) => s + (data[c.key] || []).length, 0);
    const cur = catList(ui.cat);

    // 搜索过滤
    let view = cur;
    if (ui.search.trim()) {
      const q = ui.search.trim().toLowerCase();
      view = cur.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.subType || '').toLowerCase().includes(q) ||
        rtToText(e.richText).toLowerCase().includes(q));
    }
    view = view.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    // 分类 Tab
    const catTabs = CATS.map(c => {
      const n = (data[c.key] || []).length;
      const sel = c.key === ui.cat ? 'selected' : '';
      return '<button class="filter-chip ' + sel + '" data-cat="' + c.key + '">' + c.label.split(' ')[1] + ' <span class="chip-count">' + n + '</span></button>';
    }).join('');

    root.innerHTML = `
      <div class="pf-toolbar">
        <div class="pf-toolbar-left">
          <div class="pf-stat"><span class="pf-stat-num">${total}</span><span class="pf-stat-label">条设定</span></div>
        </div>
        <div class="pf-toolbar-right">
          <div class="pf-search">
            <span class="pf-search-icon">🔍</span>
            <input class="pf-search-input" id="worldSearch" placeholder="搜索标题 / 内容" value="${U.esc(ui.search)}">
          </div>
          <button class="btn primary btn-sm" id="worldAddBtn">＋ 新增条目</button>
        </div>
      </div>
      <div class="pf-filter-row">${catTabs}</div>
      <div class="world-list" id="worldList">
        ${view.length ? view.map(entryCard).join('') : U.emptyHTML('🌍', '「' + CAT_LABEL[ui.cat].split(' ')[1] + '」还没有条目，点「＋ 新增条目」开始构建你的世界吧～')}
      </div>
    `;

    document.getElementById('worldSearch').oninput = (e) => { ui.search = e.target.value; render(); };
    document.getElementById('worldAddBtn').onclick = () => openForm(null);
    root.querySelectorAll('.filter-chip[data-cat]').forEach(ch => {
      ch.onclick = () => { ui.cat = ch.dataset.cat; ui.search = ''; render(); };
    });
    root.querySelectorAll('.world-entry').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.world-open').onclick = (e) => { e.stopPropagation(); openForm(id); };
      card.querySelector('.world-del').onclick = (e) => {
        e.stopPropagation();
        const item = catList(ui.cat).find(x => x.id === id);
        U.confirmDelete(item ? item.title : '该条目', () => {
          const d = getAll(); d[ui.cat] = d[ui.cat].filter(x => x.id !== id);
          saveAll(d); toast('✓ 已删除'); render();
        });
      };
    });
  }

  function entryCard(e) {
    const text = rtToText(e.richText);
    const clip = text.length > 80 ? U.esc(text.slice(0, 80)) + '…' : U.esc(text);
    const sub = e.subType ? '<span class="world-sub">' + U.esc(e.subType) + '</span>' : '';
    const thumb = e.image ? '<div class="world-thumb" style="background-image:url(' + e.image + ')"></div>' : '';
    return `
      <div class="world-entry" data-id="${e.id}">
        ${thumb}
        <div class="world-entry-body">
          <div class="world-entry-title">${U.esc(e.title || '未命名条目')} ${sub}</div>
          <div class="world-entry-preview">${clip || '<span class="world-empty">（空内容）</span>'}</div>
        </div>
        <div class="world-entry-actions">
          <button class="btn btn-sm world-open">编辑</button>
          <button class="btn btn-sm danger world-del">删除</button>
        </div>
      </div>`;
  }

  // ---------- 新增 / 编辑 ----------
  const RT_ID = 'worldRT';
  function openForm(idOrObj) {
    const existing = (typeof idOrObj === 'string')
      ? catList(ui.cat).find(e => e.id === idOrObj) : (idOrObj || null);
    const isEdit = !!existing;
    let imgData = existing ? (existing.image || null) : null;

    const v = existing || {};
    const formHTML = `
      <div class="pf-form-2col">
        <div class="modal-field">
          <label class="modal-label">所属分类</label>
          <select class="modal-select" id="worldCat">
            ${CATS.map(c => '<option value="' + c.key + '"' + ((v.category || ui.cat) === c.key ? ' selected' : '') + '>' + U.esc(c.label) + '</option>').join('')}
          </select>
        </div>
        <div class="modal-field">
          <label class="modal-label">子类型（可选）</label>
          <input class="modal-input" id="worldSub" value="${U.esc(v.subType || '')}" placeholder="如：大陆 / 城市 / 秘境 / 纪元">
        </div>
      </div>
      <div class="modal-field">
        <label class="modal-label">标题 *</label>
        <input class="modal-input" id="worldTitle" value="${U.esc(v.title || '')}" placeholder="例如：星陨大陆 / 精灵族 / 暗影教团">
      </div>
      <div class="modal-field">
        <label class="modal-label">内容（富文本）</label>
        ${U.richTextHTML(RT_ID, v.richText || '')}
      </div>
      ${U.imageFieldHTML('worldImg', imgData)}
    `;

    showModal(isEdit ? '编辑条目' : '新增条目', formHTML, () => {
      const title = document.getElementById('worldTitle').value.trim();
      if (!title) { toast('请填写标题'); return false; }
      const cat = document.getElementById('worldCat').value;
      const now = new Date().toISOString();
      const html = U.sanitize(U.getRichText(RT_ID));
      const payload = {
        title,
        category: cat,
        subType: document.getElementById('worldSub').value.trim(),
        richText: html,
        image: imgData
      };
      const d = getAll();
      if (isEdit) {
        // 若分类改变，从原分类移除
        if (existing.category && existing.category !== cat) {
          d[existing.category] = (d[existing.category] || []).filter(x => x.id !== existing.id);
        }
        const arr = d[cat] || (d[cat] = []);
        const idx = arr.findIndex(x => x.id === existing.id);
        if (idx >= 0) arr[idx] = Object.assign({}, existing, payload, { updatedAt: now });
        else arr.unshift(Object.assign({ id: existing.id, createdAt: existing.createdAt || now }, payload, { updatedAt: now }));
        saveAll(d);
        toast('✓ 已保存');
      } else {
        const item = Object.assign({ id: U.uid(), createdAt: now, updatedAt: now }, payload);
        (d[cat] = d[cat] || []).unshift(item);
        saveAll(d);
        if (window.awardEnergy) window.awardEnergy('portfolio_add');
        toast('✓ 已添加');
      }
      render();
    });

    U.initRichText(RT_ID);
    U.bindImagePicker('worldImg', (d) => { imgData = d; });
  }

  // ---------- 对外 API ----------
  window.PFWorld = {
    render,
    api: {
      getAll,
      list(cat) { return catList(cat); },
      add(cat, data) {
        const d = getAll(); const now = new Date().toISOString();
        const item = Object.assign({ id: U.uid(), category: cat, createdAt: now, updatedAt: now }, data);
        (d[cat] = d[cat] || []).unshift(item); saveAll(d); return item;
      },
      update(id, patch) {
        const d = getAll();
        for (const k of Object.keys(d)) {
          const i = d[k].findIndex(x => x.id === id);
          if (i >= 0) { d[k][i] = Object.assign({}, d[k][i], patch, { updatedAt: new Date().toISOString() }); saveAll(d); return d[k][i]; }
        }
        return null;
      },
      remove(id) {
        const d = getAll();
        for (const k of Object.keys(d)) d[k] = d[k].filter(x => x.id !== id);
        saveAll(d);
      }
    }
  };
})();
