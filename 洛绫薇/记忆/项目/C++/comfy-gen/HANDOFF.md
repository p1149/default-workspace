# 交接文档 · 本地 AI 出图环境

归档日期：2026-10-29
会话主题：从"写一份生图提示词"演变为"在本机搭一套完全离线的出图环境"

---

## 一、结论先说

本机现在有一套**可用、离线、零成本**的 AI 出图系统：

- 硬件：RTX 3060 Laptop **6GB** 显存 + Ryzen 7 5800H + 16GB 内存
- 出图速度：1024×1536 约 **45 秒/张**，832×1216 约 **26 秒/张**
- 双底模：写实人像（RealVisXL V5）+ 二次元角色（Animagine XL 3.1）
- 无需任何 API key，不产生费用，图片不出本机

已交付：写实「猫系慵懒脸」4 张、神里绫华 3 张。全部在 `comfy-gen/deliveries/`。

## 二、任务脉络

| 阶段 | 用户诉求 | 结果 |
|---|---|---|
| 1 | 给一段中文人像描述 | 产出结构化提示词（中/英/负面/参数） |
| 2 | 「生成图片」 | 无出图能力，先做了 API 版工具（`seedream-gen`） |
| 3 | 「不用 token 怎么办」 | 盘点硬件，规划本地部署方案 |
| 4 | 「开始」 | 装 ComfyUI + RealVisXL，跑通并迭代 7 版提示词 |
| 5 | 「神里绫华」 | 补二次元底模 Animagine XL 3.1 + 4x 放大模型 |

`seedream-gen`（火山方舟 API 版）已完成但**从未真正出图**：只验证到"假 key 返回 401"，说明请求链路正确。要用得提供 `ARK_API_KEY`。

## 三、交付物

### 写实 · 猫系慵懒脸

| 文件 | 尺寸 | seed | 说明 |
|---|---|---|---|
| `cat-lazy_A_primary.png` | 1024×1536 | 1001 | 综合最贴合：肩部可见、窗边侧光、半垂眼 |
| `cat-lazy_B_face.png` | 1024×1536 | 666 | 脸型最准：短方圆、饱满脸颊、猫系眼神 |
| `cat-lazy_C_window.png` | 1024×1536 | 888 | 氛围最强：毛衣质感、窗边灰调 |
| `cat-lazy_D_hires.png` | 1664×2432 | 444 | 分辨率最高，但放大后脸型偏长 |

最优提示词：`prompts/07-catlazy-pos.txt`（负向 `04-catlazy-neg.txt`）

### 二次元 · 神里绫华

| 文件 | 尺寸 | seed | 说明 |
|---|---|---|---|
| `ayaka_A_4x.png` | **3328×4864** | 5555 | 主交付，回头视角，4x ESRGAN 纯放大 |
| `ayaka_B_front.png` | 832×1216 | 4242 | 正面半身，和服与背后蝴蝶结 |
| `ayaka_C_profile.png` | 832×1216 | 8888 | 侧脸近景，面部结构最接近原设 |

最优提示词：`prompts/ayaka-03-pos.txt`（负向 `ayaka-03-neg.txt`）

## 四、环境清单

| 组件 | 路径 | 大小 | 来源 |
|---|---|---|---|
| ComfyUI 0.43.0 便携版 | `D:\dsh\comfyui\ComfyUI_windows_portable` | 17.26 GB | github release `v0.43.0`，经 `gh-proxy.com` 加速 |
| RealVisXL V5.0 fp16 | `...\models\checkpoints\RealVisXL_V5.0_fp16.safetensors` | 6.46 GB | hf-mirror `SG161222/RealVisXL_V5.0` |
| Animagine XL 3.1 | `...\models\checkpoints\animagine-xl-3.1.safetensors` | 6.46 GB | hf-mirror `cagliostrolab/animagine-xl-3.1` |
| 4x-AnimeSharp | `...\models\upscale_models\4x-AnimeSharp.pth` | 63.9 MB | hf-mirror `Kim2091/AnimeSharp` |
| 出图客户端 | `D:\dsh\builds\comfy-gen\comfy_gen.exe` | 120 KB | 本项目源码编译 |

内置运行时：Python 3.13.14 + torch 2.14.1+cu130（便携版自带，不需要系统 Python）。

