# 鲸鱼女仆 3D 虚拟形象 v1

这是根据参考插画程序化生成的**风格化近似版**，不是按参考图逐笔雕刻的成品模型。它的价值是：已经是一个可加载、可继续编辑的 **VRM 1.0** 形象，而不是一张平面图。

## 文件

| 文件 | 说明 |
| --- | --- |
| `whale-maid.vrm` | 最终 VRM 1.0，约 820 KB，53 个 Humanoid 骨骼，65 个网格，14 个材质 |
| `whale-maid.blend` | Blender 源文件，可继续修改 |
| `preview.png` | 正面预览 720×1080 |
| `preview-3q.png` | 3/4 预览 720×1080 |

## 规格

- 身高约 1.55 m，A-pose，面向 -Y
- 蓝发、女仆头饰/围裙、金色滚边、蓝色鲸尾；白丝袜、黑玛丽珍鞋
- 骨骼：VRM Humanoid 53 骨（含手指），尾巴/头发/衣服为刚性权重
- 材质：Principled BSDF 纯色材质（未使用 MToon）
- 元数据：作者“本地用户”，允许修改，禁止再分发，非商用

## 已验证

- Blender 4.5.15 + VRM Add-on 4.10.2 可重新导入
- 导入后 Humanoid 映射 53 骨，网格与材质完整
- GLB 结构包含 `VRMC_vrm` 扩展

## 在 DSH 中查看

1. 左侧栏打开 **3D 形象**
2. 点「选择模型」，选择 `virtual-avatar/model/whale-maid.vrm`
3. 可旋转、缩放、自动眨眼（模型暂无表情通道，所以表情按钮为空）

## 限制

- 造型由球体/锥体/圆柱/曲线拼成，细节远低于参考图；头发、衣服、手指需要后续雕刻与重拓扑
- **没有表情 Shape Keys**、没有 SpringBone、没有 MToon 材质
- 权重是“每个部件 100% 绑到一根骨”的刚性绑定，关节弯折会有硬边
- 没有贴图，全部纯色材质

## 继续改进的建议

1. 在 Blender 里雕刻/重拓扑头部与服装，头发改发片
2. 加 MToon 材质、贴图、眼睛高光
3. 加 `blink`、口型、`happy` 等 Shape Keys
4. 头发/尾巴/裙摆加 SpringBone
5. 重新导出 VRM 1.0，在本面板里验收动作

重建脚本：`../blender/build-avatar.py`（读取 `../blender/armature-test.blend`）。
