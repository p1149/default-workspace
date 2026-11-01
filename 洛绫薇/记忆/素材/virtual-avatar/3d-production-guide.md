# 鲸鱼女仆「大肥鱼」3D 虚拟形象制作说明（VRM）

> 参考图：`virtual-avatar/source.jpg`（1530×2741，正面全身）
> 目标：一个可在 Blender / three-vrm / DSH 中加载、能做眨眼与口型、头发和鲸尾有轻微物理的 VRM 1.0 形象。
> 结论：单张正面图只能作为参考，不能自动转成 VRM；本说明按「VRoid 打底 + Blender 改造」这条最现实的路线写。

## 0. 交付物

```
whale-maid/
├─ whale-maid.blend          # 可继续编辑的源文件
├─ whale-maid.vrm            # 最终 VRM 1.0
├─ textures/                 # 贴图（建议 2048，PNG）
├─ preview-front.png         # 正面预览（透明或纯色背景）
├─ preview-three-quarter.png # 3/4 预览
└─ README.md                 # 版本、骨骼、表情、材质说明
```

验收硬指标：

- VRM 1.0，Humanoid 骨骼完整，T/A-pose 无破面
- 身高一致（建议 1.55 m 左右），脚底在原点平面
- 三角面建议 30k–60k（DSH 悬浮挂件），上限不超过 100k
- 材质 4–8 个，主贴图 2048×2048 以内
- 表情至少包含：`blink`、`blinkLeft`、`blinkRight`、`aa/ih/ou/ee/oh`、`happy`、`sad`、`angry`、`relaxed`、`surprised`、`lookUp/Down/Left/Right`
- 头发、鲸尾、裙摆有 SpringBone，静止时不抖动
- VRM Validator 0 error；three-vrm 中加载无 warning 级别的材质/骨骼问题

## 1. 参考与设定

现有素材：

- `source.jpg`：正面全身，用于比例、服装、配色
- `portrait.jpg` / `bust.jpg`：头部与半身，用于五官、发饰、领口
- 原图右下角有 B 站水印；3D 模型不要直接贴原图纹理，按结构重建

建模前需要补的参考（否则只能靠想象）：

1. 侧面全身（确认鼻子、后脑、裙摆厚度、尾巴走向）
2. 背面全身（后发、围裙绑带、尾巴根部）
3. 头发分区：前发、侧发、后发、呆毛、耳鳍
4. 眼睛特写：眼白、虹膜、瞳孔、高光、上下眼睑
5. 服装细节：女仆头饰、胸前蝴蝶结、袖口、围裙荷叶边、金色刺绣
6. 配色板（从原图取样，近似值）：

| 部位 | 近似色 |
| --- | --- |
| 头发根部 | `#26335F` |
| 发梢 | `#7FD6E8` |
| 眼睛 | `#3F8FD8` |
| 连衣裙 | `#232B4D` |
| 白色围裙/花边 | `#F2F0EA` |
| 金色刺绣 | `#C9A45C` |
| 鲸尾 | `#3B4F9E` |
| 鞋 | `#1B1D2A` |

建议比例：约 6.5 头身，头略大，肩窄，裙摆外扩；整体保持原图的温和、书卷气。

## 2. 路线 A：VRoid Studio 快速近似（1–3 天）

适合先得到一个能动的身体，再进 Blender 改。

1. 安装 VRoid Studio，新建女性角色，身高调到 1.55 m 左右。
2. 脸型、眼睛、眉毛按 `portrait.jpg` 调整；虹膜用蓝色渐变。
3. 头发：用 VRoid 的发束工具做前发、侧发、后发、呆毛；发色做深蓝到青色的渐变。
4. 服装：用内置女仆装近似，重点对齐领口、白色围裙和袖口；金色刺绣可以后期贴图。
5. 耳鳍、鲸尾、头饰：VRoid 里用饰品/头发近似，或者导出后进 Blender 补。
6. 导出 VRM，再进 Blender 做尾巴、裙摆、材质和表情精修。

限制：VRoid 的脸和衣服是模板化的，不会和原图 1:1；适合“先有形象”，不适合高还原。

## 3. 路线 B：Blender 精修（推荐，1–2 周）

### 3.1 环境

- Blender 4.x（LTS 即可）
- VRM Add-on for Blender（官方 VRM 1.0 导入/导出）
- 可选：CATS Blender Plugin（骨骼/权重辅助）、Rigify（不用于最终 VRM 骨骼，只做辅助）
- 单位：Metric，1 unit = 1 m；应用所有缩放（Ctrl+A → Scale）

### 3.2 建模顺序

1. **身体基底**：从 VRoid 导出的 VRM 或基础人体开始，重拓扑成干净的四边面；肩、肘、膝、髋留环线。
2. **头部**：脸部轮廓、鼻子、嘴；眼睛用贴图 + 眼睑网格，不要只画在脸上，否则无法眨眼。
3. **头发**：发片（hair cards）而不是实心块；前发、侧发、后发、呆毛、耳鳍分层；发梢做透明渐变。
4. **服装**：连衣裙、白色围裙、荷叶边、袖口、胸前蝴蝶结；裙摆用独立环线，方便加骨骼和物理。
5. **鲸尾**：从腰后伸出，3–5 段环线，保证能弯；尾鳍单独建模；注意和裙摆的穿插。
6. **配件**：女仆头饰、金色刺绣（贴图或少量几何）、鞋子、白色连裤袜。
7. **书**：可选道具，绑定到手骨；不作为身体的一部分。

### 3.3 UV 与材质

