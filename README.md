# 中文原生 AI 科研助手

本目录现在同时包含：

- 一套面向管理学者的中文优先 AI 研究助手产品设计方案
- 一个可本地运行的零依赖应用原型

产品定位为“中文原生科研操作系统”，强调中文界面、学术级中英双语处理、术语一致性和科研工作流整合。

## 运行应用

由于当前线程使用工作区自带 Node 运行时，建议用下面的命令启动：

```powershell
& 'C:\Users\weiyi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

启动后访问：

`http://localhost:3000`

## 应用包含的核心体验

- 今日论文中文推送
- 论文详情页
- 一键翻译全文
- 只看中文总结
- 对照阅读（中英双栏）
- hover 查看术语解释
- 点击变量查看定义
- 中文科研工作流中心
- 个性化术语偏好展示

## 文档清单

- [产品需求文档 PRD](C:\Users\weiyi\Documents\Codex\2026-04-19-you-are-an-ai-system-designer-2\docs\01-产品需求文档-PRD.md)
- [信息架构与界面设计](C:\Users\weiyi\Documents\Codex\2026-04-19-you-are-an-ai-system-designer-2\docs\02-信息架构与界面设计.md)
- [翻译引擎与系统架构](C:\Users\weiyi\Documents\Codex\2026-04-19-you-are-an-ai-system-designer-2\docs\03-翻译引擎与系统架构.md)
- [科研工作流与智能体设计](C:\Users\weiyi\Documents\Codex\2026-04-19-you-are-an-ai-system-designer-2\docs\04-科研工作流与智能体设计.md)
- [示例页面与论文翻译结果](C:\Users\weiyi\Documents\Codex\2026-04-19-you-are-an-ai-system-designer-2\docs\05-示例页面与论文翻译结果.md)
- [技术实现建议与数据模型](C:\Users\weiyi\Documents\Codex\2026-04-19-you-are-an-ai-system-designer-2\docs\06-技术实现建议与数据模型.md)

## 产品一句话定位

这是一个以中文为科研思考主语言、以英文为学术发表接口、面向管理学者的 AI 科研操作系统。

## 核心能力

- 中文优先界面与科研流程
- 学术论文深度翻译与中英对照阅读
- 术语和变量级一致性管理
- 文献综述、变量构建、实证解释、写作双轨工作流
- 用户术语偏好与研究主题个性化

## 建议阅读顺序

1. 先看 PRD，理解产品边界与目标用户。
2. 再看信息架构与界面设计，理解系统如何服务中文科研场景。
3. 再看翻译引擎和技术实现，理解如何把产品做出来。
