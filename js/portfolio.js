/* ============================================================
 * 作品集模块 · 核心框架（纯前端 / localStorage）
 * 负责：工具函数(PFUtil)、Tab 路由、富文本编辑器、图片压缩、
 *       把新模块接入 app.js 的 switchView（覆盖 window.renderPortfolio）。
 * 不改动任何原有模块逻辑（"作品" Tab 复用原函数，历史数据不丢失）。
 * ============================================================ */
(function () {
  'use strict';

  // 各模块独立的 localStorage 键，备份模块的全量扫描会自动包含它们
  const K = {
    CHARS: 'hannah_pf_chars',   // 人物库：数组
    WORLD: 'hannah_pf_world',   // 世界观设定：{ geography:[], race:[], faction:[], history:[] }
    INSP:  'hannah_pf_insp',    // 灵感素材库：数组
    TAB:   'hannah_pf_tab'      // 当前激活的一级 Tab
  };

  const PFUtil = {
    K,
    /* 读取 JSON（带默认值） */
    load(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        const v = JSON.parse(raw);
        return v == null ? fallback : v;
      } catch (e) { return fallback; }
    },
    /* 写入 JSON */
    save(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    },
    /* 生成唯一 id */
    uid() {
      return 'pf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },
    /* 当前日期字符串 YYYY-MM-DD */
    todayStr() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    },
    /* 简易 HTML 转义（用于纯文本展示） */
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    /* 富文本轻量消毒：去掉 script/style/iframe、事件属性与 javascript: 链接 */
    sanitize(html) {
      if (!html) return '';
      let s = String(html);
      s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
      s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
      s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
      s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
      s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
      s = s.replace(/javascript:/gi, '');
      return s;
    },
    /* 图片压缩：读为 dataURL（canvas 缩放 + 降质），减小 localStorage 体积 */
    compressImage(file, maxDim, quality) {
      maxDim = maxDim || 1100;
      quality = quality || 0.72;
      return new Promise((resolve, reject) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
          reject(new Error('不是图片文件')); return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            const scale = Math.min(1, maxDim / Math.max(width, height));
            const w = Math.max(1, Math.round(width * scale));
            const h = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const type = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
            try { resolve(canvas.toDataURL(type, quality)); }
            catch (e) { reject(e); }
          };
          img.onerror = () => reject(new Error('图片解析失败'));
          img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });
    },

    /* 富文本编辑器：返回工具栏 + 可编辑区 HTML（value 为初始 HTML） */
    richTextHTML(id, value) {
      return `
      <div class="rt-wrap">
        <div class="rt-toolbar" data-rt="${id}">
          <button type="button" class="rt-btn" data-cmd="bold" title="加粗"><b>B</b></button>
          <button type="button" class="rt-btn" data-cmd="italic" title="斜体"><i>I</i></button>
          <button type="button" class="rt-btn" data-cmd="underline" title="下划线"><u>U</u></button>
          <button type="button" class="rt-btn" data-cmd="insertUnorderedList" title="无序列表">• 列表</button>
          <button type="button" class="rt-btn" data-cmd="insertOrderedList" title="有序列表">1. 列表</button>
          <button type="button" class="rt-btn" data-cmd="formatBlock" data-val="H3" title="小标题">H</button>
          <button type="button" class="rt-btn" data-cmd="createLink" title="插入链接">🔗</button>
          <button type="button" class="rt-btn" data-cmd="removeFormat" title="清除格式">⌫</button>
        </div>
        <div class="rt-editor" id="${id}" contenteditable="true" data-placeholder="在这里写设定内容…">${value || ''}</div>
      </div>`;
    },
    /* 绑定富文本工具栏按钮（在 HTML 插入 DOM 后调用） */
    initRichText(id) {
      const toolbar = document.querySelector('.rt-toolbar[data-rt="' + id + '"]');
      if (!toolbar) return;
      toolbar.querySelectorAll('.rt-btn').forEach(b => {
        // 阻止 mousedown 默认，避免编辑器失焦导致 execCommand 失效
        b.addEventListener('mousedown', (e) => { e.preventDefault(); });
        b.addEventListener('click', () => {
          const cmd = b.dataset.cmd;
          if (cmd === 'createLink') {
            const url = window.prompt('输入链接地址：', 'https://');
            if (url) document.execCommand('createLink', false, url);
          } else if (cmd === 'formatBlock') {
            document.execCommand('formatBlock', false, b.dataset.val);
          } else {
            document.execCommand(cmd, false, null);
          }
        });
      });
    },
    getRichText(id) {
      const el = document.getElementById(id);
      return el ? el.innerHTML : '';
    },

    /* 图片上传字段 HTML（prefix 用于拼接 _input/_btn/_del/_preview） */
    imageFieldHTML(prefix, current) {
      const bg = current ? 'background-image:url(' + current + ');' : '';
      const hasImg = current ? 'has-img' : '';
      const delDisp = current ? '' : 'display:none;';
      return `
      <div class="modal-field">
        <label class="modal-label">参考图片（可选，自动压缩）</label>
        <div class="pf-img-upload">
          <div class="pf-img-preview ${hasImg}" id="${prefix}_preview" style="${bg}">📷 点击「选择图片」上传</div>
          <div class="pf-img-actions">
            <button type="button" class="btn btn-sm" id="${prefix}_btn">选择图片</button>
            <button type="button" class="btn btn-sm danger" id="${prefix}_del" style="${delDisp}">移除</button>
          </div>
          <input type="file" accept="image/*" id="${prefix}_input" hidden>
        </div>
      </div>`;
    },
    /* 绑定图片上传字段，onData(dataURL|null) 回调 */
    bindImagePicker(prefix, onData) {
      const input = document.getElementById(prefix + '_input');
      const btn = document.getElementById(prefix + '_btn');
      const del = document.getElementById(prefix + '_del');
      const prev = document.getElementById(prefix + '_preview');
      if (!input || !btn || !prev) return;
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        if (f.size > 15 * 1024 * 1024) { toast('图片过大（>15MB），请换一张'); input.value = ''; return; }
        PFUtil.compressImage(f).then(d => {
          prev.style.backgroundImage = 'url(' + d + ')';
          prev.classList.add('has-img');
          if (del) del.style.display = '';
          onData(d);
        }).catch(() => toast('图片读取失败'));
      });
      if (del) del.addEventListener('click', () => {
        if (input) input.value = '';
        prev.style.backgroundImage = '';
        prev.classList.remove('has-img');
        del.style.display = 'none';
        onData(null);
      });
    },

    /* 通用删除确认 */
    confirmDelete(name, cb) {
      confirmDialog('确定删除「' + name + '」吗？此操作不可撤销。', cb);
    },
    /* 空状态占位 */
    emptyHTML(icon, text) {
      return '<div class="empty-state" style="grid-column:1/-1;"><span class="empty-state-icon">' +
        icon + '</span>' + PFUtil.esc(text) + '</div>';
    }
  };

  window.PFUtil = PFUtil;

  // ============================================================
  // Tab 路由
  // ============================================================
  function pfActiveTab() { return localStorage.getItem(K.TAB) || 'chars'; }
  function pfSetTab(tab) { localStorage.setItem(K.TAB, tab); }

  const PANELS = { chars: 'pfPanelChars', world: 'pfPanelWorld', insp: 'pfPanelInsp', works: 'pfPanelWorks' };

  function renderPortfolioModule() {
    const tab = pfActiveTab();
    // 同步 Tab 按钮高亮
    const tabBtns = document.querySelectorAll('#pfTabs .pf-tab');
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.pftab === tab));
    // 同步面板显隐
    Object.keys(PANELS).forEach(t => {
      const el = document.getElementById(PANELS[t]);
      if (el) el.classList.toggle('active', t === tab);
    });
    // 渲染对应面板
    if (tab === 'chars' && window.PFChars) window.PFChars.render();
    else if (tab === 'world' && window.PFWorld) window.PFWorld.render();
    else if (tab === 'insp' && window.PFInsp) window.PFInsp.render();
    else if (tab === 'works' && window.__origRenderPortfolio) window.__origRenderPortfolio();
  }
  window.renderPortfolioModule = renderPortfolioModule;

  function bindPfTabs() {
    const tabs = document.getElementById('pfTabs');
    if (!tabs || tabs.dataset.bound) return;
    tabs.dataset.bound = '1';
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.pf-tab');
      if (!btn) return;
      pfSetTab(btn.dataset.pftab);
      renderPortfolioModule();
    });
  }

  // 接入 app.js 的 switchView：覆盖其 renderPortfolio 入口（保留原函数供"作品"Tab 复用）
  if (typeof window.renderPortfolio === 'function') {
    window.__origRenderPortfolio = window.renderPortfolio;
  }
  window.renderPortfolio = function () { renderPortfolioModule(); };

  // 脚本在 body 末尾执行，#pfTabs 已存在，直接绑定
  if (document.getElementById('pfTabs')) bindPfTabs();

  // 暴露给自检脚本使用的内部引用
  window.__pfPanels = PANELS;

  /* 说明：app.js 整体包在 IIFE 内，renderPortfolio 不是全局函数，
     因此作品集通过 app.js 的 renderPortfolioBridge 接入 switchView（见 app.js），
     无需在此覆盖 window.renderPortfolio。 */
})();