- 一张 2048 图集优先：皮肤、头发、衣服、眼睛可分区；眼睛建议单独 512–1024。
- 使用 MToon（VRM Add-on 自带）做卡通材质；头发高光用 matcap/贴图，不用 PBR 金属度。
- 透明部分（发梢、裙边）用 alpha clip，避免 alpha blend 排序问题。
- 眼睛高光最好做在虹膜贴图里，减少透明层。

### 3.4 骨骼

- 使用 VRM Humanoid 的标准骨骼：Hips、Spine、Chest、UpperChest、Neck、Head、Shoulder、UpperArm、LowerArm、Hand、UpperLeg、LowerLeg、Foot、Toes。
- 手指至少做拇指、食指、中指、无名指、小指各 3 节；不做手指也要在 VRM 里标记为可选。
- 尾巴：`Tail01`–`Tail04` 链式骨骼，根在腰后，沿尾巴走向。
- 头发：前发/侧发/后发各 2–3 根辅助骨；裙摆 4–8 根辅助骨。
- 骨骼命名用英文；导出前在 VRM 面板里做 Humanoid 映射，检查左右手/脚没有镜像错。

### 3.5 权重

- 肩、腋下、髋、裙摆是重点；用平滑权重，避免大动作破面。
- 每个顶点最多 4 个骨骼影响（VRM 常见限制）。
- 尾巴根部和裙摆权重分开，避免尾巴摆动时拉坏裙子。

### 3.6 表情（Shape Keys / Expressions）

至少做以下形态键，并在 VRM 面板映射到预设：

- 眨眼：`blink`、`blinkLeft`、`blinkRight`
- 口型：`aa`、`ih`、`ou`、`ee`、`oh`
- 情绪：`happy`、`sad`、`angry`、`relaxed`、`surprised`
- 视线：`lookUp`、`lookDown`、`lookLeft`、`lookRight`（可用眼球骨或形态键）

注意：

- 眼睑闭合要覆盖虹膜，不要只压扁眼睛。
- 口型不要带动下巴破面；嘴内部做深色口腔。
- 表情叠加时（如 happy + blink）不要互相穿模。

### 3.7 物理（SpringBone）

- 头发：每束 2–3 段， stiffness 中等，避免抖。
- 鲸尾：3–5 段，稍慢、幅度大一点，体现重量。
- 裙摆：4–8 根，幅度小，避免穿腿。
- 设置 collider：头、胸、腰、腿，防止头发/尾巴穿身体。
- 在 three-vrm 中逐帧 `update` SpringBone，并限制 delta time。

### 3.8 导出

1. 应用所有修改器（Armature 除外）和变换。
2. 删除隐藏物体、摄像机、灯光、参考图。
3. `File → Export → VRM`，选择 VRM 1.0。
4. 检查 Humanoid、Expressions、SpringBone、MToon 材质、纹理路径。
5. 用 VRM Validator 和 three-vrm 各加载一次；检查 T-pose、表情、物理。

## 4. 在 DSH 中使用

- 用 three.js + `@pixiv/three-vrm` 加载 `.vrm`；场景里加相机、环境光、方向光。
- 常用 API：
  - `vrm.expressionManager.setValue('blink', 1)`
  - `vrm.humanoid.getNormalizedBoneNode('head').rotation.y = ...`
  - `vrm.lookAt.target = camera`
  - `vrm.springBoneManager.update(delta)`
- 放进 `shell.overlay` 做右下角悬浮形象；点击切换台词/表情；鼠标移动做轻微视线跟随。
- 注意：Client 插件默认只有 React 模块表；three/three-vrm 需要作为外部依赖被打包或由包行提供，不能直接 `require('three')` 就假设存在。接入前先确认模块供应方式。
- 性能：悬浮形象建议 30–60k 面、4–8 材质、2K 贴图；移动端再降一半。

## 5. 验收清单

- [ ] Humanoid 骨骼完整，左右对称，脚底在 y=0
- [ ] T-pose / A-pose 无破面，肩、腋、髋、裙摆正常
- [ ] blink / 口型 / 情绪表情可用，叠加不穿模
- [ ] 头发、尾巴、裙摆有物理，静止不抖
- [ ] 透明材质排序正常，发梢无黑边
- [ ] VRM Validator 0 error
- [ ] three-vrm 中加载成功，动画 60fps 稳定
- [ ] 文件命名、贴图路径、版本说明齐全

## 6. 工作量参考

| 方式 | 时间 | 还原度 |
| --- | --- | --- |
| VRoid 近似 | 1–3 天 | 中低，模板脸/服装 |
| VRoid 打底 + Blender 改尾巴/服装/表情 | 1–2 周 | 中高 |
| Blender 从零精模 + 绑定 | 3–6 周 | 高，但需要侧/背参考 |
| 委托建模师 | 取决于报价与修改轮次 | 高 |

## 7. 给建模师的一页 Brief（可直接复制）

> 角色：蓝发鲸鱼女仆，约 6.5 头身，1.55 m。深蓝到青色渐变长发、呆毛、耳鳍、蓝色眼睛、女仆头饰；深蓝连衣裙 + 白色围裙/荷叶边 + 金色刺绣 + 白色蝴蝶结；蓝紫色鲸尾；白色连裤袜、黑色玛丽珍鞋。风格：日系二次元、柔和、书卷气。目标：VRM 1.0，30–60k 三角面，MToon，眨眼/口型/情绪，头发/尾巴/裙摆 SpringBone。参考图：正面全身 + 头部特写；需要补侧/背视图。交付：blend + vrm + 贴图 + 预览 + README。禁止直接使用原图贴图；按结构重建。

---

如果你确认走 3D/VRM 路线，我建议下一步先做 **VRoid 近似版**验证骨骼与 DSH 加载，再决定是否投入 Blender 精修；我这边可以负责 DSH 的 three-vrm 接入、动作控制和验收脚本。
