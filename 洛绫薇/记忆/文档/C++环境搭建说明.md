# 给 DSH 装 C++ 编程接口 —— 现状体检 + 两条安装路线

> 体检时间：2026-10-28　主机：Windows 11（AMD64，build 10.0.26200）　账户：`啊Q\76927`（在 Administrators 组，默认进程未提权）
> 当前工作区：`C:\Users\76927\Documents\deepseek-harness\default-workspace`

---

## ✅ 2026-10-28 07:09 —— 已装好，C++ 现在可编译可运行

**真实根因（和最初"从没装过 SDK"的判断不同）**：是 **2026-10-28 03:02 那次经 Chocolatey 装的 Build Tools 被中途取消**。

`C:\ProgramData\Microsoft\VisualStudio\Packages\_Instances\1b27df67\state.json` 里：

```
product.installed      = false
properties.canceled    = "1"
lastUserRequestedAction= "Modify"
lastAppliedPackageId   = …VC.UnitTest.Desktop.Build.Core   ← 停在 SDK 之前
lastInstallSize        = 4.9 GB  /  lastDownloadSize = 1.6 GB
selectedPackages       = 已包含 …Component.Windows11SDK.26100
```

编译器落地了、SDK 那批包没落地，所以 `stdio.h` 缺失，`vswhere` 也查不到实例。

**已执行的操作**（你的账户本就在 Administrators 组，且 `ConsentPromptBehaviorAdmin=0` = 静默提权，全程无 UAC 弹窗）：

```
setup.exe modify --installPath "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools" \
  --add Microsoft.VisualStudio.Component.Windows11SDK.26100 \
  --add Microsoft.Component.VC.Runtime.UCRTSDK --quiet --norestart
```

> **踩到的坑**：这个 Installer（4.11.24）的 `modify` **不接受 `--wait`**，会以退出码 `87` 立即退出，`%TEMP%\dd_installer_*.log` 里写"选项 wait 未知"。去掉 `--wait`、改为轮询安装引擎进程即可。

**结果**：耗时约 4 分钟、增量下载 ~1.7 GB，`product.installed = true`、`canceled = 0`。

| 验证项 | 结果 |
|---|---|
| `Windows Kits\10\Include\10.0.26100.0` | ✅ `ucrt` / `um` / `shared` / `winrt` / `cppwinrt` |
| `ucrt\stdio.h`、`um\kernel32.Lib` | ✅ 存在 |
| `cl` 编译 C++20（含 `<ranges>`、`std::views`） | ✅ `MSVC 1951`，输出 `even-sum=6` |
| CMake + Ninja + CTest 全链路 | ✅ `fib(20)=6765`，`100% tests passed` |
| `vcpkg.exe` | ✅ `…\BuildTools\VC\vcpkg\vcpkg.exe` |
| `clang-cl` / `clang-format` | ⚠️ 未装（可选组件，见方案 C） |

**日常怎么用**（关键：`vcvars64.bat` 只对当次进程生效，而 DSH 每条命令都是新进程）：

```powershell
# 方式 1：一次性命令
cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul && cl /EHsc main.cpp'

# 方式 2：在当前会话导入环境（辅助脚本，已随文档提供）
Invoke-Expression (Get-Content .\tools\msvc-env.ps1 -Raw)
cl /nologo /EHsc /std:c++20 hello.cpp
cmake -S . -B build -G Ninja && cmake --build build
```

> 用 `Invoke-Expression` 而不是 `. .\tools\msvc-env.ps1`，是因为默认执行策略禁止运行未签名脚本；要直接 dot-source 就先执行
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`（仅影响当前用户）。

**留在工作区的可运行样例**：

```
cpp-check\hello.cpp          C++20 ranges 单文件
cpp-check\demo\              CMake + Ninja + CTest 小工程（库 + 可执行 + 测试）
tools\msvc-env.ps1           环境导入脚本
vs-sdk-install.log           本次安装日志
```

---

## 一、现状体检（2026-10-28 06:41 快照，保留作为对照）

| 项目 | 结果 | 说明 |
|---|---|---|
| MSVC 编译器 `cl.exe` | ✅ 已装 | `…\Visual Studio\18\BuildTools\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64\cl.exe` |
| `vcvars64.bat` | ✅ 存在 | `…\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat` |
| MSVC 运行时库 `lib\x64` | ✅ 存在 | `aligned_new.lib` 等 |
| **Windows SDK 头文件/库** | ❌ **缺失** | `C:\Program Files (x86)\Windows Kits\10` 下只有 `Catalogs`、`Redist`，**没有 `Include` / `Lib`** |
| g++ / clang / cmake / ninja / gdb | ❌ 全无 | PATH 里都找不到 |
| Visual Studio Installer | ✅ 存在 | `C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe` |
| Chocolatey | ✅ 2.7.4 | `C:\ProgramData\chocolatey\bin\choco.exe`（需管理员才能装包） |
| winget | ⚠️ 存在但静默失败 | `WindowsApps\winget.exe`，调用无输出 |
| 管理员权限 | ❌ 否 | `IsInRole(Administrator)` = False |
| 磁盘/网络 | ✅ 可用 | 沙箱外 `curl https://github.com` 返回 200 |

