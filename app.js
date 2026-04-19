const JOURNAL_CONFIG = [
  {
    key: "amj",
    name: "Academy of Management Journal",
    shortName: "AMJ",
    officialHome: "https://journals.aom.org/journal/amj"
  },
  {
    key: "amr",
    name: "Academy of Management Review",
    shortName: "AMR",
    officialHome: "https://journals.aom.org/journal/amr"
  },
  {
    key: "asq",
    name: "Administrative Science Quarterly",
    shortName: "ASQ",
    officialHome: "https://journals.sagepub.com/home/asq"
  },
  {
    key: "orsc",
    name: "Organization Science",
    shortName: "Organization Science",
    officialHome: "https://pubsonline.informs.org/journal/orsc"
  },
  {
    key: "smj",
    name: "Strategic Management Journal",
    shortName: "SMJ",
    officialHome: "https://sms.onlinelibrary.wiley.com/journal/10970266"
  },
  {
    key: "jap",
    name: "Journal of Applied Psychology",
    shortName: "JAP",
    officialHome: "https://www.apa.org/pubs/journals/apl"
  },
  {
    key: "ppsych",
    name: "Personnel Psychology",
    shortName: "Personnel Psychology",
    officialHome: "https://onlinelibrary.wiley.com/journal/17446570"
  },
  {
    key: "obhdp",
    name: "Organizational Behavior and Human Decision Processes",
    shortName: "OBHDP",
    officialHome:
      "https://www.sciencedirect.com/journal/organizational-behavior-and-human-decision-processes"
  },
  {
    key: "misq",
    name: "MIS Quarterly",
    shortName: "MISQ",
    officialHome: "https://misq.umn.edu/"
  },
  {
    key: "isr",
    name: "Information Systems Research",
    shortName: "ISR",
    officialHome: "https://pubsonline.informs.org/journal/isre"
  },
  {
    key: "jmis",
    name: "Journal of Management Information Systems",
    shortName: "JMIS",
    officialHome: "https://www.jmis-web.org/"
  },
  {
    key: "job",
    name: "Journal of Organizational Behavior",
    shortName: "JOB",
    officialHome: "https://onlinelibrary.wiley.com/journal/10991379"
  },
  {
    key: "hrm",
    name: "Human Resource Management",
    shortName: "HRM",
    officialHome: "https://onlinelibrary.wiley.com/journal/1099050x"
  }
];

const RESEARCH_TOPICS = {
  creatorPlatform: [
    "content creator",
    "creator platform",
    "content platform",
    "creative platform",
    "influencer",
    "kol",
    "creator performance",
    "creator efficacy",
    "creator effectiveness",
    "content creation",
    "user feedback",
    "positive feedback",
    "negative feedback",
    "audience feedback",
    "platform governance",
    "algorithmic recommendation",
    "recommendation algorithm"
  ],
  identity: [
    "identity",
    "identification",
    "identity construction",
    "identity work",
    "organizational identity",
    "professional identity",
    "role identity",
    "platform identity",
    "sensemaking",
    "self-concept",
    "identity clarity"
  ],
  digitalHRM: [
    "digital hrm",
    "digital human resource management",
    "human resource management",
    "hr analytics",
    "ai in hrm",
    "human-ai collaboration",
    "human ai collaboration",
    "human-machine collaboration",
    "human machine collaboration",
    "algorithmic management",
    "automation",
    "augmentation",
    "decision support",
    "digital work",
    "future of work"
  ],
  nsfcProject: [
    "content platform",
    "user feedback",
    "positive feedback",
    "negative feedback",
    "creator effectiveness",
    "creator efficacy",
    "cognition",
    "identification",
    "dual-path model",
    "dual path model"
  ]
};

const SOURCE_ID_CACHE = new Map();
const FIVE_YEARS_AGO = `${new Date().getFullYear() - 5}-01-01`;

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function rebuildAbstractFromInvertedIndex(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return "";
  }

  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      positions.forEach((pos) => {
        words[pos] = word;
      });
    }
  }

  return words.filter(Boolean).join(" ").trim();
}

