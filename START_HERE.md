# CalcPilot 演示包运行说明

## 运行环境

- macOS 或 Linux（Windows 可使用 WSL）
- Python 3.9 或更高版本
- Node.js 18 或更高版本，并带有 npm
- 首次安装依赖时需要网络

本演示采用轻量混合模式：前三个章节包含真实教材与 RAG 数据，其余章节使用 mock
内容。首次安装会下载语义检索所需的嵌入模型，但不需要重新导入或切分教材。

## 一键安装与启动

解压后，在项目根目录打开终端并依次运行：

```bash
bash setup_calcpilot.sh
bash run_calcpilot.sh
```

看到 `CalcPilot is starting` 后，在浏览器打开：

```text
http://127.0.0.1:5175
```

停止服务时，在运行服务的终端按 `Ctrl+C`。

## AI 模型配置（可选）

不配置大模型密钥时，教材浏览、RAG 检索、预置练习、收藏、学习记录和教师数据总览仍可演示；生成式对话会使用项目的降级逻辑。

如需完整的动态出题和 AI 对话：

1. 将 `.env.example` 复制为 `.env`。
2. 在本地 `.env` 中填写自己的 `LLM_API_KEY`。
3. 不要上传或分享 `.env`。

## 常见问题

- 不要双击 `frontend-web/index.html`，React 页面必须通过上面的本地网址访问。
- 若提示依赖缺失，请重新运行 `bash setup_calcpilot.sh`。
- 若 5175 或 8000 端口已被占用，请先关闭占用端口的旧服务。
- RAG 安装验证会显示教材片段数和测试检索结果；成功后无需另行加载知识库。
