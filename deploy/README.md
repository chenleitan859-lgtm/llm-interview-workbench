# LLM 面试题学习工作台 · 部署指南

本目录是部署包：`index.html` 是完整的单文件应用（12 个主题 · 115 道题 · 完全离线，学习进度保存在访问者自己的浏览器里）。

## 方式一：腾讯云 Cloud Studio（推荐）

1. 把这个仓库推到 GitHub / Gitee（见文末「上传到 Git」）。
2. 打开 https://cloudstudio.net 并登录。
3. 点击「创建应用」→ 选择「从 Git 仓库导入」→ 选你的仓库。
4. 部署类型选「静态网站」，发布目录填 `deploy`（构建命令留空）。
5. 点击部署，几分钟后会得到一个类似 `https://xxxx.preview.cloudstudio.net` 的网址，发给任何人都能打开。

## 方式二：腾讯云 CloudBase 静态托管

1. 打开腾讯云控制台 → 搜索「云开发 CloudBase」→ 开通环境。
2. 左侧「静态网站托管」→ 上传文件，把本目录的 `index.html` 传上去。
3. 在「基础配置」里拿到默认域名即可访问。

## 上传到 Git（一次性准备）

```bash
git init
git add deploy workbench_src qa_data.json "LLM面试题学习工作台.html"
git commit -m "LLM 面试题学习工作台"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

> 学习进度说明：网站版和本地版使用同一套进度机制——自动保存在浏览器 localStorage，点「导出进度」得到 JSON 文件，换设备后「导入进度」即可同步。
