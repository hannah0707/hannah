/* =====================================================================
 * backup.js —— 全局数据备份 / 导入 / 分区重置（纯前端，仅操作 localStorage）
 * ---------------------------------------------------------------------
 * - 右上角常驻「💾 备份」按钮（由 index.html 的 #globalBackupBtn 触发）
 * - 弹窗提供：导出全部 JSON / 导入备份 / 分区重置（每项二次确认）
 * - 仅做「读取 → 打包 → 写入」，不改动任何业务模块的读写逻辑
 * - 导入 / 重置后通过 location.reload() 让各模块重新加载最新数据
 * 依赖：window.toast（app.js 已全局暴露）
 * ===================================================================== */
(function () {
  'use strict';

  // 已知业务存储键（用于重置面板的友好展示与按项清空）
  // scope 用于在「像素工作台大对象」里定位子项（如日记/书架同属 pixel_workbench_v3）
  var KNOWN = [
    { key: 'pixel_workbench_v3',     label: '日记 & 书架阅读记录 & 打卡', scope: 'app' },
    { key: 'pixel_workbench_timeline', label: '桌面·今日时间线',          scope: 'self' },
    { key: 'hannah_insp_fav',        label: '灵感收藏',                    scope: 'self' },
    { key: 'hannah_insp_user',       label: '灵感（我手动添加的）',        scope: 'self' },
    { key: 'takeout_list',           label: '外卖库',                      scope: 'self' },
    { key: 'takeout_blacklist',      label: '外卖黑名单',                  scope: 'self' },
    { key: 'water_setting',          label: '喝水设置',                    scope: 'self' },
    { key: 'water_records',          label: '喝水记录',                    scope: 'self' },
    { key: 'recipe_list',            label: '食谱',                        scope: 'self' },
    { key: 'period_records',         label: '生理期记录',                  scope: 'self' },
    { key: 'vision_collect',         label: '视野收藏',                    scope: 'self' },
    { key: 'vision_readRecord',      label: '视野已读记录',                scope: 'self' },
    { key: 'vision_random_history',  label: '视野破茧历史',                scope: 'self' },
    { key: 'hannah_pf_chars',        label: '作品集·人物库',               scope: 'self' },
    { key: 'hannah_pf_world',        label: '作品集·世界观设定',           scope: 'self' },
    { key: 'hannah_pf_insp',         label: '作品集·灵感素材库',           scope: 'self' },
    { key: 'hannahFit:records',      label: '健身·运动记录',               scope: 'self' },
    { key: 'hannahFit:plans',        label: '健身·训练计划库',             scope: 'self' },
    { key: 'hannahFit:exercises',    label: '健身·自定义动作',             scope: 'self' },
    { key: 'hannahFit:body',         label: '健身·身体数据档案',           scope: 'self' },
    { key: 'hannahFit:videos',       label: '健身·收藏视频库',             scope: 'self' },
    { key: 'hannahFit:settings',     label: '健身·偏好设置',               scope: 'self' },
   { key: 'hannahFin:cats',         label: '记账·自定义分类',             scope: 'self' },
   { key: 'hannahFin:budgets',      label: '记账·月度预算',               scope: 'self' },
   { key: 'hannahFin:tpls',         label: '记账·固定收支模板',           scope: 'self' },
   { key: 'hannahFin:ui',           label: '记账·界面偏好',               scope: 'self' }
  ];

  // 分区重置项（一个 scope 可能对应多个键，或对应大对象里的子项）
  var RESET_SCOPES = [
    { id: 'diary',    label: '📖 日记',          keys: [],               sub: 'diary' },
    { id: 'reading',  label: '📚 书架阅读记录',  keys: [],               sub: 'reading' },
    { id: 'takeout',  label: '🍱 外卖库',        keys: ['takeout_list'] },
    { id: 'blacklist',label: '🚫 外卖黑名单',    keys: ['takeout_blacklist'] },
    { id: 'water',    label: '💧 喝水记录',      keys: ['water_setting', 'water_records'] },
    { id: 'period',   label: '🩸 生理期记录',    keys: ['period_records'] },
    { id: 'recipe',   label: '🥘 食谱',          keys: ['recipe_list'] },
    { id: 'inspFav',  label: '💡 灵感收藏',      keys: ['hannah_insp_fav'] },
    { id: 'inspUser', label: '✍ 灵感（我添加的）', keys: ['hannah_insp_user'] },
    { id: 'vision',   label: '🌐 视野收藏/已读', keys: ['vision_collect', 'vision_readRecord', 'vision_random_history'] },
    { id: 'pfChars',  label: '🧙 作品集·人物库',   keys: ['hannah_pf_chars'] },
    { id: 'pfWorld',  label: '🌍 作品集·世界观',   keys: ['hannah_pf_world'] },
    { id: 'pfInsp',   label: '💡 作品集·灵感素材', keys: ['hannah_pf_insp'] },
    { id: 'fitAll',   label: '💪 健身（全部）',    keys: ['hannahFit:records', 'hannahFit:plans', 'hannahFit:exercises', 'hannahFit:body', 'hannahFit:videos', 'hannahFit:settings'] },
   { id: 'finAll',   label: '💰 记账（全部）',    keys: ['hannahFin:cats', 'hannahFin:budgets', 'hannahFin:tpls', 'hannahFin:ui'] },
   { id: 'schedAll', label: '📅 日程（全部）',    keys: [], sub: 'schedule' }
  ];

  // 简易转义
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ============ 通用弹窗（复用现有 .modal-mask / .modal 样式） ============
  function openModal(title, bodyHTML, actions) {
    closeModal(); // 同一时间只开一个
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.id = 'wbModalMask';
    var actHTML = (actions || []).map(function (a, i) {
      var cls = 'btn ' + (a.primary ? 'primary' : (a.danger ? 'danger' : ''));
      var style = a.style ? (' style="' + a.style + '"') : '';
      return '<button class="' + cls + '" data-act="' + esc(a.act || ('a' + i)) + '"' + style + '>' + esc(a.text) + '</button>';
    }).join('');
    mask.innerHTML =
      '<div class="modal" role="dialog" aria-label="' + esc(title) + '">' +
        '<div class="modal-title">' + esc(title) + '</div>' +
        '<div class="wb-modal-body">' + bodyHTML + '</div>' +
        (actHTML ? '<div class="modal-actions">' + actHTML + '</div>' : '') +
      '</div>';
    document.body.appendChild(mask);
    // 点击遮罩空白处关闭
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    // 绑定动作
    (actions || []).forEach(function (a) {
      var btn = mask.querySelector('[data-act="' + (a.act || '') + '"]');
      if (btn && a.onClick) btn.addEventListener('click', function () { a.onClick(); });
    });
    return mask;
  }
  function closeModal() {
    var m = document.getElementById('wbModalMask');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  // ============================================================
  // IndexedDB 文件型数据：导出 / 导入时同步打包
  // （仅 localStorage 无法承载 File/Blob，如人才库的简历原文件）
  // ============================================================
  // 已知 IndexedDB 数据库清单（与 app.js 中的 TALENT_IDB / 未来其它 blob 库对齐）
  var IDB_DBS = [
    { dbName: 'pixel_workbench_talent', store: 'resumes', version: 1, label: '人才库·简历原文件' }
  ];

  function idbOpen(dbName, version) {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('no-idb')); return; }
      var req = indexedDB.open(dbName, version);
      req.onupgradeneeded = function () {
        var db = req.result;
        // 声明所有已知 store（避免升级时丢文件）
        for (var i = 0; i < IDB_DBS.length; i++) {
          if (db.name === IDB_DBS[i].dbName && !db.objectStoreNames.contains(IDB_DBS[i].store)) {
            db.createObjectStore(IDB_DBS[i].store);
          }
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  // 把 Blob/File 转成 { name, type, size, dataBase64 }
  function blobToJSONEntry(blob) {
    return new Promise(function (resolve, reject) {
      if (!blob) { resolve(null); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var buf = reader.result; // ArrayBuffer
        var bin = new Uint8Array(buf);
        // 分片 base64，避免调用栈爆炸
        var CHUNK = 0x8000;
        var parts = [];
        for (var i = 0; i < bin.length; i += CHUNK) {
          parts.push(String.fromCharCode.apply(null, bin.subarray(i, i + CHUNK)));
        }
        var b64 = btoa(parts.join(''));
        resolve({
          name: blob.name || '',
          type: blob.type || '',
          size: blob.size || 0,
          dataBase64: b64
        });
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(blob);
    });
  }

  function base64ToBlob(entry) {
    try {
      var bin = atob(entry.dataBase64);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var blob = new Blob([arr], { type: entry.type || 'application/octet-stream' });
      // 试图给 Blob 加 name（仅当前会话有效；File 才是带名的）
      if (entry.name) {
        try { return new File([blob], entry.name, { type: entry.type || '' }); } catch (e) { return blob; }
      }
      return blob;
    } catch (e) {
      console.warn('[备份恢复] base64 → Blob 失败', e);
      return null;
    }
  }

  // 收集所有 IDB 文件 → { dbName: { store: { key: entry } } }
  function collectIDB() {
    var out = {};
    var tasks = [];
    IDB_DBS.forEach(function (cfg) {
      tasks.push(
        idbOpen(cfg.dbName, cfg.version).then(function (db) {
          return new Promise(function (resolve) {
            try {
              if (!db.objectStoreNames.contains(cfg.store)) { db.close(); resolve(); return; }
              var tx = db.transaction(cfg.store, 'readonly');
              var store = tx.objectStore(cfg.store);
              var keyReq = store.getAllKeys();
              keyReq.onsuccess = function () {
                var keys = keyReq.result || [];
                if (!keys.length) { db.close(); resolve(); return; }
                var bag = {};
                var done = 0;
                keys.forEach(function (k) {
                  var g = store.get(k);
                  g.onsuccess = function () {
                    blobToJSONEntry(g.result).then(function (entry) {
                      if (entry) bag[String(k)] = entry;
                      done++;
                      if (done === keys.length) {
                        if (!out[cfg.dbName]) out[cfg.dbName] = {};
                        out[cfg.dbName][cfg.store] = bag;
                        db.close();
                        resolve();
                      }
                    }).catch(function () {
                      done++;
                      if (done === keys.length) {
                        if (!out[cfg.dbName]) out[cfg.dbName] = {};
                        out[cfg.dbName][cfg.store] = bag;
                        db.close();
                        resolve();
                      }
                    });
                  };
                  g.onerror = function () {
                    done++;
                    if (done === keys.length) { db.close(); resolve(); }
                  };
                });
              };
              keyReq.onerror = function () { db.close(); resolve(); };
            } catch (e) {
              console.warn('[备份] 收集 IDB 失败', cfg.dbName, cfg.store, e);
              try { db.close(); } catch (_) {}
              resolve();
            }
          });
        }).catch(function (e) {
          console.warn('[备份] 打开 IDB 失败', cfg.dbName, e);
        })
      );
    });
    return Promise.all(tasks).then(function () { return out; });
  }

  // 恢复 IDB 文件：{ dbName: { store: { key: entry } } }
  function restoreIDB(idbMap) {
    if (!idbMap || typeof idbMap !== 'object') return Promise.resolve(0);
    var tasks = [];
    var restored = 0;
    Object.keys(idbMap).forEach(function (dbName) {
      var stores = idbMap[dbName] || {};
      Object.keys(stores).forEach(function (storeName) {
        var entries = stores[storeName] || {};
        var cfg = null;
        for (var i = 0; i < IDB_DBS.length; i++) {
          if (IDB_DBS[i].dbName === dbName && IDB_DBS[i].store === storeName) { cfg = IDB_DBS[i]; break; }
        }
        if (!cfg) {
          console.warn('[备份恢复] 未在白名单内，跳过：', dbName, storeName);
          return;
        }
        tasks.push(
          idbOpen(dbName, cfg.version).then(function (db) {
            return new Promise(function (resolve) {
              try {
                if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve(); return; }
                var keys = Object.keys(entries);
                if (!keys.length) { db.close(); resolve(); return; }
                var tx = db.transaction(storeName, 'readwrite');
                var store = tx.objectStore(storeName);
                var done = 0;
                keys.forEach(function (k) {
                  var blob = base64ToBlob(entries[k]);
                  if (!blob) { done++; if (done === keys.length) { db.close(); resolve(); } return; }
                  var p = store.put(blob, k);
                  p.onsuccess = function () {
                    restored++;
                    done++;
                    if (done === keys.length) { db.close(); resolve(); }
                  };
                  p.onerror = function () {
                    done++;
                    if (done === keys.length) { db.close(); resolve(); }
                  };
                });
              } catch (e) {
                console.warn('[备份恢复] 写入 IDB 失败', dbName, storeName, e);
                try { db.close(); } catch (_) {}
                resolve();
              }
            });
          }).catch(function (e) {
            console.warn('[备份恢复] 打开 IDB 失败', dbName, e);
          })
        );
      });
    });
    return Promise.all(tasks).then(function () { return restored; });
  }

  // ============ 1) 导出全部数据 ============
  function collectAll() {
    var store = {};
    // 全量扫描 localStorage，保证「全部」数据都不丢失
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      try { store[k] = localStorage.getItem(k); } catch (e) {}
    }
    return store;
  }

  // 汇总本地数据条数（含 IndexedDB 文件），用于面板展示
  function collectAllAsync() {
    return collectIDB().then(function (idb) {
      var idbCount = 0;
      Object.keys(idb).forEach(function (dbName) {
        Object.keys(idb[dbName]).forEach(function (storeName) {
          idbCount += Object.keys(idb[dbName][storeName]).length;
        });
      });
      return { store: collectAll(), idb: idb, idbCount: idbCount };
    });
  }

  function exportAll() {
    if (window.toast) window.toast('⏳ 正在打包 IndexedDB 文件…');
    collectAllAsync().then(function (bag) {
      var payload = {
        _app: 'hannah-pixel-workbench',
        _type: 'backup',
        _version: 2,  // v2: 含 _idbFiles（IndexedDB 文件）
        _exportedAt: new Date().toISOString(),
        store: bag.store,
        _idbFiles: bag.idb,
        _idbMeta: IDB_DBS.map(function (d) { return { dbName: d.dbName, store: d.store, label: d.label }; })
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = 'hannah-workbench-backup-' + dateStr + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      if (window.toast) window.toast('✓ 已导出（含 ' + bag.idbCount + ' 份原文件）');
      closeModal();
    }).catch(function (e) {
      console.error('[备份] 导出失败', e);
      if (window.toast) window.toast('✗ 导出失败：' + (e && e.message ? e.message : e));
    });
  }

  // ============ 2) 导入备份 ============
  function importFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = null;
      try { parsed = JSON.parse(reader.result); }
      catch (e) {
        return openModal('导入失败', '<p style="color:var(--danger)">文件格式不正确：' + esc(e.message) + '</p>' +
          '<p style="color:var(--text-mid);font-size:12px;">请选择由本工作台导出的备份 JSON 文件。</p>',
          [{ text: '知道了', primary: true, onClick: closeModal }]);
      }
      try {
        var store = null;
        if (parsed && parsed._type === 'backup' && parsed.store) store = parsed.store;
        else if (parsed && typeof parsed === 'object') store = parsed; // 兼容裸对象
        if (!store || typeof store !== 'object') throw new Error('格式无法识别');
        // 1) 写回 localStorage
        var count = 0;
        Object.keys(store).forEach(function (k) {
          if (typeof store[k] === 'string') { localStorage.setItem(k, store[k]); count++; }
        });
        // 2) 恢复 IndexedDB 文件
        if (parsed._idbFiles && typeof parsed._idbFiles === 'object') {
          restoreIDB(parsed._idbFiles).then(function (fileCount) {
            if (window.toast) window.toast('✓ 已恢复 ' + count + ' 项数据 + ' + fileCount + ' 份原文件，即将刷新');
            closeModal();
            setTimeout(function () { location.reload(); }, 900);
          }).catch(function (e) {
            console.warn('[备份] IDB 恢复失败', e);
            if (window.toast) window.toast('⚠ 部分文件恢复失败，已恢复 ' + count + ' 项数据，即将刷新');
            closeModal();
            setTimeout(function () { location.reload(); }, 900);
          });
        } else {
          // 旧版 v1 备份无 IDB 数据
          if (window.toast) window.toast('✓ 已恢复 ' + count + ' 项数据（旧版备份不含原文件），即将刷新');
          closeModal();
          setTimeout(function () { location.reload(); }, 700);
        }
      } catch (e) {
        openModal('导入失败', '<p style="color:var(--danger)">文件格式不正确：' + esc(e.message) + '</p>' +
          '<p style="color:var(--text-mid);font-size:12px;">请选择由本工作台导出的备份 JSON 文件。</p>',
          [{ text: '知道了', primary: true, onClick: closeModal }]);
      }
    };
    reader.readAsText(file);
  }

  function showImportDialog() {
    openModal('导入备份',
      '<p style="color:var(--text-mid);font-size:13px;line-height:1.7;">选择之前导出的备份 JSON 文件，将<strong>覆盖</strong>当前同名数据并刷新页面。</p>' +
      '<div class="modal-field"><input type="file" id="wbImportFile" accept=".json,application/json" class="modal-input"></div>',
      [
        { text: '取消', onClick: closeModal },
        { text: '开始导入', primary: true, onClick: function () {
          var inp = document.getElementById('wbImportFile');
          if (!inp || !inp.files || !inp.files[0]) { if (window.toast) window.toast('请先选择文件'); return; }
          importFromFile(inp.files[0]);
        } }
      ]);
  }

  // ============ 3) 分区重置（二次确认） ============
  // 清空所有已知 IDB 数据库中的所有 store
  function clearAllIDB() {
    var tasks = [];
    IDB_DBS.forEach(function (cfg) {
      tasks.push(idbOpen(cfg.dbName, cfg.version).then(function (db) {
        return new Promise(function (resolve) {
          try {
            if (!db.objectStoreNames.contains(cfg.store)) { db.close(); resolve(); return; }
            var tx = db.transaction(cfg.store, 'readwrite');
            tx.objectStore(cfg.store).clear();
            tx.oncomplete = function () { db.close(); resolve(); };
            tx.onerror = function () { try { db.close(); } catch (_) {} resolve(); };
          } catch (e) { try { db.close(); } catch (_) {} resolve(); }
        });
      }).catch(function () { /* no-idb 容错 */ }));
    });
    return Promise.all(tasks);
  }

  function clearScope(scope) {
    if (scope.sub === 'diary' || scope.sub === 'reading' || scope.sub === 'schedule') {
      // 仅清空大对象里的子项，不动其它（日记/书架同属 pixel_workbench_v3）
      try {
        var raw = localStorage.getItem('pixel_workbench_v3');
        var obj = raw ? JSON.parse(raw) : {};
        delete obj[scope.sub];
        localStorage.setItem('pixel_workbench_v3', JSON.stringify(obj));
      } catch (e) {}
    } else {
      (scope.keys || []).forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    }
    // 同步清空 IndexedDB
    if (scope.idb) {
      var tasks = [];
      scope.idb.forEach(function (cfg) {
        tasks.push(idbOpen(cfg.dbName, cfg.version).then(function (db) {
          return new Promise(function (resolve) {
            try {
              if (!db.objectStoreNames.contains(cfg.store)) { db.close(); resolve(); return; }
              var tx = db.transaction(cfg.store, 'readwrite');
              tx.objectStore(cfg.store).clear();
              tx.oncomplete = function () { db.close(); resolve(); };
              tx.onerror = function () { try { db.close(); } catch (_) {} resolve(); };
            } catch (e) { try { db.close(); } catch (_) {} resolve(); }
          });
        }).catch(function () {}));
      });
      Promise.all(tasks);  // 不阻塞 UI，异步完成
    }
  }

  function showResetConfirm(scope) {
    openModal('确认清空？',
      '<p>确定要清空 <strong>' + esc(scope.label) + '</strong> 吗？</p>' +
      '<p style="color:var(--danger);font-size:12px;">此操作不可撤销，建议先导出备份。</p>',
      [
        { text: '取消', onClick: closeModal },
        { text: '确认清空', danger: true, onClick: function () {
          clearScope(scope);
          if (window.toast) window.toast('🗑 已清空：' + scope.label);
          closeModal();
          setTimeout(function () { location.reload(); }, 600);
        } }
      ]);
  }

  function showResetPanel() {
    var items = RESET_SCOPES.map(function (s) {
      return '<button class="btn" data-reset="' + s.id + '" style="margin:4px 4px 0 0;">' + esc(s.label) + '</button>';
    }).join('');
    openModal('分区重置数据',
      '<p style="color:var(--text-mid);font-size:13px;line-height:1.7;">点击任意一项可单独清空（每项都会二次确认），避免误删全部内容。</p>' +
      '<div style="margin:10px 0;">' + items + '</div>' +
      '<hr style="border:none;border-top:2px dashed var(--pink-200);margin:10px 0;">' +
      '<button class="btn danger" id="wbResetAll">🧹 清空全部本地数据</button>',
      [
        { text: '关闭', onClick: closeModal }
      ]);
    // 绑定分区按钮
    RESET_SCOPES.forEach(function (s) {
      var b = document.querySelector('#wbModalMask [data-reset="' + s.id + '"]');
      if (b) b.addEventListener('click', function () { showResetConfirm(s); });
    });
    var all = document.getElementById('wbResetAll');
    if (all) all.addEventListener('click', function () {
      openModal('确认清空全部？',
        '<p>将清空<strong>所有</strong>本地数据（日记、外卖、灵感、视野、生理期、喝水、食谱、阅读……），恢复到首次打开状态。</p>' +
        '<p style="color:var(--danger);font-size:12px;">不可撤销！</p>',
        [
          { text: '取消', onClick: closeModal },
          { text: '全部清空', danger: true, onClick: function () {
            KNOWN.forEach(function (k) { try { localStorage.removeItem(k.key); } catch (e) {} });
            try { localStorage.removeItem('pixel_workbench_v3'); } catch (e) {}
            clearAllIDB();  // 同步清空所有 IDB 文件（如人才库简历原文件）
            if (window.toast) window.toast('已清空全部本地数据');
            closeModal();
            setTimeout(function () { location.reload(); }, 600);
          } }
        ]);
    });
  }

  // ============ 主面板 ============
  function showBackupPanel() {
    var keyCount = collectAll();
    var cnt = Object.keys(keyCount).length;
    // 异步统计 IDB 文件数，刷新面板
    collectIDB().then(function (idbMap) {
      var idbCnt = 0;
      var idbSummary = [];
      Object.keys(idbMap).forEach(function (dbName) {
        Object.keys(idbMap[dbName]).forEach(function (storeName) {
          var n = Object.keys(idbMap[dbName][storeName]).length;
          idbCnt += n;
          idbSummary.push(' · ' + dbName.split('_').pop() + '/' + storeName + ' × ' + n);
        });
      });
      var idbLine = idbCnt > 0
        ? '<p style="color:var(--text-mid);font-size:11px;margin-top:4px;">📎 IndexedDB 文件：<strong>' + idbCnt + '</strong> 份' + idbSummary.join('') + '（已自动打包到备份 JSON）</p>'
        : '';
      var body = document.querySelector('#wbModalMask .wb-modal-body');
      if (body) {
        var p = body.querySelector('p[data-idb-line]');
        if (p) p.outerHTML = '<p data-idb-line style="color:var(--text-mid);font-size:11px;margin-top:4px;">' + (idbCnt > 0 ? '📎 IndexedDB 文件：<strong>' + idbCnt + '</strong> 份' + idbSummary.join('') + '（已自动打包到备份 JSON）' : '') + '</p>';
      }
    });
    openModal('💾 数据备份与恢复',
      '<p style="color:var(--text-mid);font-size:13px;line-height:1.7;">当前本地共 <strong>' + cnt + '</strong> 项 localStorage 存储。建议定期导出，防止清理缓存导致数据丢失。</p>' +
      '<p data-idb-line style="color:var(--text-mid);font-size:11px;margin-top:4px;">📎 IndexedDB 文件统计中…</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">' +
        '<button class="btn primary" data-act="export">📤 导出全部数据（含 IndexedDB 原文件）</button>' +
        '<button class="btn" data-act="import">📥 导入备份文件</button>' +
        '<button class="btn danger" data-act="reset">🗑 分区重置 / 清空</button>' +
      '</div>',
      [{ text: '关闭', onClick: closeModal }]);
    var m = document.getElementById('wbModalMask');
    if (m) {
      m.querySelector('[data-act="export"]').addEventListener('click', exportAll);
      m.querySelector('[data-act="import"]').addEventListener('click', showImportDialog);
      m.querySelector('[data-act="reset"]').addEventListener('click', showResetPanel);
    }
  }

  // ============ 绑定右上角按钮 ============
  function bind() {
    var btn = document.getElementById('globalBackupBtn');
    if (btn) btn.addEventListener('click', showBackupPanel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  // 暴露给其它模块（如自检脚本）
  window.WBBackup = { exportAll: exportAll, collectAll: collectAll, showBackupPanel: showBackupPanel };
})();
