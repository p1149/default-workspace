# ddup —— 按内容哈希找出重复文件

只读工具：**永远不删除任何文件**，只出报告，删不删由人定。

## 为什么写它

2026-11-01 换机重建工作区时，有 **741 个乱码重名副本**要清理。当时只能靠
`git hash-object` 一个个比对，再人工确认才敢删，很笨也很慢。这个工具就是
为那件事写的——顺手也是刚装好的 C++ 工具链的第一个真实产物。

## 用法

```powershell
# 先导入编译环境（新开 shell 必须做，vcvars 只影响当前进程）
Invoke-Expression (Get-Content .\tools\msvc-env.ps1 -Raw)

# 构建（产物落在 D 盘）
cmake -S "项目\C++\ddup" -B D:\dsh\builds\ddup -G Ninja
cmake --build D:\dsh\builds\ddup

# 跑
D:\dsh\builds\ddup\ddup.exe D:\dsh\archives
D:\dsh\builds\ddup\ddup.exe --min-size 1048576 --max-report 20 D:\dsh
D:\dsh\builds\ddup\ddup.exe --json "项目" > dup.json
```

### 选项

| 选项 | 作用 |
|---|---|
| `--min-size <字节>` | 忽略小于该大小的文件（默认 1）；按归档去重经验，建议 ≥ 1 MiB 才划算 |
| `--max-report <N>` | 最多列多少组（默认 50，`0` = 不限） |
| `--json` | JSON 输出，便于脚本消费 |
| `--quiet` | 只出汇总，不列文件 |
| `-h, --help` | 帮助 |

### 退出码

- `0`：扫描完成（**有没有重复都是 0**，重复不是错误）
- `2`：参数或目录有问题

## 怎么做的（为什么快）

两遍扫描：

1. **按大小分桶**。文件大小是唯一的，就绝不可能有重复——这一步能干掉绝大多数文件。
   实测 `项目\C++`：73 个文件里只有 **17 个**需要真正哈希（省掉 77%）。
2. **只对「大小撞车」的候选算 SHA-256**，流式读（1 MiB 一块），不把整个文件
   读进内存，所以几十 MB 的大文件也不会撑爆 RAM。

最后按「可回收空间」降序排列，最大的重复排最前面。

实测：`项目\C++`（73 文件 / 106.9 MB）→ **158 ms**，8 组重复，可回收 29.1 MB。

## 实现上的两个坑（踩过，记下来）

1. **`NOMINMAX`**：`<windows.h>` 默认把 `min`/`max` 定义成宏，会把 `std::min`
   吃掉，报「`::` 右边的非法标记」。必须在 `#include <windows.h>` **之前**
   `#define NOMINMAX`。
2. **`/utf-8`**：源码里有中文字面量，MSVC 不加 `/utf-8` 会按 GBK 解码，输出
   直接乱码。加上之后还要在 `wmain` 里 `SetConsoleOutputCP(CP_UTF8)`。
3. **`/Zc:__cplusplus`**：不加的话 `__cplusplus` 永远是 `199711`，看起来像没
   开 C++20（其实开了）。

## 为什么用 `wmain` + `bcrypt`

- `wmain` 拿宽字符参数，中文路径不会因为 ANSI 代码页丢字符。
- SHA-256 走 Windows 自带的 `bcrypt`，不引入 OpenSSL 之类的重依赖。

## 边界

- 只读：不删、不改、不移动任何文件。
- 只比较**文件内容**，不看文件名——这正是"乱码重名副本"这类场景需要的。
- 硬链接/软链接不特殊处理（按普通文件读）。
