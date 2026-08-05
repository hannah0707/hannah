# 跨设备同步 · Supabase 配置说明

本站的「跨设备同步历史数据」基于 Supabase（免费层即可）。登录后，你的日记 / 打卡 / 心情 / 宠物等数据会自动存到云端，换设备登录同一账号即可恢复。

> ⚠️ 简历原文件存在浏览器 IndexedDB，**不参与云同步**，仅保存在本机。

---

## 一、在 Supabase 后台执行建表 SQL

1. 打开 https://supabase.com → 登录 / 注册 → **New project**（记住你设的数据库密码，本题用不到但需填）。
2. 左侧菜单 **SQL Editor → New query**。
3. 把下面整段 SQL 粘进去，点 **Run**。

```sql
-- 1) 用户状态同步表：每行存一个用户完整的 app 数据(jsonb)
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) 开启行级安全（RLS）：默认拒绝，只有显式策略允许才放行
alter table public.user_state enable row level security;

-- 3) 策略：用户只能读写自己的那一行
drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) updated_at 自动刷新触发器
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_state_updated on public.user_state;
create trigger trg_user_state_updated
  before update on public.user_state
  for each row execute function public.touch_updated_at();
```

执行后，左侧 **Table Editor** 应能看到 `user_state` 表。

---

## 二、开启邮箱登录

Supabase 默认已开启 Email 登录。如需确认：左侧 **Authentication → Providers → Email**，确保 `Enable Email` 是开着的。

（可选）若不想让用户注册后还要验证邮箱，可关闭 `Confirm email`（同一页面）。建议**保持开启**更安全。

---

## 三、配置站点（把 URL / Key 填进代码）

1. Supabase 左侧 **Project Settings → API**：
   - **Project URL**：形如 `https://xxxxxxxx.supabase.co`
   - **anon public key**：以 `eyJ` 开头的一长串
2. 打开 `js/app.js`，找到顶部这两行（搜索 `SYNC_SUPABASE_URL`）：

```js
const SYNC_SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SYNC_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

3. 把上面两个值替换进去（保留引号），保存。
4. 重新部署站点即可（push 到 `master`，GitHub Pages 会自动重建）。

> `anon public key` 是**设计为可放前端**的公开密钥，它只能在 RLS 策略允许的范围内读写你自己的数据，无法越权。真正的危险密钥是 `service_role`，**绝不要**放到前端。

---

## 四、使用方式

- 站点顶部栏点 **☁ 同步** → 输入邮箱 + 密码：
  - 已有账号 → **登录**：自动从云端拉取并刷新页面。
  - 新账号 → **注册**：创建账号并把当前本机数据推上云端。
  - **登出**：退出云同步（本机数据保留）。
- 登录状态下，每次改动会自动（防抖）上传；打开页面若云端有更新会自动拉取。

---

## 五、隐私与冲突说明

- 数据存到你自己的 Supabase 项目，他人无法访问（RLS 已限制只能读自己）。
- 登录态的会话令牌存在浏览器 localStorage，换设备需重新登录。
- 同一账号多设备：以「云端最新」为准（last-write-wins）。多设备同时编辑时，后保存的会覆盖先保存的——属正常现象，重要数据建议先等同步完成。