> 系统里的 Python 是 3.15，**装不了 torch**（官方无 3.15 轮子），所以必须用便携版自带的 3.13，别去系统 Python 里折腾。

## 五、从零恢复（4 步）

### 1. 恢复 ComfyUI

```powershell
# 下载（约 1.9 GB）
curl.exe -L -o D:\dsh\temp\dl\ComfyUI_portable.7z `
  https://gh-proxy.com/https://github.com/comfyanonymous/ComfyUI/releases/download/v0.43.0/ComfyUI_windows_portable_nvidia.7z

# 解压（需要 7zr.exe，https://www.7-zip.org/a/7zr.exe）
D:\dsh\temp\dl\7zr.exe x D:\dsh\temp\dl\ComfyUI_portable.7z -oD:\dsh\comfyui -y
```

下载完对比大小：`2039673203` 字节（官方 release 的精确大小，用来校验镜像是否给了完整文件）。

### 2. 恢复模型

```powershell
$ckpt = 'D:\dsh\comfyui\ComfyUI_windows_portable\ComfyUI\models\checkpoints'
curl.exe -L -o "$ckpt\RealVisXL_V5.0_fp16.safetensors" `
  https://hf-mirror.com/SG161222/RealVisXL_V5.0/resolve/main/RealVisXL_V5.0_fp16.safetensors

curl.exe -L -o "$ckpt\animagine-xl-3.1.safetensors" `
  https://hf-mirror.com/cagliostrolab/animagine-xl-3.1/resolve/main/animagine-xl-3.1.safetensors

curl.exe -L -o 'D:\dsh\comfyui\ComfyUI_windows_portable\ComfyUI\models\upscale_models\4x-AnimeSharp.pth' `
  https://hf-mirror.com/Kim2091/AnimeSharp/resolve/main/4x-AnimeSharp.pth
```

### 3. 启动服务

```powershell
cmd /c "D:\dsh\comfyui\ComfyUI_windows_portable\python_embeded\python.exe -u -s `
  D:\dsh\comfyui\ComfyUI_windows_portable\ComfyUI\main.py `
  --listen 127.0.0.1 --port 8188 --disable-api-nodes > D:\dsh\temp\comfy.log 2>&1"
```

`--disable-api-nodes` **必须加**（见踩坑 3）。启动约 40 秒，验证：

```powershell
Invoke-RestMethod http://127.0.0.1:8188/system_stats
```

### 4. 编译客户端

```powershell
Invoke-Expression (Get-Content .\tools\msvc-env.ps1 -Raw)
cmake -G Ninja -S .\comfy-gen -B D:\dsh\builds\comfy-gen
cmake --build D:\dsh\builds\comfy-gen
```

（归档包里已带编译好的 `comfy_gen.exe`，跳过这步也能用。）

## 六、常用命令

```powershell
# 写实人像
D:\dsh\builds\comfy-gen\comfy_gen.exe `
  --prompt-file comfy-gen\prompts\07-catlazy-pos.txt `
  --neg-file  comfy-gen\prompts\04-catlazy-neg.txt `
  --ckpt RealVisXL_V5.0_fp16.safetensors `
  --w 1024 --h 1536 --steps 32 --cfg 5.5 --seed 1001 `
  --out comfy-gen\out\new.png

# 二次元角色
D:\dsh\builds\comfy-gen\comfy_gen.exe `
  --prompt-file comfy-gen\prompts\ayaka-03-pos.txt `
  --neg-file  comfy-gen\prompts\ayaka-03-neg.txt `
  --ckpt animagine-xl-3.1.safetensors `
  --w 832 --h 1216 --steps 30 --cfg 6.5 --seed 5555 `
  --out comfy-gen\out\ayaka.png

# 动漫纯放大（源图先放进 ComfyUI\input\）
D:\dsh\builds\comfy-gen\comfy_gen.exe `
  --from "...\ComfyUI\input\xxx.png" --upscale-model 4x-AnimeSharp.pth `
  --out comfy-gen\out\xxx-4x.png
```

### 参数速查

