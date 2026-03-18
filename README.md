# 🌍 AWS Prompt the Planet Challenge

[![AWS](https://img.shields.io/badge/AWS-Cloud%20Services-orange?logo=amazon-aws)](https://aws.amazon.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🏆 **DoraHacks AWS Prompt the Planet Challenge** - $50,000 AWS Credits

## 📋 项目概述

本项目包含5个高质量的 AI Prompt，展示 AWS 云服务（Bedrock、SageMaker、Lambda、S3）的创新应用场景。每个 Prompt 都经过精心设计，包含完整的角色定义、任务描述、约束条件和输出格式。

## 🎯 Prompt 目录

| # | 标题 | AWS 服务 | 应用场景 |
|---|------|---------|---------|
| 1 | [智能客服 Agent](#1-aws-bedrock---智能客服-agent) | Bedrock + Claude | 7x24 小时智能客服 |
| 2 | [ML 工作流自动化](#2-aws-sagemaker---机器学习工作流) | SageMaker | 端到端 ML 流水线 |
| 3 | [无服务器事件驱动架构](#3-aws-lambda---无服务器事件驱动架构) | Lambda + S3 + API Gateway | 实时数据处理 |
| 4 | [代码审查助手](#4-aws-bedrock---代码审查助手) | Bedrock + Claude | 自动化代码审查 |
| 5 | [实时异常检测系统](#5-aws-sagemaker---异常检测系统) | SageMaker + RCF | 实时监控与告警 |

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/feizaiguai/aws-prompt-planet.git

# 安装依赖
pip install -r requirements.txt

# 配置 AWS 凭证
cp .env.example .env
# 编辑 .env 文件，填入你的 AWS 凭证

# 使用 Prompt
python main.py --prompt 1 --input "你的问题"
```

## 📦 文件结构

```
aws-prompt-planet/
├── README.md           # 项目文档
├── prompts.json        # 5个完整 Prompt 定义
├── requirements.txt    # Python 依赖
├── .env.example        # AWS 配置示例
├── main.py            # 主程序入口
└── examples/          # 示例代码
    ├── bedrock_agent.py
    ├── sagemaker_pipeline.py
    ├── lambda_architecture.py
    ├── code_reviewer.py
    └── anomaly_detector.py
```

## 🔧 AWS 服务架构

```
┌─────────────────────────────────────────────────────────┐
│                  AWS Prompt the Planet                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │ Bedrock  │    │SageMaker │    │  Lambda  │         │
│  │  +Claude │    │  Pipelines│    │Functions │         │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘         │
│       │               │               │                │
│       └───────────────┴───────────────┘                │
│                       │                                │
│                ┌──────┴──────┐                         │
│                │      S3     │                         │
│                │  Storage    │                         │
│                └─────────────┘                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📝 Prompt 详情

### 1. AWS Bedrock - 智能客服 Agent

**服务**: Amazon Bedrock + Claude 3  
**场景**: 企业级智能客服系统

```json
{
  "role": "AWS 云计算解决方案架构师",
  "task": "设计并实现一个基于 Bedrock 的智能客服系统",
  "features": [
    "多轮对话理解",
    "知识库检索增强（RAG）",
    "情感分析与智能转人工",
    "工单系统对接"
  ]
}
```

**示例输出**:
```json
{
  "response": "您好！我看到您的 EC2 实例 CPU 使用率较高...",
  "confidence": 0.95,
  "intent": "performance_issue",
  "suggested_actions": ["检查进程", "优化配置", "升级实例"]
}
```

---

### 2. AWS SageMaker - 机器学习工作流

**服务**: SageMaker Pipelines + Feature Store  
**场景**: 自动化机器学习流水线

```json
{
  "role": "MLOps 工程师",
  "task": "构建端到端 ML 流水线",
  "stages": [
    "数据预处理（Feature Store）",
    "模型训练（Training Job）",
    "模型评估（Processing Job）",
    "模型部署（Endpoint）"
  ]
}
```

---

### 3. AWS Lambda - 无服务器事件驱动架构

**服务**: Lambda + S3 + DynamoDB + API Gateway  
**场景**: 实时数据处理系统

```json
{
  "role": "Serverless 架构师",
  "task": "设计事件驱动架构",
  "triggers": [
    "S3 文件上传触发",
    "API Gateway HTTP 请求",
    "DynamoDB Stream 变更",
    "EventBridge 定时任务"
  ]
}
```

---

### 4. AWS Bedrock - 代码审查助手

**服务**: Amazon Bedrock + Claude 3  
**场景**: 自动化代码审查

```json
{
  "role": "代码审查专家",
  "task": "分析代码质量并提供改进建议",
  "checklist": [
    "安全性检查（SQL 注入、XSS）",
    "性能优化建议",
    "代码规范检查",
    "最佳实践建议"
  ]
}
```

---

### 5. AWS SageMaker - 异常检测系统

**服务**: SageMaker + Random Cut Forest  
**场景**: 实时监控与异常检测

```json
{
  "role": "数据科学家",
  "task": "构建实时异常检测系统",
  "components": [
    "数据采集（Kinesis）",
    "实时推理（SageMaker Endpoint）",
    "告警通知（SNS）",
    "可视化（QuickSight）"
  ]
}
```

---

## 🛡️ 安全最佳实践

- ✅ 使用 IAM 角色最小权限原则
- ✅ 所有敏感信息存储在 Secrets Manager
- ✅ 启用 CloudTrail 审计日志
- ✅ 数据传输使用 TLS 加密
- ✅ S3 存储桶启用版本控制和加密

## 📊 成本优化建议

| 服务 | 优化策略 | 预计节省 |
|------|---------|---------|
| Bedrock | 使用 Prompt 缓存 | 30% |
| SageMaker | Spot 实例训练 | 70% |
| Lambda | 预留并发 | 40% |
| S3 | 智能分层存储 | 50% |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

## 📧 联系方式

- GitHub: [@feizaiguai](https://github.com/feizaiguai)
- Email: 196408245@qq.com

---

**⭐ 如果这个项目对你有帮助，请给一个 Star！**
