window.APP_DATA = {
  user: {
    name: "林教授",
    locale: "zh-CN",
    interests: ["身份认同", "反馈机制", "主动行为", "组织意义建构"],
    terminologyPreferences: {
      identity: "身份认同",
      sensemaking: "意义建构",
      feedback: "反馈"
    }
  },
  nav: [
    { id: "home", labelZh: "今日论文", labelEn: "Papers" },
    { id: "paper", labelZh: "深度翻译", labelEn: "Translation" },
    { id: "workflow", labelZh: "科研工作流", labelEn: "Workflows" },
    { id: "glossary", labelZh: "术语与变量库", labelEn: "Glossary" }
  ],
  papers: [
    {
      id: "paper-1",
      titleZh: "反馈寻求如何塑造身份建构：基于意义建构视角的研究",
      titleEn: "How Feedback Seeking Shapes Identity Construction: A Sensemaking Perspective",
      authors: "A. Smith, B. Johnson",
      journal: "Journal of Applied Psychology",
      status: "已发表 / 2025",
      relevance:
        "如果你正在研究身份认同、反馈机制或员工主动性，这篇文章提供了一个将反馈行为与身份建构连接起来的理论视角。",
      recommendation: ["理论", "变量", "讨论"],
      link: "https://example.com/paper-1",
      abstractZh:
        "本文探讨员工在反馈互动中如何形成和调整身份认同。研究指出，反馈寻求不仅是信息获取行为，更是个体通过社会互动不断澄清自我定位的过程。结果表明，反馈寻求可以提升身份清晰性，并进一步促进员工主动行为，且该作用在组织支持氛围较高时更强。",
      abstractEn:
        "We examine how feedback seeking shapes employees' identity construction. Drawing on sensemaking theory, we argue that feedback seeking is not merely an information-acquisition behavior but a socially embedded process through which employees clarify who they are at work. Across multi-wave and multi-source data, feedback seeking increases identity clarity, which in turn predicts proactive behavior. This effect is stronger in supportive climates.",
      structured: {
        question: "员工的反馈寻求行为是否会通过身份建构过程影响员工行为结果？",
        theory: ["意义建构理论", "身份认同理论", "反馈寻求理论"],
        method: "多阶段问卷设计；员工与主管配对样本；中介与调节效应检验。",
        findings: [
          "反馈寻求正向影响身份清晰性",
          "身份清晰性进一步促进主动行为",
          "组织支持氛围强化了该影响路径"
        ],
        contribution:
          "将反馈寻求从信息性行为推进为身份建构性行为理解，揭示了反馈互动塑造员工身份清晰性的微观机制。"
      },
      glossary: [
        {
          term: "identity",
          translation: "身份认同",
          description: "在管理与组织研究中，强调个体如何理解并界定自己在组织中的位置。"
        },
        {
          term: "sensemaking",
          translation: "意义建构",
          description: "指个体在模糊或变化情境中对信息进行解释并形成行动依据的过程。"
        },
        {
          term: "feedback",
          translation: "反馈",
          description: "指个体从他人或系统获取与自身行为、表现或角色相关的信息。"
        }
      ],
      variables: [
        {
          nameEn: "Feedback Seeking",
          nameZh: "反馈寻求",
          writing: "员工反馈寻求行为、主动反馈寻求",
          definition:
            "个体主动向他人寻求关于自身表现、行为或角色的评价与信息的行为。",
          measurement: "Likert 量表、自陈式问卷、多源报告",
          proxies: "反馈频率、反馈来源广度"
        },
        {
          nameEn: "Identity Clarity",
          nameZh: "身份清晰性",
          writing: "个体身份认知清晰性、员工身份清晰程度",
          definition:
            "个体对于自身在组织中的身份边界、角色定位及意义理解的清晰程度。",
          measurement: "Likert 量表、自我概念清晰性扩展量表",
          proxies: "self-concept clarity, role clarity"
        },
        {
          nameEn: "Proactive Behavior",
          nameZh: "主动行为",
          writing: "主动性行为、员工主动工作行为",
          definition: "员工在工作中主动提出改进、发起行动并影响环境的行为。",
          measurement: "主管评分、多源行为评价",
          proxies: "voice behavior, taking charge"
        }
      ],
      citations: [
        "反馈寻求不仅具有信息获取功能，还在员工身份建构过程中发挥关键作用。",
        "从意义建构视角看，员工在反馈互动中不断校准其自我理解与组织角色定位。",
        "身份清晰性的提升，是反馈寻求影响主动行为的重要中介机制。"
      ]
    },
    {
      id: "paper-2",
      titleZh: "组织支持如何激发员工主动性：来自身份认同视角的证据",
      titleEn: "How Organizational Support Activates Employee Proactivity: Evidence from an Identity Lens",
      authors: "L. Chen, K. Rogers",
      journal: "Academy of Management Journal",
      status: "Online First / 2026",
      relevance:
        "这篇论文与身份认同和主动行为高度相关，适合作为你讨论支持性情境与行为后果之间机制链条的补充文献。",
      recommendation: ["理论", "方法", "inspiration"],
      link: "https://example.com/paper-2",
      abstractZh:
        "研究表明，组织支持通过增强员工的身份确认感和行为正当性认知，显著提升其主动性表现，且在高不确定情境下作用更强。",
      abstractEn:
        "Organizational support strengthens employee proactivity by enhancing identity validation and behavioral legitimacy, especially under uncertainty."
    }
  ],
  workflows: [
    {
      id: "lit-review",
      title: "文献综述生成",
      stage: "开题 / 引言 / 理论综述",
      input: "选择若干论文，指定主题与章节用途。",
      output: "中文综述段落、理论缺口、英文综述草稿。"
    },
    {
      id: "construct",
      title: "变量构建",
      stage: "构念定义 / 假设开发",
      input: "输入研究现象、参考论文与目标期刊风格。",
      output: "中文变量命名、英文对照、测量方式、替代变量。"
    },
    {
      id: "empirical",
      title: "实证结果解释",
      stage: "结果报告 / 讨论写作",
      input: "输入模型结果、变量定义与假设信息。",
      output: "中文 JAP 风格结果解释、英文投稿表达。"
    },
    {
      id: "writing",
      title: "中文构思转英文投稿",
      stage: "论文写作",
      input: "输入中文逻辑草稿与参考文献。",
      output: "中文草稿、英文终稿、贡献表述版本。"
    }
  ]
};
