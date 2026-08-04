/* ============================================================
 * 作品集 · 灵感素材库（纯前端 / localStorage: hannah_pf_insp）
 * 每条碎片：标题（可选）/ 正文 / 分类 / 标签[] / 参考图片
 * 支持：增删改查、搜索、按分类筛选、按标签筛选、图片上传。
 * 与「灵感」模块（外部灵感流）相互独立，这里是用户自己沉淀的素材库。
 * ============================================================ */
(function () {
  'use strict';
  const U = window.PFUtil;
  const KEY = U.K.INSP;

  // 默认分类（参考思维导图灵感区，可自由扩展）
  const CATS = ['参考游戏/影视/书籍', '参考图片', '音乐/音效', '好词好句', '随机灵感/脑洞', '未分类'];

  const ui = { search: '', cat: 'all', tags: new Set() };

  function getAll() { return U.load(KEY, []); }
  function saveAll(list) { U.save(KEY, list); }
  function getById(id) { return getAll().find(x => x.id === id) || null; }

  // 解析标签输入：支持中英文逗号、顿号、空格分隔
  function parseTags(str) {
    if (!str) return [];
    return str.split(/[,，、\s]+/).map(t => t.trim()).filter(Boolean);
  }
  function allTags() {
    const map = {};
    getAll().forEach(x => (x.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
    return Object.keys(map).sort((a, b) => map[b] - map[a]);
  }

  // ---------- 渲染 ----------
  function render() {
    const root = document.getElementById('pfPanelInsp');
    if (!root) return;
    const list = getAll();
    const total = list.length;

    // 过滤
    let view = list.slice();
    if (ui.cat !== 'all') view = view.filter(x => (x.category || '未分类') === ui.cat);
    if (ui.tags.size) {
      view = view.filter(x => (x.tags || []).some(t => ui.tags.has(t)));
    }
    if (ui.search.trim()) {
      const q = ui.search.trim().toLowerCase();
      view = view.filter(x =>
        (x.title || '').toLowerCase().includes(q) ||
        (x.content || '').toLowerCase().includes(q) ||
        (x.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    view = view.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // 分类 chips
    const catChips = ['<button class="filter-chip ' + (ui.cat === 'all' ? 'selected' : '') + '" data-cat="all">全部 ' + total + '</button>']
      .concat(CATS.map(c => {
        const n = list.filter(x => (x.category || '未分类') === c).length;
        if (!n && ui.cat !== c) return '';
        return '<button class="filter-chip ' + (ui.cat === c ? 'selected' : '') + '" data-cat="' + U.esc(c) + '">' + U.esc(c) + ' ' + n + '</button>';
      })).join('');

    // 标签 chips
    const tags = allTags();
    const tagChips = tags.length
      ? tags.map(t => '<button class="filter-chip ' + (ui.tags.has(t) ? 'selected' : '') + '" data-tag="' + U.esc(t) + '">#' + U.esc(t) + ' ' + mapCount(t) + '</button>').join('')
      : '<span style="color:var(--text-mid);font-size:12px;">暂无标签</span>';
    function mapCount(t) { return list.filter(x => (x.tags || []).includes(t)).length; }

    root.innerHTML = `
      <div class="pf-toolbar">
        <div class="pf-toolbar-left">
          <div class="pf-stat"><span class="pf-stat-num">${total}</span><span class="pf-stat-label">条碎片</span></div>
        </div>
        <div class="pf-toolbar-right">
          <div class="pf-search">
            <span class="pf-search-icon">🔍</span>
            <input class="pf-search-input" id="inspSearch" placeholder="搜索标题 / 正文 / 标签" value="${U.esc(ui.search)}">
          </div>
          <button class="btn primary btn-sm" id="inspAddBtn">＋ 新增碎片</button>
        </div>
      </div>
      <div class="pf-filter-row">${catChips}</div>
      <div class="pf-filter-row pf-tag-row">
        <span class="pf-filter-label">标签：</span>${tagChips}
        ${ui.tags.size ? '<button class="btn btn-sm" id="inspClearTags">清除标签筛选</button>' : ''}
      </div>
      <div class="frag-grid" id="inspGrid">
        ${view.length ? view.map(fragCard).join('') : U.emptyHTML('💡', '还没有灵感碎片，点「＋ 新增碎片」收藏第一个脑洞吧～')}
      </div>
    `;

    document.getElementById('inspSearch').oninput = (e) => { ui.search = e.target.value; render(); };
    document.getElementById('inspAddBtn').onclick = () => openForm(null);
    const clearBtn = document.getElementById('inspClearTags');
    if (clearBtn) clearBtn.onclick = () => { ui.tags = new Set(); render(); };
    root.querySelectorAll('.filter-chip[data-cat]').forEach(ch => {
      ch.onclick = () => { ui.cat = ch.dataset.cat; render(); };
    });
    root.querySelectorAll('.filter-chip[data-tag]').forEach(ch => {
      ch.onclick = () => {
        const t = ch.dataset.tag;
        if (ui.tags.has(t)) ui.tags.delete(t); else ui.tags.add(t);
        render();
      };
    });
    root.querySelectorAll('.frag-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.frag-open').onclick = (e) => { e.stopPropagation(); openForm(id); };
      card.querySelector('.frag-del').onclick = (e) => {
        e.stopPropagation();
        const x = getById(id);
        U.confirmDelete(x ? (x.title || '该碎片') : '该碎片', () => { saveAll(getAll().filter(y => y.id !== id)); toast('✓ 已删除'); render(); });
      };
    });
  }

  function fragCard(x) {
    const thumb = x.image ? '<div class="frag-thumb" style="background-image:url(' + x.image + ')"></div>' : '';
    const cat = x.category || '未分类';
    const content = U.esc((x.content || '').slice(0, 120)) + ((x.content || '').length > 120 ? '…' : '');
    const tags = (x.tags || []).map(t => '<span class="frag-tag">#' + U.esc(t) + '</span>').join('');
    return `
      <div class="frag-card" data-id="${x.id}">
        ${thumb}
        <div class="frag-body">
          <div class="frag-head">
            <span class="frag-title">${U.esc(x.title || '（无标题）')}</span>
            <span class="frag-cat">${U.esc(cat)}</span>
          </div>
          ${content ? '<div class="frag-content">' + content + '</div>' : ''}
          ${tags ? '<div class="frag-tags">' + tags + '</div>' : ''}
        </div>
        <div class="frag-actions">
          <button class="btn btn-sm frag-open">编辑</button>
          <button class="btn btn-sm danger frag-del">删除</button>
        </div>
      </div>`;
  }

  // ---------- 新增 / 编辑 ----------
  function openForm(idOrObj) {
    const existing = (typeof idOrObj === 'string') ? getById(idOrObj) : (idOrObj || null);
    const isEdit = !!existing;
    let imgData = existing ? (existing.image || null) : null;
    const v = existing || {};
    const catVal = v.category || '未分类';

    const formHTML = `
      <div class="pf-form-2col">
        <div class="modal-field">
          <label class="modal-label">标题（可选）</label>
          <input class="modal-input" id="inspTitle" value="${U.esc(v.title || '')}" placeholder="一句话概括这个灵感">
        </div>
        <div class="modal-field">
          <label class="modal-label">分类</label>
          <select class="modal-select" id="inspCat">
            ${CATS.map(c => '<option value="' + U.esc(c) + '"' + (catVal === c ? ' selected' : '') + '>' + U.esc(c) + '</option>').join('')}
          </select>
        </div>
      </div>
      <div class="modal-field">
        <label class="modal-label">标签（用逗号分隔，如：赛博朋克, 城市, 雨夜）</label>
        <input class="modal-input" id="inspTags" value="${U.esc((v.tags || []).join(', '))}" placeholder="标签1, 标签2">
      </div>
      <div class="modal-field">
        <label class="modal-label">正文</label>
        <textarea class="modal-textarea" id="inspContent" placeholder="写下你的灵感、摘抄、设定点子…">${U.esc(v.content || '')}</textarea>
      </div>
      ${U.imageFieldHTML('inspImg', imgData)}
    `;

    showModal(isEdit ? '编辑碎片' : '新增灵感碎片', formHTML, () => {
      const now = new Date().toISOString();
      const data = {
        title: document.getElementById('inspTitle').value.trim(),
        category: document.getElementById('inspCat').value,
        tags: parseTags(document.getElementById('inspTags').value),
        content: document.getElementById('inspContent').value.trim(),
        image: imgData
      };
      if (isEdit) {
        const list = getAll();
        const idx = list.findIndex(x => x.id === existing.id);
        list[idx] = Object.assign({}, existing, data, { updatedAt: now });
        saveAll(list); toast('✓ 已保存');
      } else {
        data.id = U.uid();
        data.createdAt = now;
        data.updatedAt = now;
        const list = getAll(); list.push(data); saveAll(list);
        if (window.awardEnergy) window.awardEnergy('portfolio_add');
        toast('✓ 已添加');
      }
      render();
    });

    U.bindImagePicker('inspImg', (d) => { imgData = d; });
  }

  // ---------- 对外 API ----------
  window.PFInsp = {
    render,
    api: {
      list: getAll,
      allTags,
      add(data) {
        const now = new Date().toISOString();
        const item = Object.assign({ id: U.uid(), createdAt: now, updatedAt: now }, data);
        const list = getAll(); list.push(item); saveAll(list); return item;
      },
      update(id, patch) {
        const list = getAll(); const i = list.findIndex(x => x.id === id);
        if (i < 0) return null;
        list[i] = Object.assign({}, list[i], patch, { updatedAt: new Date().toISOString() });
        saveAll(list); return list[i];
      },
      remove(id) { saveAll(getAll().filter(x => x.id !== id)); }
    }
  };
})();