function pickBestSourceMatch(results, journalName) {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const target = normalizeText(journalName);

  const exact = results.find(
    (item) => normalizeText(item.display_name) === target
  );
  if (exact) return exact;

  const contains = results.find(
    (item) =>
      normalizeText(item.display_name).includes(target) ||
      target.includes(normalizeText(item.display_name))
  );
  if (contains) return contains;

  return results[0];
}

async function fetchWithTimeout(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSourceIdForJournal(journal) {
  if (SOURCE_ID_CACHE.has(journal.name)) {
    return SOURCE_ID_CACHE.get(journal.name);
  }

  const url =
    `https://api.openalex.org/sources?` +
    `search=${encodeURIComponent(journal.name)}` +
    `&filter=type:journal` +
    `&per-page=10`;

  const res = await fetchWithTimeout(url, 15000);
  if (!res.ok) {
    throw new Error(`无法获取期刊 source: ${journal.name}`);
  }

  const payload = await res.json();
  const bestMatch = pickBestSourceMatch(payload.results || [], journal.name);

  if (!bestMatch || !bestMatch.id) {
    throw new Error(`未找到期刊 source: ${journal.name}`);
  }

  SOURCE_ID_CACHE.set(journal.name, bestMatch.id);
  return bestMatch.id;
}

function scoreKeywordGroup(text, keywords, titleBoost = 5, abstractBoost = 3) {
  let score = 0;
  const matched = [];

  const titleText = normalizeText(text.title);
  const abstractText = normalizeText(text.abstract);

  keywords.forEach((keyword) => {
    const kw = normalizeText(keyword);

    if (titleText.includes(kw)) {
      score += titleBoost;
      matched.push(keyword);
    }

    if (abstractText.includes(kw)) {
      score += abstractBoost;
      matched.push(keyword);
    }
  });

  return {
    score,
    matched: [...new Set(matched)]
  };
}

function scorePaperRelevance(title, abstractText, dateStr) {
  const text = {
    title: title || "",
    abstract: abstractText || ""
  };

  const creatorResult = scoreKeywordGroup(text, RESEARCH_TOPICS.creatorPlatform, 6, 3);
  const identityResult = scoreKeywordGroup(text, RESEARCH_TOPICS.identity, 5, 3);
  const digitalHRMResult = scoreKeywordGroup(text, RESEARCH_TOPICS.digitalHRM, 5, 3);
  const nsfcResult = scoreKeywordGroup(text, RESEARCH_TOPICS.nsfcProject, 6, 4);

  let score =
    creatorResult.score +
    identityResult.score +
    digitalHRMResult.score +
    nsfcResult.score;

  const combinedText = `${normalizeText(title)} ${normalizeText(abstractText)}`;

  if (
    (combinedText.includes("platform") || combinedText.includes("creator platform")) &&
    (
      combinedText.includes("creator") ||
      combinedText.includes("influencer") ||
      combinedText.includes("kol")
    ) &&
    combinedText.includes("feedback")
  ) {
    score += 12;
  }

  if (
    combinedText.includes("identity") &&
    (
      combinedText.includes("platform") ||
      combinedText.includes("organization") ||
      combinedText.includes("organizational") ||
      combinedText.includes("work")
    )
  ) {
    score += 8;
  }

  if (
    combinedText.includes("human-ai") ||
    combinedText.includes("human ai") ||
    combinedText.includes("human-machine") ||
    combinedText.includes("human machine") ||
    combinedText.includes("algorithmic management") ||
    combinedText.includes("digital hrm")
  ) {
    score += 8;
  }

  if (
    combinedText.includes("feedback") &&
    (
      combinedText.includes("creator effectiveness") ||
      combinedText.includes("creator efficacy") ||
      combinedText.includes("creator performance")
    ) &&
    (
      combinedText.includes("cognition") ||
      combinedText.includes("identification") ||
      combinedText.includes("identity")
    )
  ) {
    score += 10;
  }

  const year = Number(String(dateStr || "").slice(0, 4));
  const currentYear = new Date().getFullYear();
  if (!Number.isNaN(year)) {
    score += Math.max(0, 6 - (currentYear - year));
  }

  const matchedKeywords = [
    ...creatorResult.matched,
    ...identityResult.matched,
    ...digitalHRMResult.matched,
    ...nsfcResult.matched
  ];

  return {
    score,
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 8)
  };
}

