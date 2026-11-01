# 本地出图环境（ComfyUI + 写实/二次元双底模）

无需任何 API key，全部离线跑在本机 RTX 3060 Laptop 6GB 上。

## 装了什么

| 组件 | 位置 | 说明 |
|---|---|---|
| ComfyUI 0.43.0 便携版 | `D:\dsh\comfyui\ComfyUI_windows_portable` | 自带 Python 3.13 + torch 2.14.1+cu130 |
| RealVisXL V5.0 fp16 | `...\models\checkpoints\RealVisXL_V5.0_fp16.safetensors` | 6.46 GB，SDXL 写实人像 |
| Animagine XL 3.1 | `...\models\checkpoints\animagine-xl-3.1.safetensors` | 6.46 GB，SDXL 二次元/角色 |
| 4x-AnimeSharp | `...\models\upscale_models\4x-AnimeSharp.pth` | 63.9 MB，动漫纯放大 |
| 生成客户端 | `D:\dsh\builds\comfy-gen\comfy_gen.exe` | C++20 + WinHTTP，走 ComfyUI 本地 HTTP API |
| 源码 | `comfy-gen/src/`（`main.cpp` / `http.cpp` / `http.h`） | CMake + Ninja，构建目录 `D:\dsh\builds\comfy-gen` |

## 启动服务

```powershell
cmd /c "D:\dsh\comfyui\ComfyUI_windows_portable\python_embeded\python.exe -u -s `
  D:\dsh\comfyui\ComfyUI_windows_portable\ComfyUI\main.py `
  --listen 127.0.0.1 --port 8188 --disable-api-nodes > D:\dsh\temp\comfy.log 2>&1"
```

> `--disable-api-nodes` 必须加：不加时启动会卡在 API 节点的网络检查上（本机 PyPI 不通），进程空转不监听端口。
> 启动约 40 秒，健康检查 `GET http://127.0.0.1:8188/system_stats`。

## 出图

### 写实人像

```powershell
D:\dsh\builds\comfy-gen\comfy_gen.exe `
  --prompt-file comfy-gen\prompts\07-catlazy-pos.txt `
  --neg-file  comfy-gen\prompts\04-catlazy-neg.txt `
  --ckpt RealVisXL_V5.0_fp16.safetensors `
  --w 1024 --h 1536 --steps 32 --cfg 5.5 --seed 1001 `
  --out comfy-gen\out\test.png
```

### 二次元角色

```powershell
D:\dsh\builds\comfy-gen\comfy_gen.exe `
  --prompt-file comfy-gen\prompts\ayaka-03-pos.txt `
  --neg-file  comfy-gen\prompts\ayaka-03-neg.txt `
  --ckpt animagine-xl-3.1.safetensors `
  --w 832 --h 1216 --steps 30 --cfg 6.5 --seed 5555 `
  --out comfy-gen\out\ayaka.png
```

### 纯放大（不动画面）

源图先放进 `ComfyUI\input\`，再：

```powershell
D:\dsh\builds\comfy-gen\comfy_gen.exe `
  --from "...\ComfyUI\input\ayaka-base.png" `
  --upscale-model 4x-AnimeSharp.pth `
  --out comfy-gen\out\ayaka-4x.png
```

832×1216 → 3328×4864，11 秒，线稿无损。

加 latent 高清也可：`--hires 2.0 --hires-denoise 0.40`（代价约 6 倍时间，且会轻微改动骨相）。

## 实测性能

| 任务 | 耗时 |
|---|---|
| 832×1216 / 30 步（写实） | 26–30 s |
| 1024×1536 / 32 步（写实） | 44–46 s |
| 832×1216 / 30 步（二次元） | 25–28 s |
| 832×1216 → 2x latent hires | 175 s |
| 832×1216 → 4x ESRGAN | 11 s |

首次出图多 20–30 秒（加载 6.5GB 模型）。6GB 显存靠 ComfyUI 的权重 offload 撑住，稳定不 OOM。

## 提示词迭代记录（写实）

| 文件 | 结论 |
|---|---|
| 01 | 首图可用，但脸偏长、眼神太精神、几乎正面 |
| 02 | 加了圆脸/半垂眼/侧头，111 号方向正确但头发过肩 |
| 03 | 锁定齐颈 bob + 侧头，111 号最佳 |
| 04 | 加"方圆脸 / 小巧鼻头"，候选稳定 |
| 05 | 直出 1024×1536（不走放大），666 号脸型最准 |
| 06 | 放宽取景露出肩部 |
| 07 | 最终版，1001 号定稿 |

## 定稿

`comfy-gen/deliveries/`

写实「猫系慵懒脸」：

- `cat-lazy_A_primary.png` — 1024×1536，综合最贴合（v7 / seed 1001）
- `cat-lazy_B_face.png` — 1024×1536，脸型与猫系眼神最准（v6 / seed 666）
- `cat-lazy_C_window.png` — 1024×1536，窗边氛围与毛衣质感最强（v6 / seed 888）
- `cat-lazy_D_hires.png` — 1664×2432，分辨率最高，但放大后脸型偏长

神里绫华：

- `ayaka_A_4x.png` — 3328×4864，回头视角，4x 纯放大
- `ayaka_B_front.png` — 832×1216，正面半身
- `ayaka_C_profile.png` — 832×1216，侧脸近景

## 踩过的坑

1. **`--hires` 不适合动漫图**：latent 重采样 + denoise 0.35 会把干净的赛璐璐线稿变成碎笔触，放大后比原图还差。动漫图要用 `4x-AnimeSharp` 这类 ESRGAN 纯放大。
2. **`pauldron / shoulder armor` 会毁掉服装**：对 Animagine 而言这两个词会拉出露胸黑甲造型，不是绫华的设计。换成 `sode shoulder plates` + `fully clothed`，负向加 `cleavage, breastplate, armor bikini` 才正常。
3. **PowerShell 5.1 的 `Set-Content -Encoding utf8` 会二次编码**：`Get-Content -Raw` 按 ANSI 读入再写 UTF-8，中文全变乱码（`读不到` → `璇讳笉鍒`）。改含中文的源码用编辑工具，别走 `Get-Content | Set-Content`。
4. **沙箱切回 workspace-write 会断 HTTPS**：curl 访问不到系统证书存储，报 `SEC_E_NO_CREDENTIALS`，此时 HTTP/TCP 正常但 TLS 全挂，需要 full-access 才能下载模型。

## 继续调

单张 45 秒，随便试。常见调节点（写实）：

- 脸更圆 → 加强 `full chubby cheeks`，负向堆 `long face, narrow face`
- 更慵懒 → `heavy droopy upper eyelids, half-closed`，负向加 `alert eyes, surprised`
- 更灰更暖 → `muted warm gray, lifted shadows, low contrast`，负向加 `oversaturated, yellowish cast`
- 侧头更多 → `head tilted to the side` 改成 `head tilted 30 degrees`

二次元角色换人：把 `kamisato ayaka, genshin impact` 换成目标角色的 danbooru 标签（`character name, series`），再补发型、瞳色、服装标签即可。
