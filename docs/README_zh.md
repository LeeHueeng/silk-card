# Silk Card

[한국어](../README.md) | [English](README_en.md) | **中文** | [日本語](README_ja.md)

**为 Home Assistant 打造的如丝般顺滑的交互式历史曲线卡片。**
像股票 App 一样按住拖动读数，切换时间范围时曲线平滑变形。无需任何配置即可拥有出色的外观。

![Silk Card preview](preview.png)

> 截图无法展现它的精髓 — 拖动读数和范围变形动画必须亲手体验。运行 `npm run demo` 试试看。

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/LeeHueeng/silk-card)](https://github.com/LeeHueeng/silk-card/releases)
[![License](https://img.shields.io/github/license/LeeHueeng/silk-card)](../LICENSE)

## 为什么选择 Silk？

现有的曲线卡片总是让你二选一：要么简约但停止维护，要么强大但 YAML 配置如同迷宫。Silk 打开了第三扇门：

- **时间轴拖动读数** — 在图表上任意位置按住拖动，即可读取该时刻的精确数值和时间，就像金融和健康类 App 一样。触屏和鼠标均支持。
- **范围切换变形动画** — 点击 `1H / 12H / 1D / 1W / 1M` 时间片，曲线会流畅地变形到新的时间窗口，而不是生硬地重绘。
- **默认即美观** — 平滑的单调曲线（无虚假过冲）、柔和的渐变填充、跳动的当前值光点、最大/最小值标记、变化量徽章。全部自动适配主题。
- **长时间范围开箱即用** — 短窗口使用原始历史数据；长窗口自动切换到 Home Assistant 长期统计数据，即使 recorder 清除了旧数据，一个月的曲线也照常显示。
- **极致轻量** — 手写 SVG 渲染，不依赖任何图表库。只有一个小小的 JS 文件。

## 安装

### HACS（推荐）

1. HACS → 右上角三点菜单 → **Custom repositories**
2. 添加 `https://github.com/LeeHueeng/silk-card`，类别选择 **Dashboard**
3. 搜索 **Silk Card**，安装并刷新

### 手动安装

从[最新发布版](https://github.com/LeeHueeng/silk-card/releases)下载 `silk-card.js`，复制到 `config/www/`，然后添加为仪表盘资源：

```yaml
url: /local/silk-card.js
type: module
```

## 快速开始

```yaml
type: custom:silk-card
entity: sensor.living_room_temperature
```

就这么简单。卡片自带完整的可视化编辑器，你可能完全不需要写 YAML。

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `entity` | string | — | 要绘制的实体（或使用 `entities`） |
| `entities` | list | — | 多个实体；字符串或对象（见下文） |
| `name` | string | 实体名称 | 卡片标题 |
| `icon` | string | — | 标题旁的图标（可选） |
| `hours_to_show` | number | `24` | 初始时间窗口 |
| `ranges` | list | `[1h, 12h, 1d, 1w, 1m]` | 时间片（`Nh`、`Nd`、`Nw`、`Nm`） |
| `range_selector` | boolean | `true` | 显示时间片选择器 |
| `fill` | boolean | `true` | 曲线下方渐变填充 |
| `extremes` | boolean | `true` | 最大/最小值标记 |
| `delta` | boolean | `true` | 变化量徽章 |
| `color` | string | 主题主色 | 曲线颜色（任意 CSS 颜色） |
| `line_width` | number | `2.5` | 曲线粗细 |
| `points` | number | `120` | 重采样分辨率 |
| `unit` | string | 实体单位 | 单位覆盖 |
| `y_min` / `y_max` | number | 自动 | 固定 y 轴范围 |

### 多实体

```yaml
type: custom:silk-card
name: Climate
entities:
  - entity: sensor.living_room_temperature
    name: 客厅
  - entity: sensor.bedroom_temperature
    name: 卧室
    color: '#f0b357'
hours_to_show: 48
```

点击图例可以单独高亮某条曲线，再次点击恢复。

### 更多示例

极简模式：

```yaml
type: custom:silk-card
entity: sensor.energy_power
range_selector: false
extremes: false
delta: false
```

湿度固定量程：

```yaml
type: custom:silk-card
entity: sensor.bathroom_humidity
y_min: 0
y_max: 100
```

## 路线图

- [ ] 属性绘图（每条曲线的 `attribute:`）
- [ ] 能源/消耗类传感器的柱状模式
- [ ] 双指缩放调整时间范围
- [ ] 长范围下可选 `sum`/`min`/`max` 统计

欢迎提交 Issue 和 PR。

## 开发

```bash
npm install
npm run watch     # 文件变更时自动重新构建（含 sourcemap）
npm run demo      # 构建并启动演示页面 http://localhost:5050/demo/
npm run typecheck
```

`demo/` 页面使用模拟的 `hass` 对象和生成数据驱动卡片 — UI 开发无需 Home Assistant。

## 许可证

[MIT](../LICENSE)
