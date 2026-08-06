/* =====================================================================
 * inspiration_add.js —— 灵感「手动新增」（纯前端，仅操作 localStorage）
 * ---------------------------------------------------------------------
 * - 灵感页顶部「+ 新增灵感」按钮（index.html 的 #inspAddBtn）打开表单
 * - 字段：标题*、分类、来源、链接*、简介；数据存 hannah_insp_user
 * - 用户新增与预置灵感混合展示；用户条目带「我添加的」浅色标识
 * - 用户条目支持编辑 / 删除；预置灵感仅可收藏（由 inspiration.js 处理）
 * - 通过 inspiration.js 的钩子渲染与事件分发：
 *     window.__inspRenderUser(listEl, activeCat)
 *     window.__inspUserEdit(id) / window.__inspUserDelete(id)
 * ===================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'hannah_insp_user';
  // 与 inspiration.js 的分类保持一致
  var CATS = ['写作指导', '影视解说', '书籍推荐', '文学', '播客', '诗词文学'];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- 存储 ----------
  function load() {
    try { var a = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function save(arr) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function uid() { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- 用户卡片 HTML（与预置卡片结构一致，方便复用点击打开逻辑） ----------
  function cardHTML(it) {
    return '' +
      '<div class="insp-card insp-card-user" data-url="' + esc(it.url) + '" data-title="' + esc(it.title) + '">' +
        '<div class="insp-user-badge">我添加的</div>' +
        '<div class="insp-user-actions">' +
          '<button class="insp-user-btn" data-act="user-edit" data-id="' + esc(it.id) + '" title="编辑">✎</button>' +
          '<button class="insp-user-btn insp-user-del" data-act="user-del" data-id="' + esc(it.id) + '" title="删除">🗑</button>' +
        '</div>' +
        (it.type === 'video' ? '<span class="insp-type-badge video">▶ 视频</span>' : (it.type === 'podcast' ? '<span class="insp-type-badge podcast">🎧 播客</span>' : '')) +
        '<div class="insp-title">' + esc(it.title) + '</div>' +
        '<div class="insp-src-line"><span class="insp-src">' + esc(it.source || '手动添加') + '</span></div>' +
        '<div class="insp-desc">' + esc(it.summary || '') + '</div>' +
        '<div class="insp-go">查看原文 →</div>' +
      '</div>';
  }

  // 在列表末尾追加「当前分类」下的用户灵感（混合展示）
  function renderUser(listEl, activeCat) {
    if (!listEl) return;
    var all = load();
    var items;
    if (activeCat === '⭐ 我的收藏') {
      items = all; // 我的收藏里也展示自己添加的
    } else {
      items = all.filter(function (x) { return x.category === activeCat; });
    }
    if (!items.length) return;
    // 去掉「空状态」占位（若存在）后在末尾追加
    var empty = listEl.querySelector('.empty-state');
    if (empty && items.length) { /* 保留空状态但追加卡片 */ }
    var wrap = document.createElement('div');
    wrap.innerHTML = items.map(cardHTML).join('');
    while (wrap.firstChild) listEl.appendChild(wrap.firstChild);
  }

  // ---------- 表单弹窗 ----------
  function openForm(existing) {
    var isEdit = !!existing;
    var it = existing || { title: '', category: CATS[0], source: '', url: '', summary: '' };
    var catOpts = CATS.map(function (c) {
      return '<option value="' + esc(c) + '"' + (it.category === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    // 若已有自定义分类不在列表中，补一条
    if (it.category && CATS.indexOf(it.category) < 0) {
      catOpts = '<option value="' + esc(it.category) + '" selected>' + esc(it.category) + '</option>' + catOpts;
    }
    var old = document.getElementById('inspAddModalMask');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.id = 'inspAddModalMask';
    mask.innerHTML =
      '<div class="modal" role="dialog" aria-label="新增灵感">' +
        '<div class="modal-title">' + (isEdit ? '✎ 编辑灵感' : '＋ 新增灵感') + '</div>' +
        '<div class="modal-field"><label class="modal-label">标题 *</label><input id="iaTitle" class="modal-input" value="' + esc(it.title) + '" placeholder="灵感标题"></div>' +
        '<div class="modal-field"><label class="modal-label">分类</label><select id="iaCat" class="modal-select">' + catOpts + '</select></div>' +
        '<div class="modal-field"><label class="modal-label">来源</label><input id="iaSource" class="modal-input" value="' + esc(it.source) + '" placeholder="如：自己 / 微博 / 公众号"></div>' +
        '<div class="modal-field"><label class="modal-label">链接 *</label><input id="iaUrl" class="modal-input" value="' + esc(it.url) + '" placeholder="https://..."></div>' +
        '<div class="modal-field"><label class="modal-label">简介</label><textarea id="iaSummary" class="modal-textarea" style="min-height:70px;">' + esc(it.summary) + '</textarea></div>' +
        '<div class="modal-actions">' +
          '<button class="btn" id="iaCancel">取消</button>' +
          '<button class="btn primary" id="iaSave">保存</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeForm(); });
    document.getElementById('iaCancel').addEventListener('click', closeForm);
    document.getElementById('iaSave').addEventListener('click', function () {
      var title = (document.getElementById('iaTitle').value || '').trim();
      var url = (document.getElementById('iaUrl').value || '').trim();
      if (!title) { if (window.toast) window.toast('请填写标题'); return; }
      if (!url) { if (window.toast) window.toast('请填写链接'); return; }
      var data = {
        title: title,
        category: document.getElementById('iaCat').value,
        source: (document.getElementById('iaSource').value || '').trim(),
        url: url,
        summary: (document.getElementById('iaSummary').value || '').trim()
      };
      var arr = load();
      if (isEdit) {
        var idx = arr.findIndex(function (x) { return x.id === it.id; });
        if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], data);
        if (window.toast) window.toast('✓ 已更新');
      } else {
        data.id = uid();
        data.isUser = true;
        data.createdAt = new Date().toISOString();
        arr.unshift(data);
        if (window.awardEnergy) window.awardEnergy('inspiration_add', { summary: (data.summary || '').slice(0, 40) });
        if (window.toast) window.toast('✓ 已添加灵感');
      }
      save(arr);
      closeForm();
      if (typeof window.renderInspiration === 'function') window.renderInspiration();
    });
  }
  function closeForm() {
    var m = document.getElementById('inspAddModalMask');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  // ---------- 暴露给 inspiration.js 的钩子 ----------
  window.__inspRenderUser = renderUser;
  window.__inspUserEdit = function (id) {
    var arr = load();
    var it = arr.find(function (x) { return x.id === id; });
    if (it) openForm(it);
  };
  window.__inspUserDelete = function (id) {
    if (!window.confirm) { /* 兜底 */ }
    if (typeof window.confirm === 'function' && !window.confirm('确定删除这条灵感吗？')) return;
    var arr = load().filter(function (x) { return x.id !== id; });
    save(arr);
    if (window.toast) window.toast('🗑 已删除');
    if (typeof window.renderInspiration === 'function') window.renderInspiration();
  };

  // ---------- 绑定「+ 新增灵感」按钮 ----------
  function bind() {
    var btn = document.getElementById('inspAddBtn');
    if (btn) btn.addEventListener('click', function () { openForm(null); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
