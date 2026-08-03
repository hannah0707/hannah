# Hannah 的像素工作台

## 项目结构

```
hannah-pixel-workbench/
├── index.html          # 页面入口，引用 css/js/图片资源
├── css/
│   └── style.css       # 全局样式、主题、布局、动画
├── js/
│   ├── data.js         # 数据中心：书单、灵感、学习、健身、三丽鸥等静态数据
│   ├── api.js          # 统一数据请求层（Mock 占位 + 可替换接口地址）
│   └── app.js          # 应用主逻辑：视图切换、阅读/日记/灵感/记账等模块、桌面宠物
├── assets/
│   └── avatars/
│       └── pet/        # 桌面宠物 GIF 动画素材
│           ├── happy.gif   # 开心/待机/兴奋/摸摸
│           ├── think.gif   # 思考/坐下
│           ├── sniff.gif   # 嗅闻/走动
│           ├── sleep.gif   # 睡觉
│           ├── bone.gif    # 啃骨头（喂食）
│           └── ball.gif    # 玩球（出去遛）
└── README.md           # 本说明文件
```

## 运行方式

1. 解压项目包。
2. 直接用浏览器打开 `index.html`，或在项目根目录启动本地静态服务器：
   ```bash
   python -m http.server 8000
   ```
3. 访问 `http://localhost:8000` 即可使用。

## 部署说明

- 所有分栏图标已以 base64 内联在 `js/app.js` 中，无需额外图标文件。
- 桌面宠物 GIF 动画存放在 `assets/avatars/pet/`，请保持相对路径不变。