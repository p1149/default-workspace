# 重启脚本（暂时停用）

> 2026-10-30 15:30 主人指示：**重启脚本暂时停用，看门狗保留**。

## 停用原因
- 这些脚本用 **非提升**方式拉起 DSH → 触发 windows-acl 沙箱「temp grant materialization failed」（设 SACL 需 SeSecurityPrivilege）；
- 正确做法：**以管理员身份启动 DSH**（或改脚本用 `Start-Process -Verb RunAs` 提升启动）。

## 恢复方法
把本目录里的脚本移回 `tools/` 即可（恢复前先确认启动方式是否提升）。