**实测证据**——用现有 MSVC 编译一个 hello world：

```
cl /nologo /EHsc /std:c++17 hello.cpp
cstdio(11): fatal error C1083: 无法打开包括文件: "stdio.h": No such file or directory
```

**结论：编译器主体在，但缺 Windows SDK，所以一行 C++ 都编不过。** 补上 SDK（方案 B）或换成自带 CRT 的 MinGW（方案 A）都能解决。

### 另一个必须知道的限制：DSH 沙箱

我在 DSH 里执行的命令跑在受限沙箱中：

- 只能写工作区 `…\default-workspace` 及其子目录；
- **沙箱内 HTTPS 被切断**（`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），所以下载/联网安装必须由你手动执行，或对我的单条命令授权 `danger-full-access`；
- 因此下文的下载步骤都按"**你自己在普通 PowerShell 里跑**"来写，不依赖沙箱网络。

---

## 二、方案 A：便携版 MinGW-w64（推荐，免管理员、不动系统）

一条命令就有 `g++ / gcc / clang / gdb / cmake / ninja / make`，全部自带 UCRT，**不需要 Windows SDK**，解压即用，还能随时整目录删除。

### A1. 下载

推荐包（不含 LLVM，最小）：**107 MB**

```
https://github.com/brechtsanders/winlibs/releases/download/16.2.0posix-23.1.3-14.0.0-ucrt-r3/winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.7z
大小     111718557 字节
SHA256   db014a73b71907c6c778fd1c938056cddcae9023f89f8dfff7783d9e45baf975
```

需要 Clang 的话用带 llvm 的版本；不想装 7-Zip 就用同名 `.zip`（**264 MB**）：

```
https://github.com/brechtsanders/winlibs/releases/download/16.2.0posix-23.1.3-14.0.0-ucrt-r3/winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.zip
大小     276414382 字节
SHA256   3c69305081e4a647144339a936244fcf7d3d9e558319e1ad7be2cd2886d4b6a1
```

压缩包内清单（`-r3` 版）：GCC 16.2.0、GDB 18.1、LLVM/Clang 23.1.3、MinGW-w64 14.0.0（UCRT）、Binutils 2.47、GNU Make 4.4.1、**CMake 4.4.4**、**ninja 1.13.2**、ccache 4.14.2、Cppcheck 2.22.0。

放在下载目录即可：

```powershell
cd $env:USERPROFILE\Downloads
curl.exe -L -O "https://github.com/brechtsanders/winlibs/releases/download/16.2.0posix-23.1.3-14.0.0-ucrt-r3/winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.7z"
# 校验（应输出 OK）
certutil -hashfile "winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.7z" SHA256
```

### A2. 解压到**工作区**（关键）

一定要解压进工作区，否则我在沙箱里读不到、也写不了构建产物：

```powershell
# 7z 用户
7z x "winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.7z" -o"C:\Users\76927\Documents\deepseek-harness\default-workspace\.tools"

# 或者用 Windows 自带 tar（bsdtar 支持读 7z，不支持也没关系，换 zip）
tar -xf "winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.7z" -C "C:\Users\76927\Documents\deepseek-harness\default-workspace\.tools"

