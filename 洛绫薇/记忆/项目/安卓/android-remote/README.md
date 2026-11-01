# 洛绫薇 · 蓝牙控制 App（android-remote）

手机端遥控电脑的安卓原生 App：通过**蓝牙 SPP（RFCOMM 串口协议）**把命令发给电脑上的
`bt-control.exe`，电脑端再把每行命令 `POST` 到 `http://127.0.0.1:7123/api/action`，
由 DSH 的远程控制插件执行（打开 / 关闭 / 切换场景窗口等）。

- 应用名：**洛绫薇**（包名 `com.luolingwei.remote`）
- 当前版本：**v1.1**（versionCode 2）
- 技术栈：纯 Java + 框架自带控件（无 AndroidX、无 Gradle 依赖），手写深色界面
- 最低系统：Android 7.0（minSdk 24），目标：Android 14（targetSdk 34）

## 目录结构

```
android-remote/
├─ build-manual.ps1                    # 免 Gradle 的手动构建脚本（唯一使用的构建方式）
├─ build.gradle.kts / settings.gradle.kts / gradle.properties  # 预留的 Gradle 工程（未使用）
├─ app/src/main/
│  ├─ AndroidManifest.xml              # 权限 + 无 ActionBar 深色主题
│  └─ java/com/luolingwei/remote/MainActivity.java   # 全部界面与蓝牙逻辑
└─ 洛绫薇-蓝牙-v1.1.apk                # 构建产物（与 luolingwei-bt-v1.1.apk 相同）
```

## 构建（不需要 Gradle）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\android-remote\build-manual.ps1
```

脚本按顺序做：`aapt2 link`（打进版本号）→ `javac`（Java 17）→ `d8`（全部 .class → classes.dex）
→ `jar uf` 塞入 APK → `zipalign` → `apksigner`（debug 证书签名）→ 复制产物。

- 工具链：JDK 17（`D:\dsh\jdk17\jdk-17.0.13+11`）、Android SDK 34 / build-tools 34.0.0（`D:\dsh\android-sdk`）
- 产物：`D:\dsh\builds\android-remote\app-debug.apk`（中间产物不落源码目录）
- 注意：`d8` 8.2.2 不接受目录输入，脚本传的是**逐文件** `.class` 列表；改代码后新增内部类也能自动带上。

## 安装

```powershell
# 手机插 USB 并开启「USB 调试」后：
D:\dsh\android-sdk\platform-tools\adb.exe install -r android-remote\洛绫薇-蓝牙-v1.1.apk
```

或把 APK 拷到手机、允许「未知来源」后手动安装。debug 证书签名，升级时不会与旧版冲突（同包名同签名）。

## 使用步骤

1. 电脑端先启动蓝牙 SPP 桥：`D:\dsh\builds\bt-control\bt-control.exe`（保持窗口开着，日志写 `D:\dsh\archives\bt-control.log`）。
2. 手机与电脑**先在系统蓝牙设置里配对**（App 只列已配对设备）。
3. 打开 App → 「选择设备并连接」→ 选中电脑。
4. 点快捷命令（打开 / 关闭 / 切换场景窗口），或在输入框敲任意命令后「发送」。
5. 底部「发送记录」显示带时间戳的收发日志，可清空。

## 命令协议

每行一条 UTF-8 文本，`\n` 结尾。电脑端 `bt-control.cpp` 收到后转成 JSON：

```json
{"action": "open-scenes"}
```

| 命令 | 效果 |
|---|---|
| `open-scenes` | 打开场景窗口 |
| `close-scenes` | 关闭场景窗口 |
| `toggle-scenes` | 切换场景窗口 |

自定义命令即常见 action 名，协议与远程控制 PWA 一致。

## v1.1 更新内容

- **设备选择**：列出已配对设备供选择（v1.0 是盲连第一个配对设备）
- **记住上次设备**：下次启动自动重连（SharedPreferences 存 MAC）
- **断线自动重连**：连接失败 / 传输中断后按 1s、2s、3s 退避重试 3 次
- **自定义命令输入框** + 发送记录（时间戳、可清空、自动滚到底）
- **深色界面**：黑底 + 状态彩色提示（灰=未连接 / 黄=连接中 / 绿=已连接 / 红=错误）
- Android 12+ 蓝牙权限（`BLUETOOTH_CONNECT`）授权后自动继续选设备

## 已知限制 / 排错

- 只支持**已配对**设备；App 内不做配对（配对走系统设置）。
- 电脑端 `bt-control.exe` 必须运行，否则连接会失败；`D:\dsh\archives\bt-control.log` 里能看到 `client connected` / `cmd:`。
- 手机若连不上：先确认电脑蓝牙可见、已配对、`bt-control.exe` 窗口未关；再试「断开」后重连。
- 版本记录：v1.0（2026-10-30，盲连版）→ v1.1（2026-10-30，设备选择 + 自动重连 + 日志）。