function buildRelevanceText(journalName, relevanceScore, matchedKeywords) {
  if (!matchedKeywords || matchedKeywords.length === 0) {
    return `${journalName}；匹配得分 ${relevanceScore}`;
  }

  return `${journalName}；匹配得分 ${relevanceScore}，关键词：${matchedKeywords.join("、")}`;
}

function buildPaperObject(work, journal, index) {
  const titleEn = work.display_name || work.title || "Untitled";
  const titleZh = `（中文待翻译）${titleEn}`;
  const authors =
    work.authorships?.map((a) => a.author?.display_name).filter(Boolean).join(", ") ||
    "作者信息待补充";

  const abstractEn = rebuildAbstractFromInvertedIndex(work.abstract_inverted_index);

  const doiLink =
    work.doi ||
    work.ids?.doi ||
    work.primary_location?.landing_page_url ||
    journal.officialHome;

  const sourceName =
    work.primary_location?.source?.display_name ||
    journal.name;

  const pubDate =
    work.publication_date ||
    String(work.publication_year || "");

  const relevanceResult = scorePaperRelevance(titleEn, abstractEn, pubDate);

  return {
    id: work.id || `${journal.key}-${index}`,
    titleZh: `【${journal.shortName}】${titleZh}`,
    titleEn,
    authors,
    journal: sourceName,
    status: pubDate || "日期待确认",
    relevanceScore: relevanceResult.score,
    matchedKeywords: relevanceResult.matchedKeywords,
    relevance: buildRelevanceText(
      journal.name,
      relevanceResult.score,
      relevanceResult.matchedKeywords
    ),
    recommendation: ["顶刊监控", journal.shortName, `相关性 ${relevanceResult.score}`],
    link: doiLink,
    officialHome: journal.officialHome,
    abstractZh: "",
    abstractEn: abstractEn || "No abstract returned by OpenAlex for this record.",
    structured: {
      question: "待自动抽取研究问题",
      theory: ["待自动抽取理论基础"],
      method: "待自动抽取研究方法",
      findings: ["待自动抽取核心发现"],
      contribution: "待自动抽取理论贡献"
    },
    glossary: [],
    variables: [],
    citations: []
  };
}

async function fetchLatestWorksForJournal(journal, perJournal = 5) {
  const sourceId = await fetchSourceIdForJournal(journal);

  const url =
    `https://api.openalex.org/works?` +
    `filter=journal:${encodeURIComponent(sourceId)},from_publication_date:${FIVE_YEARS_AGO},is_paratext:false` +
    `&sort=publication_date:desc` +
    `&per-page=${perJournal}`;

  const res = await fetchWithTimeout(url, 15000);
  if (!res.ok) {
    throw new Error(`无法获取论文: ${journal.name}`);
  }

  const payload = await res.json();
  const results = payload.results || [];

  return results.map((work, index) => buildPaperObject(work, journal, index));
}

