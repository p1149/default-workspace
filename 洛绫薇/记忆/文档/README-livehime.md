# 直播姬场景配置：改了什么、怎么收尾

## 一、结论

配置已改好并写到位，**下次打开直播姬应当直接生效**（Scene 1/2/3 里有画面源）。
如果打开后场景还是空的，说明直播姬在退出时用自己的内存状态覆盖了我的文件，
按下面「手动收尾」两行命令重新写一次即可。

## 二、目标文件（关键）

直播姬加载顺序（日志原文）：

```
L0  User Data\2741919\Scene Collection\support_group_collection.json   ← 真正生效
L1  User Data\2741919\untitledv2.json                                   ← 遗留回退
L2  Preferences 里 kLastSceneCollectionName
```

所以**必须改 L0 那个**。已经写入的是 `Scene Collection\support_group_collection.json`。

## 三、布局

| 场景 | 内容 |
|---|---|
| Scene 1（待机） | 开场图 1920×1080 可见；暂离图 1920×1080 隐藏（点来源列表的眼睛图标切换） |
| Scene 2（游戏） | 游戏采集（自动捕获任意全屏游戏）全屏 + 摄像头 480×270 右下角 (1400, 770) |
| Scene 3（桌面） | 屏幕采集 1920×1080 全屏 + 摄像头 480×270 右下角 |

其余 9 个场景（Vertical 1-3 / wDouble 1-3 / xDouble Sub 1-3）**保持原样未动**。

> 直播姬只认这 12 个固定场景名。上一版我把场景改名成「开场/游戏/桌面」并新增
> 「暂离」，日志直接报 `Collection file parsed but contains zero scenes`，
> 然后重建了一套空场景。所以这一版一个名字都没改。

## 四、已确认的事实

- 源 id 全部存在于本版本 DLL：`monitor_capture` / `game_capture` / `dshow_input` / `image_source`
- `monitor_capture` 的键是 `monitor_id` + `method` + `capture_cursor`（不是旧版的 `monitor`）
- 显示器 `\\.\DISPLAY1`，逻辑 1536×864，物理 1920×1080（125% 缩放）
- 摄像头 `USB2.0 HD UVC WebCam`，最高 1280×720@30（MJPEG），设备 id 已从 DirectShow 枚举得到
- 麦克风 `麦克风阵列 (Realtek Audio)`，用系统默认设备
- 上行带宽实测 ≈ 12 Mbps
- 编码：NVENC（`nv_turing_enc`），1080p60，6000 kbps，ABR，关键帧 2s，ABR 动态
- 帧率 60 已生效：应用自己把 `auto_cfg.video_selected_Index_v2` 重算为 5（60 帧预设）

## 五、手动收尾（若下次打开仍是空场景）

先在直播姬里**托盘右键 → 退出**（它需要管理员权限，脚本杀不掉），然后：

```powershell
$UD  = "$env:LOCALAPPDATA\bililive\User Data\2741919"
$v3  = "C:\Users\76927\Documents\deepseek-harness\default-workspace\untitledv2.v3.json"
Copy-Item $v3 "$UD\Scene Collection\support_group_collection.json" -Force
Copy-Item $v3 "$UD\untitledv2.json" -Force
```

再启动直播姬。

## 六、回滚

原始配置备份在：

```
livehime_backup_20261028_115815\untitledv2.json
livehime_backup_20261028_115815\Preferences
livehime_backup_20261028_115815\Scene Collection\*
```

把它们拷回 `User Data\2741919\` 对应位置即可恢复成动手前的状态。

## 七、改了但没验证到的

- 摄像头/游戏采集的实际画面渲染（需要直播姬运行并截图确认）
- 摄像头小窗的层级：如果被游戏画面挡住，在来源列表里把「摄像头」拖到最上面

## 八、工作区里的脚本

| 文件 | 用途 |
|---|---|
| `build_scenes_v3.py` | 生成最终场景文件（基于原始备份，可重复运行） |
| `untitledv2.v3.json` | 生成的成品，直接可替换 |
| `livehime_dump.py` / `livehime_inspect.py` / `livehime_strings.py` | 只读诊断脚本 |
| `make_assets.py` | 生成开场图 / 暂离图 |
| `livehime_assets\*.png` | 两张 1920×1080 素材（已复制到 `User Data\2741919\assets\`） |
