/* ============================================================
 * 作品集 · 人物库（纯前端 / localStorage: hannah_pf_chars）
 * 字段：姓名* / 种族 / 身份 / 分组 / 外貌 / 性格 / 背景故事 /
 *       能力 / 人物关系 / 备注 / 参考图片
 * 支持：增 / 删 / 改 / 查、搜索、按分组筛选、参考图上传（自动压缩）
 * ============================================================ */
(function () {
  'use strict';
  const U = window.PFUtil;
  const KEY = U.K.CHARS;
  const GROUPS = ['主角团', '重要NPC', '配角路人'];

  // 模块内 UI 状态
  const ui = { search: '', group: 'all' };

  function getAll() { return U.load(KEY, []); }
  function saveAll(list) { U.save(KEY, list); }

  function getById(id) { return getAll().find(c => c.id === id) || null; }

  // ---------- 渲染 ----------
  function render() {
    const root = document.getElementById('pfPanelChars');
    if (!root) return;
    const list = getAll();

    // 统计
    const total = list.length;
    const groupCount = {};
    GROUPS.forEach(g => groupCount[g] = list.filter(c => c.group === g).length);

    // 过滤
    let view = list;
    if (ui.group !== 'all') view = view.filter(c => c.group === ui.group);
    if (ui.search.trim()) {
      const q = ui.search.trim().toLowerCase();
      view = view.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.race || '').toLowerCase().includes(q) ||
        (c.identity || '').toLowerCase().includes(q) ||
        (c.remarks || '').toLowerCase().includes(q));
    }
    view = view.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    // 分组筛选 chips
    const chips = ['<button class="filter-chip ' + (ui.group === 'all' ? 'selected' : '') + '" data-group="all">全部 ' + total + '</button>']
      .concat(GROUPS.map(g =>
        '<button class="filter-chip ' + (ui.group === g ? 'selected' : '') + '" data-group="' + U.esc(g) + '">' +
        U.esc(g) + ' ' + (groupCount[g] || 0) + '</button>'))
      .join('');

    root.innerHTML = `
      <div class="pf-toolbar">
        <div class="pf-toolbar-left">
          <div class="pf-stat"><span class="pf-stat-num">${total}</span><span class="pf-stat-label">位角色</span></div>
        </div>
        <div class="pf-toolbar-right">
          <div class="pf-search">
            <span class="pf-search-icon">🔍</span>
            <input class="pf-search-input" id="charSearch" placeholder="搜索姓名 / 种族 / 身份 / 备注" value="${U.esc(ui.search)}">
          </div>
          <button class="btn primary btn-sm" id="charAddBtn">＋ 新增角色</button>
        </div>
      </div>
      <div class="pf-filter-row">${chips}</div>
      <div class="char-grid" id="charGrid">${view.length ? view.map(charCard).join('') : U.emptyHTML('🧙', '还没有角色，点「＋ 新增角色」创建第一个吧～')}</div>
    `;

    // 事件绑定
    const searchEl = document.getElementById('charSearch');
    if (searchEl) searchEl.oninput = (e) => { ui.search = e.target.value; render(); };
    document.getElementById('charAddBtn').onclick = () => openForm(null);
    root.querySelectorAll('.filter-chip[data-group]').forEach(ch => {
      ch.onclick = () => { ui.group = ch.dataset.group; render(); };
    });
    root.querySelectorAll('.char-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.char-open').onclick = (e) => { e.stopPropagation(); openForm(id); };
      card.querySelector('.char-del').onclick = (e) => {
        e.stopPropagation();
        const c = getById(id);
        U.confirmDelete(c ? c.name : '该角色', () => { saveAll(getAll().filter(x => x.id !== id)); toast('✓ 已删除'); render(); });
      };
    });
  }

  // 角色卡片
  function charCard(c) {
    const initial = (c.name || '?').trim().charAt(0) || '?';
    const avatar = c.image
      ? '<div class="char-avatar" style="background-image:url(' + c.image + ')"></div>'
      : '<div class="char-avatar char-avatar-text">' + U.esc(initial) + '</div>';
    const meta = [c.race, c.identity].filter(Boolean).map(U.esc).join(' · ');
    const groupBadge = c.group ? '<span class="char-group">' + U.esc(c.group) + '</span>' : '';
    const clip = (s, n) => { s = s || ''; return s.length > n ? U.esc(s.slice(0, n)) + '…' : U.esc(s); };
    return `
      <div class="char-card" data-id="${c.id}">
        <div class="char-card-head">
          ${avatar}
          <div class="char-head-info">
            <div class="char-name">${U.esc(c.name || '未命名')}</div>
            <div class="char-meta">${meta || '<span style="color:var(--text-mid)">未填写种族/身份</span>'}</div>
          </div>
          ${groupBadge}
        </div>
        <div class="char-lines">
          <div class="char-line"><span class="char-key">性格</span>${clip(c.personality, 30) || '<span class="char-empty">—</span>'}</div>
          <div class="char-line"><span class="char-key">外貌</span>${clip(c.appearance, 30) || '<span class="char-empty">—</span>'}</div>
        </div>
        <div class="char-card-actions">
          <button class="btn btn-sm char-open">查看 / 编辑</button>
          <button class="btn btn-sm danger char-del">删除</button>
        </div>
      </div>`;
  }

  // ---------- 新增 / 编辑 表单 ----------
  function openForm(idOrObj) {
    const existing = (typeof idOrObj === 'string') ? getById(idOrObj) : (idOrObj || null);
    const isEdit = !!existing;
    let imgData = existing ? (existing.image || null) : null;

    const v = existing || {};
    const formHTML = `
      <div class="modal-field">
        <label class="modal-label">姓名 *</label>
        <input class="modal-input" id="charName" value="${U.esc(v.name || '')}" placeholder="例如：艾莉丝">
      </div>
      <div class="pf-form-2col">
        <div class="modal-field">
          <label class="modal-label">种族</label>
          <input class="modal-input" id="charRace" value="${U.esc(v.race || '')}" placeholder="人类 / 精灵 / 兽人…">
        </div>
        <div class="modal-field">
          <label class="modal-label">身份 / 职业</label>
          <input class="modal-input" id="charIdentity" value="${U.esc(v.identity || '')}" placeholder="例如：流浪剑客">
        </div>
      </div>
      <div class="modal-field">
        <label class="modal-label">分组</label>
        <select class="modal-select" id="charGroup">
          ${GROUPS.map(g => '<option value="' + U.esc(g) + '"' + (v.group === g ? ' selected' : '') + '>' + U.esc(g) + '</option>').join('')}
        </select>
      </div>
      <div class="pf-form-2col">
        <div class="modal-field">
          <label class="modal-label">外貌描写</label>
          <textarea class="modal-textarea" id="charAppearance" placeholder="发色、体型、标志性特征…">${U.esc(v.appearance || '')}</textarea>
        </div>
        <div class="modal-field">
          <label class="modal-label">性格特征</label>
          <textarea class="modal-textarea" id="charPersonality" placeholder="外冷内热、好奇心强…">${U.esc(v.personality || '')}</textarea>
        </div>
      </div>
      <div class="modal-field">
        <label class="modal-label">背景故事</label>
        <textarea class="modal-textarea" id="charBackstory" placeholder="出身、经历、转折…">${U.esc(v.backstory || '')}</textarea>
      </div>
      <div class="pf-form-2col">
        <div class="modal-field">
          <label class="modal-label">能力 / 技能</label>
          <textarea class="modal-textarea" id="charAbility" placeholder="魔法、武艺、特殊天赋…">${U.esc(v.ability || '')}</textarea>
        </div>
        <div class="modal-field">
          <label class="modal-label">人物关系</label>
          <textarea class="modal-textarea" id="charRelations" placeholder="与谁：师徒 / 宿敌 / 恋人…">${U.esc(v.relations || '')}</textarea>
        </div>
      </div>
      <div class="modal-field">
        <label class="modal-label">备注</label>
        <textarea class="modal-textarea" id="charRemarks" placeholder="口头禅、标志性台词、灵感来源…">${U.esc(v.remarks || '')}</textarea>
      </div>
      ${U.imageFieldHTML('charImg', imgData)}
    `;

    showModal(isEdit ? '编辑角色' : '新增角色', formHTML, () => {
      const name = document.getElementById('charName').value.trim();
      if (!name) { toast('请填写姓名'); return false; }
      const now = new Date().toISOString();
      const data = {
        name,
        race: document.getElementById('charRace').value.trim(),
        identity: document.getElementById('charIdentity').value.trim(),
        group: document.getElementById('charGroup').value,
        appearance: document.getElementById('charAppearance').value.trim(),
        personality: document.getElementById('charPersonality').value.trim(),
        backstory: document.getElementById('charBackstory').value.trim(),
        ability: document.getElementById('charAbility').value.trim(),
        relations: document.getElementById('charRelations').value.trim(),
        remarks: document.getElementById('charRemarks').value.trim(),
        image: imgData
      };
      if (isEdit) {
        const list = getAll();
        const idx = list.findIndex(c => c.id === existing.id);
        list[idx] = Object.assign({}, existing, data, { updatedAt: now });
        saveAll(list);
        toast('✓ 已保存');
      } else {
        data.id = U.uid();
        data.createdAt = now;
        data.updatedAt = now;
        const list = getAll();
        list.push(data);
        saveAll(list);
        if (window.awardEnergy) window.awardEnergy('portfolio_add');
        toast('✓ 已添加');
      }
      render();
    });

    // 绑定图片上传（showModal 已把表单写入 DOM）
    U.bindImagePicker('charImg', (d) => { imgData = d; });
  }

  // ---------- 对外 API（供自检脚本与未来扩展） ----------
  window.PFChars = {
    render,
    api: {
      list: getAll,
      get: getById,
      add(data) {
        const now = new Date().toISOString();
        const item = Object.assign({ id: U.uid(), createdAt: now, updatedAt: now }, data);
        const list = getAll(); list.push(item); saveAll(list); return item;
      },
      update(id, patch) {
        const list = getAll(); const i = list.findIndex(c => c.id === id);
        if (i < 0) return null;
        list[i] = Object.assign({}, list[i], patch, { updatedAt: new Date().toISOString() });
        saveAll(list); return list[i];
      },
      remove(id) { saveAll(getAll().filter(c => c.id !== id)); }
    }
  };
})();
