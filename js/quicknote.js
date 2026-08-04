/* =====================================================================
 * quicknote.js —— 随手速记（全局，任意页面可用）
 * ---------------------------------------------------------------------
 * - 右上角常驻「✏️ 速记」按钮（index.html 的 #globalQuickNoteBtn）
 * - 点击弹出小窗，快速写下短句，保存到「日记库」（今日日记）
 * - 真正写入由 app.js 暴露的 window.__diaryQuickNote(text) 完成，
 *   本文件只负责 UI 与调用，不触碰日记数据结构。
 * 依赖：window.__diaryQuickNote（app.js 提供）、window.toast
 * ===================================================================== */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function openModal() {
    var old = document.getElementById('qnModalMask');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.id = 'qnModalMask';
    var todayStr = (function () {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    })();
    mask.innerHTML =
      '<div class="modal" role="dialog" aria-label="随手速记">' +
        '<div class="modal-title">✏️ 随手速记 · ' + todayStr + '</div>' +
        '<p style="color:var(--text-mid);font-size:12px;margin:0 0 8px;">一句话记下来，自动存入今日日记。</p>' +
        '<div class="modal-field">' +
          '<textarea id="qnText" class="modal-textarea" placeholder="例如：突然想到一个开头的灵感……" style="min-height:90px;"></textarea>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn" id="qnCancel">取消</button>' +
          '<button class="btn primary" id="qnSave">存入日记</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    var ta = document.getElementById('qnText');
    if (ta) setTimeout(function () { ta.focus(); }, 30);

    document.getElementById('qnCancel').addEventListener('click', closeModal);
    document.getElementById('qnSave').addEventListener('click', function () {
      var v = (document.getElementById('qnText').value || '').trim();
      if (!v) { if (window.toast) window.toast('写点什么吧～'); return; }
      if (typeof window.__diaryQuickNote === 'function') {
        window.__diaryQuickNote(v);
        closeModal();
      } else {
        if (window.toast) window.toast('日记模块未就绪，请稍后再试');
        closeModal();
      }
    });
  }
  function closeModal() {
    var m = document.getElementById('qnModalMask');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  function bind() {
    var btn = document.getElementById('globalQuickNoteBtn');
    if (btn) btn.addEventListener('click', openModal);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