async function fetchRealPapers() {
  const papers = [];

  for (const journal of JOURNAL_CONFIG) {
    try {
      console.log("开始抓取期刊：", journal.name);
      const results = await fetchLatestWorksForJournal(journal, 5);
      papers.push(...results);
      console.log("抓取成功：", journal.name, results.length, "篇");
    } catch (error) {
      console.warn("期刊抓取失败：", journal.name, error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  papers.sort((a, b) => {
    const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return String(b.status || "").localeCompare(String(a.status || ""));
  });

  console.log("最终抓取到论文总数：", papers.length);

  return papers.slice(0, 40);
}

(function () {
  const data = window.APP_DATA;
  data.papers = [];

  const state = {
    route: "home",
    locale: data.user.locale,
    viewMode: "summary",
    selectedPaperId: null,
    isLoading: true,
    loadError: ""
  };

  const navList = document.getElementById("nav-list");
  const contentRoot = document.getElementById("content-root");
  const topbarTitle = document.getElementById("topbar-title");
  const preferenceSummary = document.getElementById("preference-summary");
  const topicList = document.getElementById("topic-list");
  const heroStats = document.getElementById("hero-stats");
  const tooltip = document.getElementById("tooltip");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  const localeToggle = document.getElementById("locale-toggle");
  const quickTranslate = document.getElementById("quick-translate");
  const modalClose = document.getElementById("modal-close");

  function t(zh, en) {
    return state.locale === "zh-CN" ? zh : en;
  }

  function getSelectedPaper() {
    if (!Array.isArray(data.papers) || data.papers.length === 0) {
      return null;
    }

    return data.papers.find((paper) => paper.id === state.selectedPaperId) || data.papers[0];
  }

  function renderNav() {
    navList.innerHTML = data.nav
      .map(
        (item) => `
          <button class="nav-btn ${state.route === item.id ? "active" : ""}" data-route="${item.id}">
            ${t(item.labelZh, item.labelEn)}
          </button>
        `
      )
      .join("");
  }

  function renderSidebar() {
    preferenceSummary.innerHTML = Object.entries(data.user.terminologyPreferences)
      .map(
        ([key, value]) => `
          <div class="preference-row">
            <span>${key}</span>
            <strong>${value}</strong>
          </div>
        `
      )
      .join("");

    topicList.innerHTML = data.user.interests.map((topic) => `<li>${topic}</li>`).join("");
  }

  function renderHeroStats() {
    const stats = [
      { label: "监控期刊", value: `${JOURNAL_CONFIG.length} 本` },
      { label: "时间范围", value: "近5年" },
      { label: "当前展示", value: `${data.papers.length} 篇` }
    ];

    heroStats.innerHTML = stats
      .map(
        (stat) => `
          <div class="stat-card">
            <span>${stat.label}</span>
            <strong>${stat.value}</strong>
          </div>
        `
      )
      .join("");
  }

  function paperCard(paper) {
    return `
      <article class="paper-card">
        <div class="paper-card-head">
          <div>
            <p class="paper-title-zh">${paper.titleZh}</p>
            <p class="paper-title-en">${paper.titleEn}</p>
          </div>
          <span class="status-pill">${paper.status}</span>
        </div>
        <p class="meta-line">${paper.authors} | ${paper.journal}</p>
        ${paper.abstractZh ? `<p class="paper-abstract">${paper.abstractZh}</p>` : ""}
        <div class="relevance-box">
          <p class="section-label">为什么与你研究相关</p>
          <p>${paper.relevance}</p>
        </div>
        <div class="tag-row">
          ${paper.recommendation
            .map((tag) => `<span class="tag-chip">${tag}</span>`)
            .join("")}
        </div>
        <div class="action-row">
          <button class="ghost-btn" data-open-paper="${paper.id}" data-mode="summary">只看中文总结</button>
          <button class="primary-btn" data-open-paper="${paper.id}" data-mode="full">查看详情</button>
          <button class="ghost-btn" data-open-paper="${paper.id}" data-mode="compare">中英对照</button>
          <a class="text-link" href="${paper.link}" target="_blank" rel="noreferrer">DOI / 原文链接</a>
          <a class="text-link" href="${paper.officialHome}" target="_blank" rel="noreferrer">期刊官网</a>
        </div>
      </article>
    `;
  }

  function renderHome() {
    topbarTitle.textContent = t("今天值得读的论文", "Papers Worth Reading Today");

    if (state.isLoading) {
      contentRoot.innerHTML = `
        <section class="section-block">
          <div class="section-header">
            <div>
              <p class="section-label">Daily Paper Push</p>
              <h3>${t("正在抓取顶刊论文...", "Loading top-journal papers...")}</h3>
            </div>
          </div>
          <div class="content-card">
            <p>${t("正在从指定期刊抓取近5年并按研究主题筛选，请稍候。", "Fetching papers from selected journals over the last 5 years and ranking by relevance.")}</p>
          </div>
        </section>
      `;
      return;
    }

    if (state.loadError) {
      contentRoot.innerHTML = `
        <section class="section-block">
          <div class="section-header">
            <div>
              <p class="section-label">Daily Paper Push</p>
              <h3>${t("加载失败", "Load Failed")}</h3>
            </div>
          </div>
          <div class="content-card">
            <p>${state.loadError}</p>
          </div>
        </section>
      `;
      return;
    }

    if (!Array.isArray(data.papers) || data.papers.length === 0) {
      contentRoot.innerHTML = `
        <section class="section-block">
          <div class="section-header">
            <div>
              <p class="section-label">Daily Paper Push</p>
              <h3>${t("没有检索到结果", "No Results")}</h3>
            </div>
          </div>
          <div class="content-card">
            <p>${t("当前没有抓取到符合条件的论文。", "No matching papers were retrieved.")}</p>
          </div>
        </section>
      `;
      return;
    }

    contentRoot.innerHTML = `
      <section class="section-block">
        <div class="section-header">
          <div>
            <p class="section-label">Daily Paper Push</p>
            <h3>${t("近5年顶刊中与你主题最相关的论文", "Most Relevant Papers from Top Journals")}</h3>
          </div>
        </div>
        <div class="paper-grid">
          ${data.papers.map(paperCard).join("")}
        </div>
      </section>
    `;
  }

  function renderGlossaryChips(paper) {
    return (paper.glossary || [])
      .map(
        (item) => `
          <button class="term-chip" data-term="${item.term}">
            <span>${item.translation}</span>
            <small>${item.term}</small>
          </button>
        `
      )
      .join("");
  }

  function renderVariables(paper) {
    return (paper.variables || [])
      .map(
        (item, index) => `
          <button class="variable-card" data-variable-index="${index}">
            <span class="section-label">${item.nameEn}</span>
            <strong>${item.nameZh}</strong>
            <p>${item.writing}</p>
          </button>
        `
      )
      .join("");
  }

  function renderPaper() {
    const paper = getSelectedPaper();

    if (!paper) {
      topbarTitle.textContent = t("论文深度阅读", "Deep Reading");
      contentRoot.innerHTML = `
        <section class="content-card">
          <p>${t("暂无论文可显示。", "No paper to display.")}</p>
        </section>
      `;
      return;
    }

    topbarTitle.textContent = t("论文深度阅读", "Deep Reading");

    const bodyByMode = {
      summary: `
        <section class="paper-detail-grid">
          <aside class="outline-card">
            <p class="section-label">结构导航</p>
            <ul class="outline-list">
              <li>中文摘要</li>
              <li>研究问题</li>
              <li>理论基础</li>
              <li>方法</li>
              <li>核心发现</li>
              <li>理论贡献</li>
              <li>术语表</li>
              <li>关键变量</li>
              <li>可引用句</li>
            </ul>
          </aside>
          <div class="paper-content">
            <section class="content-card">
              <p class="section-label">中文摘要（重写版）</p>
              <p>${paper.abstractZh || "暂未生成中文摘要。"}</p>
            </section>
            <section class="content-card">
              <p class="section-label">相关性信息</p>
              <p>${paper.relevance}</p>
            </section>
            <section class="content-card">
              <p class="section-label">核心内容提炼</p>
              <div class="summary-grid">
                <div>
                  <h4>研究问题</h4>
                  <p>${paper.structured.question}</p>
                </div>
                <div>
                  <h4>理论基础</h4>
                  <p>${(paper.structured.theory || []).join("、")}</p>
                </div>
                <div>
                  <h4>方法</h4>
                  <p>${paper.structured.method}</p>
                </div>
                <div>
                  <h4>理论贡献</h4>
                  <p>${paper.structured.contribution}</p>
                </div>
              </div>
              <div>
                <h4>核心发现</h4>
                <ul class="flat-list">
                  ${(paper.structured.findings || []).map((item) => `<li>${item}</li>`).join("")}
                </ul>
              </div>
            </section>
            <section class="content-card">
              <p class="section-label">术语表</p>
              <div class="term-chip-row">${renderGlossaryChips(paper)}</div>
            </section>
            <section class="content-card">
              <p class="section-label">关键变量</p>
              <div class="variable-grid">${renderVariables(paper)}</div>
            </section>
            <section class="content-card">
              <p class="section-label">可引用句</p>
              <ol class="citation-list">
                ${(paper.citations || []).map((item) => `<li>${item}</li>`).join("")}
              </ol>
            </section>
          </div>
        </section>
      `,
      full: `
        <section class="content-card">
          <p class="section-label">标题</p>
          <h3>${paper.titleZh}</h3>
          <p class="paper-title-en">${paper.titleEn}</p>
          <p class="meta-line">${paper.authors} | ${paper.journal} | ${paper.status}</p>
          <p>
            <a class="text-link" href="${paper.link}" target="_blank" rel="noreferrer">DOI / 原文链接</a>
            &nbsp;|&nbsp;
            <a class="text-link" href="${paper.officialHome}" target="_blank" rel="noreferrer">期刊官网</a>
          </p>
        </section>
        <section class="content-card">
          <p class="section-label">相关性说明</p>
          <p>${paper.relevance}</p>
        </section>
        <section class="content-card">
          <p class="section-label">英文摘要</p>
          <p>${paper.abstractEn}</p>
        </section>
        <section class="content-card">
          <p class="section-label">中文提示</p>
          <p>${paper.abstractZh || "暂未生成中文摘要。"}</p>
        </section>
      `,
      compare: `
        <section class="compare-grid">
          <div class="compare-col">
            <p class="section-label">中文提示版</p>
            <h3>${paper.titleZh}</h3>
            <p>${paper.abstractZh || "暂未生成中文摘要。"}</p>
            <p>${paper.relevance}</p>
          </div>
          <div class="compare-col">
            <p class="section-label">English Metadata / Abstract</p>
            <h3>${paper.titleEn}</h3>
            <p>${paper.abstractEn}</p>
          </div>
        </section>
      `
    };

    contentRoot.innerHTML = `
      <section class="paper-header-card">
        <div>
          <p class="paper-title-zh">${paper.titleZh}</p>
          <p class="paper-title-en">${paper.titleEn}</p>
          <p class="meta-line">${paper.authors} | ${paper.journal} | ${paper.status}</p>
        </div>
        <div class="action-row wrap">
          <button class="mode-btn ${state.viewMode === "full" ? "active" : ""}" data-view-mode="full">查看详情</button>
          <button class="mode-btn ${state.viewMode === "summary" ? "active" : ""}" data-view-mode="summary">只看中文总结</button>
          <button class="mode-btn ${state.viewMode === "compare" ? "active" : ""}" data-view-mode="compare">中英对照</button>
        </div>
      </section>
      ${bodyByMode[state.viewMode]}
    `;
  }

  function renderWorkflow() {
    topbarTitle.textContent = t("中文科研工作流", "Research Workflows");

    contentRoot.innerHTML = `
      <section class="section-block">
        <div class="section-header">
          <div>
            <p class="section-label">Workflow Center</p>
            <h3>${t("从阅读直接走向产出", "Move from reading to output")}</h3>
          </div>
        </div>
        <div class="workflow-grid">
          ${data.workflows
            .map(
              (item) => `
                <article class="workflow-card">
                  <p class="section-label">${item.stage}</p>
                  <h4>${item.title}</h4>
                  <p><strong>输入：</strong>${item.input}</p>
                  <p><strong>输出：</strong>${item.output}</p>
                  <button class="primary-btn workflow-launch" data-workflow="${item.id}">生成示例结果</button>
                </article>
              `
            )
            .join("")}
        </div>
        <section class="content-card">
          <p class="section-label">示例输出</p>
          <div id="workflow-output">
            选择一个工作流，即可查看符合中文学术风格的输出示例。
          </div>
        </section>
      </section>
    `;
  }

  function renderGlossary() {
    const paper = getSelectedPaper();
    topbarTitle.textContent = t("术语与变量库", "Glossary & Constructs");

    if (!paper) {
      contentRoot.innerHTML = `
        <section class="content-card">
          <p>${t("暂无术语与变量可显示。", "No glossary items to display.")}</p>
        </section>
      `;
      return;
    }

    contentRoot.innerHTML = `
      <section class="section-block">
        <div class="section-header">
          <div>
            <p class="section-label">Terminology Memory</p>
            <h3>${t("保持中英文科研表达一致", "Keep research language consistent")}</h3>
          </div>
        </div>
        <div class="library-grid">
          <section class="content-card">
            <p class="section-label">核心术语表</p>
            <div class="glossary-list">
              ${(paper.glossary || [])
                .map(
                  (item) => `
                    <div class="glossary-item">
                      <div>
                        <strong>${item.translation}</strong>
                        <p>${item.term}</p>
                      </div>
                      <p>${item.description}</p>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>
          <section class="content-card">
            <p class="section-label">变量库</p>
            <div class="glossary-list">
              ${(paper.variables || [])
                .map(
                  (item, index) => `
                    <button class="library-variable" data-variable-index="${index}">
                      <strong>${item.nameZh}</strong>
                      <span>${item.nameEn}</span>
                      <p>${item.writing}</p>
                    </button>
                  `
                )
                .join("")}
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function render() {
    renderNav();
    renderSidebar();
    renderHeroStats();

    if (state.route === "home") {
      renderHome();
      return;
    }

    if (state.route === "paper") {
      renderPaper();
      return;
    }

    if (state.route === "workflow") {
      renderWorkflow();
      return;
    }

    renderGlossary();
  }

  function openVariable(index) {
    const paper = getSelectedPaper();
    const item = paper?.variables?.[index];

    if (!item) {
      return;
    }

    modalContent.innerHTML = `
      <p class="section-label">${item.nameEn}</p>
      <h3>${item.nameZh}</h3>
      <p><strong>定义：</strong>${item.definition}</p>
      <p><strong>写作表达：</strong>${item.writing}</p>
      <p><strong>测量方式：</strong>${item.measurement}</p>
      <p><strong>替代变量：</strong>${item.proxies}</p>
    `;

    modalBackdrop.classList.remove("hidden");
  }

  function showTooltip(target, content) {
    tooltip.innerHTML = `
      <strong>${content.translation}</strong>
      <p>${content.term}</p>
      <p>${content.description}</p>
    `;

    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
    tooltip.classList.remove("hidden");
  }

  function hideTooltip() {
    tooltip.classList.add("hidden");
  }

  function updateWorkflowOutput(workflowId) {
    const el = document.getElementById("workflow-output");

    if (!el) {
      return;
    }

    const outputs = {
      "lit-review":
        "现有研究普遍将反馈寻求视为信息获取行为，强调其在绩效改进、学习适应和角色明确中的功能。然而，这一视角忽视了反馈寻求所具有的身份建构意义。事实上，员工在寻求反馈的过程中不仅获取外部评价信息，也在持续互动中修正自我理解与角色定位。因此，围绕反馈寻求如何通过身份清晰性塑造主动行为展开研究，有助于推进反馈寻求与身份认同文献的整合。",
      construct:
        "建议变量命名为“身份清晰性”（identity clarity）。该构念可定义为：个体对自身组织身份、角色边界与行为定位的清晰认知程度。可采用 Likert 量表测量，并以 self-concept clarity 或 role clarity 作为相近替代构念。",
      empirical:
        "结果显示，反馈寻求显著提升员工身份清晰性，且身份清晰性进一步促进主动行为。这意味着反馈寻求不仅具有信息功能，也通过增强员工对自我角色的明确认知，进而推动其采取更主动的工作行为。",
      writing:
        "中文草稿：本研究从意义建构视角出发，探讨反馈寻求如何通过身份清晰性影响员工主动行为。英文表达：Drawing on sensemaking theory, we examine how feedback seeking shapes employee proactivity through identity clarity."
    };

    el.textContent = outputs[workflowId] || "";
  }

  document.addEventListener("click", (event) => {
    const routeBtn = event.target.closest("[data-route]");
    const paperBtn = event.target.closest("[data-open-paper]");
    const modeBtn = event.target.closest("[data-view-mode]");
    const variableBtn = event.target.closest("[data-variable-index]");
    const workflowBtn = event.target.closest("[data-workflow]");
    const heroBtn = event.target.closest(".hero-actions [data-route]");

    if (routeBtn || heroBtn) {
      const route = (routeBtn || heroBtn).dataset.route;
      state.route = route;
      render();
      return;
    }

    if (paperBtn) {
      state.selectedPaperId = paperBtn.dataset.openPaper;
      state.viewMode = paperBtn.dataset.mode;
      state.route = "paper";
      render();
      return;
    }

    if (modeBtn) {
      state.viewMode = modeBtn.dataset.viewMode;
      render();
      return;
    }

    if (variableBtn) {
      openVariable(Number(variableBtn.dataset.variableIndex));
      return;
    }

    if (workflowBtn) {
      updateWorkflowOutput(workflowBtn.dataset.workflow);
    }
  });

  document.addEventListener("mouseover", (event) => {
    const termBtn = event.target.closest("[data-term]");
    if (!termBtn) {
      return;
    }

    const paper = getSelectedPaper();
    const content = (paper?.glossary || []).find((item) => item.term === termBtn.dataset.term);
    if (content) {
      showTooltip(termBtn, content);
    }
  });

  document.addEventListener("mouseout", (event) => {
    if (event.target.closest("[data-term]")) {
      hideTooltip();
    }
  });

  localeToggle.addEventListener("click", () => {
    state.locale = state.locale === "zh-CN" ? "en-US" : "zh-CN";
    render();
  });

  quickTranslate.addEventListener("click", () => {
    state.route = "paper";
    state.viewMode = "full";
    render();
  });

  modalClose.addEventListener("click", () => {
    modalBackdrop.classList.add("hidden");
  });

  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      modalBackdrop.classList.add("hidden");
    }
  });

  state.isLoading = true;
  render();

  fetchRealPapers()
    .then((papers) => {
      state.isLoading = false;

      if (Array.isArray(papers) && papers.length > 0) {
        data.papers = papers;
        state.selectedPaperId = papers[0].id;
        state.loadError = "";
      } else {
        data.papers = [];
        state.selectedPaperId = null;
        state.loadError = "没有抓取到符合条件的论文。";
      }

      render();
    })
    .catch((error) => {
      console.error("加载真实期刊论文失败：", error);
      state.isLoading = false;
      data.papers = [];
      state.selectedPaperId = null;
      state.loadError = "OpenAlex 请求失败或超时，请刷新重试，或更换网络环境。";
      render();
    });
})();