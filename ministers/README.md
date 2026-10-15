# 专职阁员定义 · 安装说明

五个 cabinet 专职阁员的子智能体定义文件（v0.4 方案 §十六 + 附录 D 的落地件）。  
**这些是 PI-Desktop 宿主侧资产，不是插件的一部分**——插件 zip 不包含它们。

## 安装（在装了 PI-Desktop 的设备上）

1. 把五个 `.md` 文件复制到用户级子智能体目录：
   ```
   %USERPROFILE%\.agents\subagents\
   ```
   （即 `C:\Users\<你的用户名>\.agents\subagents\`；目录不存在就创建。  
   宿主只认这个全局目录，不看项目目录。）
2. **改模型钉扎**：每个文件 frontmatter 里的 `model:` 是按 2026-10-06 会话  
   观测到的 provider id 预填的（deepseek/deepseek-flash、kimi-for-coding/k3、  
   zai-coding-plan/glm-5.3 系），**改成你机器上实际可用的 provider/模型 id**；  
   不确定就先删掉 `model:` 行（= 继承会话默认），跑一场后在  
   Settings → 子智能体 里补钉。钉扎原则：**锋必须与会话模型异源**；  
   据/谋/远/众尽量分散家族（见下）。
3. 重启 PI-Desktop（或重载子智能体），五个阁员进入委派目录。
4. 验证：开一场内阁（`/skill:cabinet`），组阁表应出现  
   cabinet-feng/ju/mou/yuan/zhong 的映射，且红队=cabinet-feng。

## 家族分配参考（三家环境）

> 本表 = 设计建议的单一事实源；「内阁·阁员模型」面板（0.3.0+）的建议家族/TL
> 列是本表的逐字镜像（verify 门有同源断言 D3-b，改表须同步改面板 SUGGEST）。
> 本机当前实际钉扎见阁员 md 文件 frontmatter `model` 行，或面板"当前钉扎"列
> （2026-10-09 起本机钉扎已按可用 provider 调整，与本表设计建议不完全相同——
> 如据席弃 DeepSeek 槽改 GLM；漂移校验跑 scripts/ministers-check.ps1）。

| 阁员              | 建议家族     | 建议 TL | 说明              |
| --------------- | -------- | ----- | --------------- |
| cabinet-feng 锋  | Kimi     | high  | 与会话异源，红队铁律     |
| cabinet-ju 据    | DeepSeek | max   | 信源核查强度优先       |
| cabinet-li 立    | GLM 高配档 | high  | 正方论证质量优先       |
| cabinet-mou 谋   | GLM 经济档 | —     | 省钱              |
| cabinet-shen 审  | DeepSeek | max   | 方法审查强度优先       |
| cabinet-yuan 远  | Kimi     | high  | 立意/架构质量优先      |
| cabinet-gu 骨    | Kimi     | high  | 叙事结构质量优先       |
| cabinet-zhong 众 | DeepSeek | max   | 读者体感，与远不同源     |

最低要求：模型维不全重合 + 锋异源。

## 设计自查（建卡即违规的三种情况，已规避，改卡时勿引入）

1. 人格里写立场（"你反对微服务"）——立场只来自角色卡简报；
2. 人格里写协议（cites 格式、字数上限）——协议随简报下发，防版本漂移；
3. 复制某个阁员改名叫二号——同质克隆是伪多样性放大器。

## 与"只在 cabinet 中被委派"的边界

隔离靠**描述字段的负向排除句**（每个文件的 description 都已写明"仅在  
cabinet 内阁议事流程中被委派……此类任务请选用其他智能体"）——这是软  
隔离：父智能体选人时读描述，会自觉绕开。若某天发现阁员被非议事任务  
选中，记录那次委派（描述措辞改进样本 + 向 PI-Desktop 提  
subagent activation scope feature request 的实证）。想硬隔离：在不开  
内阁的项目里把阁员逐个禁用（宿主支持按项目启停覆盖）。

## 更换设备

阁员定义不随插件走，换设备时把本目录五个文件拷过去、改好 model 即可  
（约五分钟）。
