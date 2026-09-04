# 番茄时钟与待办

个人专注与任务管理工具。以“龙场静修”为视觉主题，整合番茄钟、日程提醒、待办管理、灵感归档与统计分析。

![应用首页](src/assets/longchang-awakening-hero.png)

> 数据仅保存在本地，无需账户，不会上传到服务器。

## ⚡️ 最短安装路径

**三步使用（5 分钟）**：

1. **下载** [Windows 安装包 v1.0.1](https://github.com/Dream-will-come-true-oneday/Tomato_todo_list/releases/download/v1.0.1/longchang-pomodoro-todo-setup-1.0.1.exe)
2. **双击**安装包，按向导完成（如遇安全提示：选"更多信息 > 仍要运行"）
3. **桌面双击**启动，进入托盘即完成

**升级**：运行新版安装包覆盖安装（数据保留）或应用内检查更新。

---

## 📋 核心功能

- **番茄钟**：自定义专注/休息时长，Space 开始/暂停，结束时间计算不漂移
- **日程提醒**：19 项默认作息模板，Windows 版驻留托盘自动调度
- **待办管理**：支持短期/长期、父子任务、日期优先级、每日打卡
- **今日安排**：待办自动纳入当日计划，番茄钟只绑定今日安排
- **灵感池**：按标签归档，支持 Markdown 记录
- **统计复盘**：完成类型饼图、周总结趋势、每日反思、周复盘
- **撤销重做**：破坏性操作后 8 秒内可撤销，或 Ctrl+Z / Ctrl+Shift+Z
- **数据安全**：版本化本地存储，一键导出/导入全量备份

---

## 👨‍💻 开发运行

```powershell
npm install
npm run dev        # 浏览器开发 (http://127.0.0.1:5173/)
npm run desktop:dev # Electron 桌面版开发
npm test           # 运行测试
npm run build:desktop # 构建 Windows 安装包 → release/

---

## 🔧 技术栈

React 18 + TypeScript · Vite · Electron + Builder · electron-updater · Vitest

## 📄 License

MIT