| 题材 | 底模 | 分辨率 | steps | cfg | sampler |
|---|---|---|---|---|---|
| 写实人像 | RealVisXL V5 | 1024×1536 | 32 | 5.5 | dpmpp_2m / karras |
| 二次元角色 | Animagine XL 3.1 | 832×1216 | 30 | 6.5 | dpmpp_2m / karras |
| 动漫放大 | — | 4x | — | — | ESRGAN 直出，11 秒 |

## 七、踩坑记录

1. **ComfyUI 启动卡死**：不加 `--disable-api-nodes` 时，进程空转、CPU 几乎为零、端口不监听，日志停在 `Using pytorch attention`。原因是启动时要做 API 节点的网络检查，而本机 PyPI 不通。
2. **GitHub release 直连只有 0.1 MB/s**：1.9 GB 要下 5 小时。实测 `gh-proxy.com` 有 4.3 MB/s；`ghfast.top`、`ghproxy.net`、`github.moeyy.xyz`、`gh.llkk.cc` 全部不通。下完用字节数校验完整性。
3. **latent hires 会改骨相**：写实图 2x 放大后脸普遍变长、眼神变精神；动漫图则会毁掉赛璐璐线稿（碎笔触）。动漫图必须用 ESRGAN 纯放大。
4. **"慵懒"要靠眼睑描述**：`heavy droopy upper eyelids, half-closed` 有效；负向必须压 `alert eyes, surprised, smiling`。
5. **`pauldron / shoulder armor` 会毁掉动漫角色服装**：Animagine 会画成露胸黑甲。换 `sode shoulder plates` + `fully clothed`，负向加 `cleavage, breastplate, armor bikini`。
6. **PowerShell 5.1 的 `Set-Content -Encoding utf8` 二次编码**：`Get-Content -Raw` 按 ANSI 读入再写 UTF-8，含中文的 `.cpp`/`.md` 会变乱码（`读不到` → `璇讳笉鍒`）。改含中文的源码用编辑工具。
7. **沙箱模式影响 HTTPS**：`workspace-write` 下 curl 读不到系统证书存储，报 `SEC_E_NO_CREDENTIALS`，此时 HTTP/TCP 正常但所有 TLS 全挂。下载模型需要 `danger-full-access`。
8. **后台服务会被杀**：ComfyUI 以后台作业运行，退出码 -1 表示被外部终止（非崩溃）。重启即可，命令见第五节。

## 八、已知问题 / 未完成

| 项 | 状态 | 说明 |
|---|---|---|
| `seedream-gen` 未实际出图 | ⚠️ | 只验证到 401；需 `ARK_API_KEY` 才能真正调用方舟 API |
| 绫华服装细节 | ⚠️ | 和服结构对，但胸甲/腰封与原设有出入；要更准需用 IP-Adapter + 参考图 |
| 人物一致性 | ❌ | 每次换 seed 都是不同的人；要做同一个人多张，需要额外装 IP-Adapter / InstantID |
| 高清放大质量 | ✅ | 动漫走 ESRGAN 很好；写实图目前只有 latent hires，会改脸，建议后续加 RealESRGAN 写实放大模型 |
| 服务自启 | ❌ | 不开机自启，手动启动。可做成计划任务 |

## 九、下一步建议

1. **要角色一致性**：装 IP-Adapter（`ip-adapter-plus_sdxl`）+ 参考图，能锁定同一个人/同一角色画多张。
2. **要写实高清**：下 `4x-UltraSharp`/`RealESRGAN_x4plus`，用 `--from` 模式替代 latent hires。
3. **要更快**：6GB 显存下 SDXL 已接近极限；若换 12GB+ 显卡，可上 FLUX.1 dev（画质明显更好）。
4. **要批量**：`comfy_gen` 支持 `--seed`，外层套个循环即可批量扫 seed。

## 十、归档说明

归档包 `D:\dsh\archives\image-gen-20261029.zip` 包含：

- `comfy-gen/`：源码、17 份提示词、7 张交付图、32 张迭代过程图、README、本交接文档
- `comfy-gen/bin/comfy_gen.exe`：已编译的客户端
- `seedream-gen/`：API 版工具源码（未使用）

**不包含**（体积太大，按第五节恢复即可）：

- `D:\dsh\comfyui`（17.26 GB，含 ComfyUI 运行时 + 3 个模型）
- `D:\dsh\builds`（编译中间产物）
