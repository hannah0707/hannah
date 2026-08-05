# 跨设备同步 · Supabase 配置（共享同步码方案）

数据同步使用 Supabase 的两张表：
- `sync_rooms`：文字数据（日记 / 打卡 / 心情 / 候选人资料等）
  - `room`：同步码（你自己设，例如 `hannah888`）
  - `data`：网站的全部文字内容（程序自动存，你不用管）
  - `updated_at`：最后保存时间
- `sync_resume_files`：简历原文件（PDF / Word / 图片等二进制）
  - `room` + `file_id`：主键
  - `name` / `mime` / `data`：文件名、类型、文件内容（base64）
  - `updated_at`：最后保存时间

> ✅ 简历原文件现在也参与云同步了：点「📤 保存到云端」会连同简历文件一起上传；点「📥 下载到本机」会把简历文件一起下载回本机浏览器。单个文件超过 8MB 会被跳过（提示过大），建议压缩后再同步。

---

## 一、只需做一次：建表 + 授权（大白话）

1. 打开 https://supabase.com → 进入你的项目。
2. 左侧菜单 **SQL Editor → New query**（新建一个查询）。
3. 把下面整段 SQL 粘进去，点右上角 **Run**。

```sql
-- 新建共享同步码表（免注册、免登录即可读写）
create table if not exists public.sync_rooms (
  room        text primary key,
  data        text not null,
  updated_at  timestamptz not null default now()
);

-- 开启行级安全
alter table public.sync_rooms enable row level security;

-- 允许任何人（匿名）按同步码读写：两台设备输入相同同步码即可互传
drop policy if exists "sync_rooms_anon_all" on public.sync_rooms;
create policy "sync_rooms_anon_all" on public.sync_rooms
  for all using (true) with check (true);

-- 授权匿名角色读写
grant select, insert, update, delete on public.sync_rooms to anon, authenticated;

-- 新建简历原文件表（按 room + file_id 存每份文件）
create table if not exists public.sync_resume_files (
  room       text not null,
  file_id    text not null,
  name       text not null default '',
  mime       text not null default '',
  data       text not null,
  updated_at timestamptz not null default now(),
  primary key (room, file_id)
);

-- 开启行级安全
alter table public.sync_resume_files enable row level security;

-- 允许匿名按同步码读写简历文件
drop policy if exists "sync_resume_files_anon_all" on public.sync_resume_files;
create policy "sync_resume_files_anon_all" on public.sync_resume_files
  for all using (true) with check (true);

-- 授权匿名角色读写
grant select, insert, update, delete on public.sync_resume_files to anon, authenticated;
```

> 跑完左侧 **Table Editor** 能看到 `sync_rooms` 和 `sync_resume_files` 两张表，就成功了。重复跑安全（都带 `if not exists`）。

---

## 二、在网站上怎么用

1. 打开 `https://hannah0707.github.io/hannah/`
2. 点右上角 **☁ 同步**
3. 在**数据最全的那台设备**（如电脑）输入一个同步码（至少 3 位，比如 `hannah888`），点 **📤 保存到云端**（文字 + 简历原文件一起上传）
4. 另一台设备打开同一网址，点 **☁ 同步**，输入**同一个**同步码，点 **📥 下载到本机** → 文字和简历原文件一起同步下来

不用注册、不用邮箱、不用验证邮件。换手机 / 电脑只需再输一次同步码即可恢复。

---

## 三、隐私与冲突说明

- 同步码相当于「房间钥匙」：知道这个码的人能读写对应数据，建议用不容易被猜到的码（别用 `123`）。
- 数据存储在你自己的 Supabase 项目里。
- 两台设备用同一同步码：以「云端最新一次保存」为准（last-write-wins）。同时编辑时，后保存的会覆盖先保存的，属正常现象。
