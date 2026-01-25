---
title: Mizuki 魔改日志
description: 记录Mizuki魔改的日志，方便版本升级时翻阅
published: 1999-01-02
date: 2026-01-21
tags:
  - 何意味
category: 碎碎念
draft: false
pinned: false
# image: ./img/defalut-cover.png
---

本篇文章长期更新，且实时记录本站所有魔改框架记录。不包含文章页面的更新

::github{repo="olinll/mizuki"}

提交记录：[Commits](https://github.com/olinll/mizuki/commits/main/)

# Initial commit Mizuki v8.0 f767544

时间：2026-01-21

commit：[dcc1346](https://github.com/olinll/mizuki/commit/dcc1346c0d22ec68b1491f5633be30da60069b33)

初始化Mizuki V8.0

https://github.com/matsuzaka-yuki/Mizuki/releases/tag/8.0

# refactor: 重构项目结构和配置

时间：2026-01-21

commit：[ef39e4e](https://github.com/olinll/mizuki/commit/ef39e4e113c016c88a9fcb06aaa59718dbd4e0f0)

refactor: 重构项目结构和配置

- 将图片资源移动到docs目录并删除旧文件
- 修改new-post.js模板，添加默认描述和封面图
- 调整页面宽度常量从90rem改为75rem
- 更新GitHub issue模板和PR模板为中文
- 添加clean.js脚本用于清理构建缓存
- 更新Navbar图标样式
- 删除.env.example示例文件
- 更新CI工作流分支从master改为main
- 移动README文件到docs目录并更新内容
- 更新package.json添加clean和rebuild脚本
- 添加baseline-browser-mapping依赖
- 在文章页面添加描述显示功能

# feat(assets): 添加新的日文字体文件

时间：2026-01-21

commit：[ba0e0db](https://github.com/olinll/mizuki/commit/ba0e0db0a356c99ea4a0e4d0e6d7c3c01d8ee5bb)

feat(assets): 添加新的日文字体文件

添加 ZenMaruGothic-Medium.woff2 和 源暎ゴシック 第二版.woff2 字体文件，用于支持日文显示需求

# 迁移原有mizuki文档教程到posts-mizuki备用

时间：2026-01-21

commit：[70f2f49](https://github.com/olinll/mizuki/commit/70f2f49af6051c552c502bc157ccd58a820595e5)

迁移原有mizuki文档教程到posts-mizuki备用

# fix(i18n): 修正中文翻译"关于我们"为"关于"

时间：2026-01-21

commit：[a0b5417](https://github.com/olinll/mizuki/commit/a0b541723a311f56dadb7ee6c0bcb233b31fdae3)

fix(i18n): 修正中文翻译"关于我们"为"关于"refactor(config): 恢复tailwind断点默认值并调整侧边栏布局断点 调整移动端、平板端和桌面端的断点值为1024px，保持响应式设计一致性 feat(analytics): 启用Umami统计功能

# 修改ci Name

时间：2026-01-21

commit：[b21dc9e](https://github.com/olinll/mizuki/commit/b21dc9e2e9cbdcf6c9a6c3256e6fe11e5ad408ba)


# feat(Footer): 添加ICP备案信息和构建版本显示
时间：2026-01-21
commit：[6da0ff1](https://github.com/olinll/mizuki/commit/6da0ff1fa58974678dae3debe6468bbff74e0bca)
feat(Footer): 添加ICP备案信息和构建版本显示

在页脚组件中添加ICP备案图标和链接，并显示当前构建的commit hash和日期 同时调整了页面的布局样式和链接内容

# perf(transition): 优化页面切换和动画延迟时间
时间：2026-01-22
commit：[7132e54](https://github.com/olinll/mizuki/commit/7132e546b35a88823427c6b4e528646c42465f79)
perf(transition): 优化页面切换和动画延迟时间

减少页面切换相关操作的延迟时间，从50-300ms降低到20-150ms 缩短CSS动画持续时间，提升页面响应速度

# refactor(umami): 优化缓存机制并添加脚本属性
时间：2026-01-22
commit：[b81e171](https://github.com/olinll/mizuki/commit/b81e1711a149c341a25781317b7396d1b3c68860)
refactor(umami): 优化缓存机制并添加脚本属性

将本地存储缓存改为内存缓存以适配单页应用场景 为umami脚本添加id和数据持久化属性

# feat(Profile): 用户卡片 添加全站文章统计和字数统计功能
时间：2026-01-22
commit：[aed5451](https://github.com/olinll/mizuki/commit/aed5451d086431e9a6e4bd7fa9c823c5160daa58)

feat(Profile): 用户卡片 添加全站文章统计和字数统计功能

新增文章总数和总字数统计展示，包括： 1. 计算并显示博客文章总数 2. 实现精确的字数统计逻辑（区分CJK和非CJK字符） 3. 添加动画效果的数字增长展示 4. 优化统计信息的UI布局

# feat(文章组件): 优化文章卡片和元数据显示
时间：2026-01-22
commit：[849f8ec](https://github.com/olinll/mizuki/commit/849f8ec7fde734cc7bd470c8112ab2a69f740e89)

feat(文章组件): 优化文章卡片和元数据显示

添加文章描述显示功能并重构文章卡片布局 新增文章访问量和访客统计显示 调整元数据组件支持简洁模式