# zip 版本（原生解压，无需额外工具）
Expand-Archive -Path "winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.zip" -DestinationPath "C:\Users\76927\Documents\deepseek-harness\default-workspace\.tools"
```

最终目录结构应该是：

```
default-workspace\.tools\mingw64\bin\g++.exe
default-workspace\.tools\mingw64\bin\cmake.exe
default-workspace\.tools\mingw64\bin\ninja.exe
default-workspace\.tools\mingw64\bin\gdb.exe
```

> 压缩包解出来如果是 `mingw64\` 之外还有一层目录，把里面的 `mingw64` 移到 `.tools\mingw64` 即可。

### A3. 验证

```powershell
$env:Path = "C:\Users\76927\Documents\deepseek-harness\default-workspace\.tools\mingw64\bin;" + $env:Path
g++ --version          # 应显示 gcc 16.2.0
g++ -dumpmachine       # 应含 x86_64-w64-mingw32 + ucrt
cmake --version
ninja --version
```

### A4. 让这工具链"到处都能用"

三选一（或都做）：

**(1) 只在当前窗口临时用** —— 就是上面那行 `$env:Path = ...`，重启窗口失效。

**(2) 写进用户环境变量**（永久，推荐，不影响系统、不需要管理员）：

```powershell
$bin = "C:\Users\76927\Documents\deepseek-harness\default-workspace\.tools\mingw64\bin"
$old = [Environment]::GetEnvironmentVariable("Path", "User")
if ($old -notlike "*$bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$bin;$old", "User")
}
```

> DSH 每次执行命令都会新起一个 `pwsh` 进程，所以改完**下一轮对话我就能直接找到 `g++`**，不用重启 GUI。

**(3) 在项目里放一个 `build.ps1`**，让构建自包含（适合把项目分享给别人）：

```powershell
# build.ps1 —— 放在项目根目录
$mingw = "C:\Users\76927\Documents\deepseek-harness\default-workspace\.tools\mingw64\bin"
$env:Path = "$mingw;$env:Path"
g++ -std=c++20 -O2 -Wall -Wextra main.cpp -o main.exe
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
.\main.exe
```

### A5. 装完就能这么用

```powershell
g++ -std=c++20 -O2 -Wall -Wextra main.cpp -o main.exe
.\main.exe

# 多文件 / CMake 工程
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=g++
cmake --build build
ctest --test-dir build --output-on-failure

# 调试（命令行）
gdb --args .\main.exe
```

---

## 三、方案 B：给现有 VS Build Tools 补装 Windows SDK（原生 MSVC 路线）

保留你已经装好的 MSVC 14.51，只补 SDK。**需要管理员（UAC 提权），下载约 2–3 GB**，装完可和 VS 工程、MSBuild、调试器原生打通。

### B1. 图形界面（最稳）

1. 开始菜单搜 **Visual Studio Installer** → 打开
2. 找到已安装的 **Build Tools**（版本号 18）→ **修改 / Modify**
3. 切到 **单个组件 / Individual components**，搜索并勾选：
   - ✅ **Windows 11 SDK (10.0.26100.x)** — 组件 ID `Microsoft.VisualStudio.Component.Windows11SDK.26100`
   - ✅ **Windows 通用 CRT SDK / Windows Universal CRT SDK** — `Microsoft.Component.VC.Runtime.UCRTSDK`
   - ✅（建议）**C++ CMake tools for Windows** — `Microsoft.VisualStudio.Component.VC.CMake.Project`
   - ✅（建议）**vcpkg package manager** — `Microsoft.VisualStudio.Component.Vcpkg`
4. 右下角 **修改** → 等下载安装完成 → 重启

### B2. 命令行（等价操作）

在**管理员** PowerShell 里执行：

```powershell
$setup = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe"
$inst  = "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools"

& $setup modify --installPath $inst `
  --add Microsoft.VisualStudio.Component.Windows11SDK.26100 `
  --add Microsoft.Component.VC.Runtime.UCRTSDK `
  --add Microsoft.VisualStudio.Component.VC.CMake.Project `
  --quiet --norestart
