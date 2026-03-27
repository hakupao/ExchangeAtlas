# Exchange Atlas

<div align="center">
  <p><strong>一个适合公开展示、个人作品集和实际访问的双语汇率看板。</strong></p>
  <p>A bilingual exchange-rate dashboard built with Vanilla JavaScript, Chart.js, and the Frankfurter API.</p>

  <p>
    <a href="https://exchange.bojiang.org">
      <img src="https://img.shields.io/badge/Live%20Demo-exchange.bojiang.org-0f766e?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" />
    </a>
    <img src="https://img.shields.io/badge/Vanilla%20JS-ES2023-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E" alt="Vanilla JS" />
    <img src="https://img.shields.io/badge/Chart.js-4.4-ff6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js" />
    <img src="https://img.shields.io/badge/API-Frankfurter-1d4ed8?style=for-the-badge" alt="Frankfurter API" />
    <img src="https://img.shields.io/badge/UI-Bilingual%20%2B%20Responsive-7c3aed?style=for-the-badge" alt="Bilingual and Responsive UI" />
  </p>

  <p>
    <a href="https://exchange.bojiang.org"><strong>在线体验</strong></a>
    ·
    <a href="https://www.frankfurter.app"><strong>数据源</strong></a>
    ·
    <a href="./assets/preview-home.png"><strong>查看预览图</strong></a>
  </p>
</div>

<p align="center">
  <a href="https://exchange.bojiang.org">
    <img src="./assets/preview-home.png" alt="Exchange Atlas homepage preview" width="100%" />
  </a>
</p>

## 项目简介

Exchange Atlas 是一个面向真实访问场景设计的轻量汇率观测站，聚焦常用币种对的实时汇率与历史走势。它不是单纯的接口练习页，而是一个可以直接放进个人作品集、公开仓库首页、简历项目列表里的完整小产品。

如果需要用一个仓库说明我能否把「界面设计、API 接入、交互反馈、国际化、响应式适配、静态部署」串成一个可访问成果，这个项目就是一个直接可验证的例子。

## 在线体验

- 生产地址: [https://exchange.bojiang.org](https://exchange.bojiang.org)
- 访问方式: 直接打开即可使用，无需登录、无需安装、无需构建
- 展示价值: 适合作为前端作品集首页项目、独立开发案例、GitHub 公开仓库封面项目

## 核心亮点

- 实时汇率卡片: 覆盖 `USD/CNY`、`USD/JPY`、`CNY/JPY`、`JPY/CNY`、`AUD/CNY`、`AUD/JPY` 六组常用币种对，并每 `60` 秒自动刷新。
- 历史趋势图表: 支持 `7 天 / 30 天 / 6 个月 / 1 年 / 3 年` 五档时间范围，适合快速查看波动趋势。
- 双语界面: 提供中文与 English 切换，并将语言偏好写入 `localStorage`。
- 响应式体验: 桌面端与移动端都有完整信息层级，不是只在大屏可用的静态截图项目。
- 零构建部署: 纯静态前端结构，无需打包链路，部署和复用成本低。

## 这个仓库展示了什么

- 产品化能力: 从标题、指标区、实时卡片、趋势图、状态提示到页脚信息，已经具备一个完整小产品的结构，而不是零散组件拼接。
- 原生前端基本功: 使用 HTML、CSS、Vanilla JavaScript 完成模块拆分、状态管理、异步请求和交互联动，不依赖框架也保持清晰组织。
- 数据可视化实现: 通过 Chart.js 渲染历史折线图，并加入 crosshair 交互增强图表可读性。
- 国际化与细节处理: 中英文文案切换、时间格式更新、加载状态、错误状态、工作日汇率说明都已经纳入交付范围。
- 视觉表达能力: 使用渐变背景、玻璃态面板、字体对比和轻量动效，让页面既像工具，也像一个可公开展示的品牌化作品。

## 适用场景

- 个人作品集或 GitHub 仓库首页，作为一个打开就能看的前端展示项目
- 面试、合作沟通或接单场景中，快速说明自己具备从设计到落地的完整交付能力
- 跨境业务、旅行换汇、外贸观察等需要快速查看主流币种变化的轻量场景
- 作为静态站点、Vanilla JavaScript、Chart.js、前端国际化的学习参考

## 技术栈

| 模块 | 方案 |
| --- | --- |
| 前端 | `HTML5` + `CSS3` + `Vanilla JavaScript` |
| 图表 | `Chart.js` |
| 数据源 | `Frankfurter API` |
| 国际化 | 自定义 `i18n` 字典 + `localStorage` |
| 部署形态 | 静态站点 |
| 线上地址 | `https://exchange.bojiang.org` |

## 本地运行

由于浏览器对本地文件协议下的 `fetch` 有限制，建议通过静态服务器启动项目。

```bash
python -m http.server 8000
```

然后访问 [http://localhost:8000](http://localhost:8000)。

## 项目结构

```text
.
├─ index.html
├─ styles.css
├─ app.js
├─ app.core.js
├─ app.i18n.js
├─ app.rates.js
├─ app.chart.js
├─ app.controls.js
└─ assets/
   └─ preview-home.png
```

- `index.html`: 页面结构与主区域布局
- `styles.css`: 渐变背景、卡片、按钮、图表容器和响应式样式
- `app.core.js`: 全局状态、公共工具、币种对与时间范围配置
- `app.i18n.js`: 中英文文案与语言切换逻辑
- `app.rates.js`: 实时汇率卡片渲染与刷新逻辑
- `app.chart.js`: 历史汇率请求与图表绘制
- `app.controls.js`: 币种、时间范围和交互事件绑定
- `app.js`: 应用初始化入口

## 数据来源

- 汇率数据来自 [Frankfurter](https://www.frankfurter.app)
- 历史数据以工作日汇率为准，非交易日可能不会返回新的采样点

## 总结

这是一个体量不大，但完成度很高的前端项目样本。它足够轻，便于快速打开和理解；也足够完整，能够展示界面审美、工程组织、API 集成、数据可视化和公开部署能力。
