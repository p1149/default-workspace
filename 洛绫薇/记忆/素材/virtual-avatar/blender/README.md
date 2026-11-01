# Blender 工作区（VRM）

## 已安装环境

- Blender **4.5.15 LTS**：`D:\dsh\apps\blender\blender.exe`
- VRM Add-on for Blender **4.10.2**（扩展 `bl_ext.user_default.vrm`，已启用）
  - 导入：`File → Import → VRM`
  - 导出：`File → Export → VRM`（选择 VRM 1.0）
- 已验证 `bpy.ops.import_scene.vrm` / `bpy.ops.export_scene.vrm` 均可用。

## 起始工程

双击 `whale-maid-starter.blend`，或运行：

```powershell
& 'D:\dsh\apps\blender\blender.exe' 'C:\Users\76927\Documents\deepseek-harness\default-workspace\virtual-avatar\blender\whale-maid-starter.blend'
```

工程内容：

- **Reference** 集合：`FrontReference` 正面全身参考图（已打包进 .blend，隐藏渲染）；`HeadReference` 头部参考默认隐藏，可在 Outliner 里打开。
- **Model / Hair / Outfit / Tail**：空的建模集合，建模时把对象放进去。
- **Rig**：`ArmatureGoesHere` 占位，建好网格后在这里加 Humanoid 骨架。
- **Setup**：相机（正面 55mm）、主光/补光、地面；相机已设为场景相机。
- `BRIEF` 文本块：项目要点，直接在 Blender 的 Text Editor 查看。
- 单位：米，1 unit = 1 m；FPS 60。

## 建模到 VRM 的顺序

1. 在 `BodyBase` 位置建身体/头部；按参考图对齐比例（约 1.55 m、6.5 头身）。
2. 头发拆前发/侧发/后发/呆毛/耳鳍，放 `Hair`；裙子和围裙放 `Outfit`；鲸尾放 `Tail`。
3. UV + MToon 材质（VRM 扩展自带 MToon 节点组）。
4. 在 `Rig` 加 Humanoid 骨架，做权重；尾巴/头发/裙摆加辅助骨。
5. 做表情 Shape Keys，在 VRM 面板映射 `blink` / `aa` / `happy` 等预设。
6. 设置 SpringBone（头发、尾巴、裙摆）与碰撞体。
7. `File → Export → VRM`，选 VRM 1.0；用 VRM Validator 检查。

详细步骤、分层清单、参数和验收标准见 [`../3d-production-guide.md`](../3d-production-guide.md)。

## 说明

- 起始工程只是空场景 + 参考图 + 相机灯光，**不包含角色模型**；模型需要建模完成。
- VRoid Studio 未安装（官方 CDN 从本机只有约 20–70 KB/s，483 MB 需要 2 小时以上）；本工作区按纯 Blender 路线准备。
- 参考图来自用户提供的插画；公开分发模型前请确认原图授权。