```

> 注意：组件 ID 以 `Microsoft Learn` 的 *Visual Studio Build Tools component directory* 页面为准；不同 VS 版本 SDK 的尾号会变（`...Windows11SDK.22621`、`...Windows10SDK.19041` 等都可用，二选一即可）。

### B3. Chocolatey 备选

```powershell
# 管理员 PowerShell
choco install windows-sdk-11-version-24h2 -y
# 或指定版本：choco install windows-sdk-11-version-22h2 -y
```

### B4. 验证

```powershell
cmd /c '"C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cl /Bv'
cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul && cl /nologo /EHsc hello.cpp && hello.exe'
```

### B5. 在 DSH 里用 MSVC 的注意点

`vcvars64.bat` 只对**当前进程**生效，而我每条命令都是新进程，所以必须每次先 `call`。封装成 `build.bat` 最省事：

```bat
@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul
if "%~1"=="" (cl /nologo /EHsc /std:c++20 main.cpp & goto :eof)
cl /nologo /EHsc /std:c++20 %*
```

---

## 四、方案 C：可选加分项

| 目标 | 做法 |
|---|---|
| 要 `clangd`/`clang-format`（编辑器补全） | 直接下 winlibs 带 LLVM 的包，或用 `winget install LLVM.LLVM` |
| 要包管理（fmt/spdlog/abseil…） | `vcpkg`（方案 B 勾选即装）或 `conan`（`pip install conan`） |
| 要 MSYS2 的 pacman 生态 | 装 MSYS2 到 `C:\msys64`，`pacman -S mingw-w64-ucrt-x86_64-gcc`，但它是**独立进程环境**，在 DSH 里调用要写全路径或用 `C:\msys64\usr\bin\bash -lc` |
| 单元测试 | 轻量用 `doctest`/`catch2` 单头文件；工程化用 GoogleTest + CTest |
| 启用 ccache 加速 | winlibs 自带 `ccache.exe`，CMake 里 `-DCMAKE_CXX_COMPILER_LAUNCHER=ccache` |

---

## 五、装完之后我这边会怎样

- 你的用户 PATH 里出现 `g++` 后，我下一条命令就能编译、运行、跑测试、开 CMake 工程，**不需要额外授权**（工作区可写就够了）。
- 构建产物建议都放工作区内（`build\`、`bin\`），沙箱之外我写不进去。
- 需要联网拉依赖（vcpkg/conan/CMake FetchContent）时，会触发一次授权询问；批准一次即可。

---

## 六、验收清单

**方案 B（MSVC + Windows SDK）—— 2026-10-28 07:09 全部通过：**

```
[x] Windows Kits\10\Include\10.0.26100.0\ucrt\stdio.h 存在
[x] um\x64\kernel32.Lib 存在
[x] cl 编译并运行 C++20 程序成功（MSVC 1951）
[x] 编译日志中出现 SDK 头文件路径 …\Windows Kits\10\include\10.0.26100.0\ucrt\stdio.h
[x] cmake --version / ninja --version / ctest --output-on-failure 正常
[x] vcpkg.exe 存在
[ ] clang-cl / clang-format（可选，未装，需要时按方案 C 补）
```

**方案 A（MinGW 便携版）—— 未安装，需要备用链时按第二节执行：**

```
[ ] .tools\mingw64\bin\g++.exe 存在
[ ] g++ --version 输出 16.2.0
[ ] g++ -dumpmachine 含 x86_64-w64-mingw32
```

---

## 七、常见坑

1. **只把 `cl.exe` 目录加进 PATH 不够** —— MSVC 依赖 `vcvars64.bat` 设置 `INCLUDE` / `LIB` / `LIBPATH`，缺了照样找不到 `stdio.h`（就是装 SDK 之前这台机器的状态）。
2. **`Windows Kits\10\Include` 为空**说明只装了 Redist，没装 SDK 本体；在 Installer 里搜 "Windows 11 SDK" 补即可。**另一种隐藏情况：安装被中途取消**（`state.json` 里 `canceled="1"`、`product.installed=false`），此时 `vswhere` 查不到实例，重跑一次 `modify` 续装比全新安装快得多。
3. **解压到 `Program Files` 之外更省事** —— 免管理员，且沙箱能访问；`Program Files` 下的路径我这里能读、但写不进去。
4. **PATH 改完没生效** —— 检查是改的 `User` 还是 `Machine` 作用域；另外已打开的终端不会自动刷新。
5. **`Expand-Archive` 解 264 MB 的 zip 很慢** —— 正常现象，7z 版本快得多。
6. **MinGW 和 MSVC 的 `.obj` / `.lib` 不互通** —— 一条链路选定后别混用；第三方库要按同一工具链编译。
7. **UCRT 运行时**：Windows 10/11 自带；若目标机器更老，需装 *Update for Universal C Runtime*。
8. **`setup.exe modify` 传 `--wait` 会直接报错退出** —— VS Installer 4.11 的 `modify` 不认这个参数（退出码 87），它只在 `install` 场景使用。静默安装想等它装完，就轮询 `setup` / `vs_installershell` 进程或 `state.json` 的 `product.installed`。
9. **`vswhere` 返回 `[]` 不等于没装** —— 安装被取消（`product.installed=false`）时它就查不到实例，但磁盘上的编译器还在，此时看 `state.json` 更准。

---

## 附：本机关键路径速查

```
编译器(MSVC)   C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64\cl.exe
环境初始化     C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat
VS 安装器      C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe
SDK 根(已完整) C:\Program Files (x86)\Windows Kits\10   (Include\10.0.26100.0, Lib\10.0.26100.0)
CMake          …\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe
Ninja          …\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja\ninja.exe
vcpkg          …\BuildTools\VC\vcpkg\vcpkg.exe
环境导入脚本   C:\Users\76927\Documents\deepseek-harness\default-workspace\tools\msvc-env.ps1
工作区         C:\Users\76927\Documents\deepseek-harness\default-workspace
Python         C:\Python315\python.exe (3.15.2)
```
