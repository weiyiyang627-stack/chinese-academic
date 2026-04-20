const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.join(__dirname, "web");
const PORT = process.env.PORT || 3000;
const LANGBLY_API_URL = "https://api.langbly.com/language/translate/v2";
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY || process.env.TRANSLATE_API_KEY || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

const JOURNALS = [
  ["Academy of Management Journal", "AMJ", "https://journals.aom.org/journal/amj"],
  ["Academy of Management Review", "AMR", "https://www.aom.org/publications/journals/review/"],
  ["Administrative Science Quarterly", "ASQ", "https://journals.sagepub.com/home/asq"],
  ["Organization Science", "Organization Science", "https://pubsonline.informs.org/journal/orsc"],
  ["Strategic Management Journal", "SMJ", "https://sms.onlinelibrary.wiley.com/journal/10970266"],
  ["Journal of Applied Psychology", "JAP", "https://www.apa.org/pubs/journals/apl"],
  ["Personnel Psychology", "Personnel Psychology", "https://onlinelibrary.wiley.com/journal/17446570"],
  [
    "Organizational Behavior and Human Decision Processes",
    "OBHDP",
    "https://www.sciencedirect.com/journal/organizational-behavior-and-human-decision-processes"
  ],
  ["MIS Quarterly", "MISQ", "https://misq.umn.edu/"],
  ["Information Systems Research", "ISR", "https://pubsonline.informs.org/journal/isre"],
  ["Journal of Management Information Systems", "JMIS", "https://www.tandfonline.com/journals/mmis20"],
  ["Journal of Organizational Behavior", "JOB", "https://onlinelibrary.wiley.com/journal/10991379"],
  ["Human Resource Management", "HRM", "https://onlinelibrary.wiley.com/journal/1099050X"]
].map(([name, shortName, officialHome]) => ({ name, shortName, officialHome }));

const GLOSSARY = [
  ["identity", "身份认同", "个体对自身在组织、职业或平台情境中所处位置与角色意义的理解。"],
  ["sensemaking", "意义建构", "个体在模糊或变化情境中解释信息、形成理解并指导行动的过程。"],
  ["feedback", "反馈", "来自他人、组织或系统的关于个体行为、表现或角色的信息。"],
  ["algorithmic management", "算法管理", "组织或平台通过算法进行任务分配、评价、控制与激励的管理方式。"],
  ["human-ai", "人机协同", "人与人工智能系统共同完成任务、决策或创造性工作的协作关系。"]
].map(([term, translation, description]) => ({ term, translation, description }));

const VARIABLES = [
  {
    keyword: "identity",
    nameEn: "Identity Clarity",
    nameZh: "身份清晰性",
    writing: "个体身份认知清晰性、员工身份清晰程度",
    definition: "个体对自身组织身份、角色边界与行为定位的清晰认知程度。",
    measurement: "Likert 量表、自陈式问卷、身份清晰性相关量表。",
    proxies: "self-concept clarity, role clarity"
  },
  {
    keyword: "feedback",
    nameEn: "Feedback Seeking",
    nameZh: "反馈寻求",
    writing: "员工反馈寻求行为、主动反馈寻求",
    definition: "个体主动向他人寻求关于自身表现、行为或角色的信息与评价。",
    measurement: "反馈寻求量表、反馈频率、反馈来源广度。",
    proxies: "feedback inquiry, feedback monitoring"
  },
  {
    keyword: "proactive",
    nameEn: "Proactive Behavior",
    nameZh: "主动行为",
    writing: "主动性行为、员工主动工作行为",
    definition: "员工主动发起改变、提出建议或影响工作环境的行为。",
    measurement: "主管评分、多源行为评价、主动行为量表。",
    proxies: "voice behavior, taking charge"
  }
];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function decodeHtml(text = "") {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripJats(text = "") {
  return decodeHtml(text)
    .replace(/<jats:p>/g, "")
    .replace(/<\/jats:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPublishedDate(item) {
  const parts =
    item?.["published-online"]?.["date-parts"]?.[0] ||
    item?.published?.["date-parts"]?.[0] ||
    item?.issued?.["date-parts"]?.[0] ||
    [];

  const [year, month = 1, day = 1] = parts;
  if (!year) return "";

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePaper(title, abstractText, dateStr) {
  const combined = normalizeText(`${title} ${abstractText}`);
  const keywords = [
    "content creator",
    "creator platform",
    "platform",
    "feedback",
    "positive feedback",
    "negative feedback",
    "identity",
    "identification",
    "identity construction",
    "sensemaking",
    "algorithmic management",
    "human-ai",
    "human ai",
    "digital hrm",
    "proactive"
  ];

  const matchedKeywords = keywords.filter((keyword) => combined.includes(keyword));
  let score = matchedKeywords.length * 4;

  const year = Number(String(dateStr || "").slice(0, 4));
  const currentYear = new Date().getFullYear();

  if (!Number.isNaN(year)) {
    score += Math.max(0, 6 - (currentYear - year));
  }

  return {
    score,
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 8)
  };
}

function pickGlossary(title, abstractText) {
  const combined = normalizeText(`${title} ${abstractText}`);
  return GLOSSARY.filter((item) => combined.includes(item.term));
}

function pickVariables(title, abstractText) {
  const combined = normalizeText(`${title} ${abstractText}`);
  return VARIABLES.filter((item) => combined.includes(item.keyword)).map(({ keyword, ...item }) => item);
}

function buildPaperCard(item, journal) {
  const titleEn = item?.title?.[0]?.trim() || "Untitled";

  const authors = (item.author || [])
    .map((author) => `${author.given || ""} ${author.family || ""}`.trim())
    .filter(Boolean)
    .join(", ");

  const publishedDate = getPublishedDate(item);
  const abstractEn = stripJats(item.abstract || "");
  const doi = item.DOI ? `https://doi.org/${item.DOI}` : "";
  const relevance = scorePaper(titleEn, abstractEn, publishedDate);

  return {
    id: item.DOI || `${journal.name}-${titleEn}`.replace(/\s+/g, "-"),
    titleZh: `【${journal.shortName}】${titleEn}`,
    titleEn,
    authors: authors || "作者信息待补充",
    journal: journal.name,
    status: publishedDate || "日期待确认",
    relevanceScore: relevance.score,
    matchedKeywords: relevance.matchedKeywords,
    relevance: relevance.matchedKeywords.length
      ? `来自 ${journal.name} 的论文；相关性得分 ${relevance.score}，关键词：${relevance.matchedKeywords.join("、")}。`
      : `来自 ${journal.name} 的论文；相关性得分 ${relevance.score}。`,
    recommendation: [journal.shortName, `相关性 ${relevance.score}`],
    link: doi || journal.officialHome,
    officialHome: journal.officialHome,
    abstractZh: "",
    abstractEn: abstractEn || "Crossref 元数据中未稳定返回摘要；可点击 DOI 或原刊官网查看原文页面。",
    structured: {
      question: "待自动抽取研究问题",
      theory: ["待自动抽取理论基础"],
      method: "待自动抽取研究方法",
      findings: ["待自动抽取核心发现"],
      contribution: "待自动抽取理论贡献"
    },
    glossary: pickGlossary(titleEn, abstractEn),
    variables: pickVariables(titleEn, abstractEn),
    citations: [],
    sourceType: "crossref",
    doi: item.DOI || "",
    publishedDate,
    translated: false
  };
}

async function fetchCrossrefForJournal(journal, rows = 4, fromDate = "2024-01-01") {
  const apiUrl = new URL("https://api.crossref.org/works");

  apiUrl.searchParams.set(
    "filter",
    `container-title:${journal.name},type:journal-article,from-pub-date:${fromDate}`
  );
  apiUrl.searchParams.set("sort", "published");
  apiUrl.searchParams.set("order", "desc");
  apiUrl.searchParams.set("rows", String(rows));
  apiUrl.searchParams.set("select", "DOI,title,author,issued,published,published-online,abstract");
  apiUrl.searchParams.set("mailto", "example@example.com");

  const response = await fetch(apiUrl.toString(), {
    headers: {
      "User-Agent": "ChineseAcademicOS/1.0 (mailto:example@example.com)"
    }
  });

  if (!response.ok) {
    throw new Error(`Crossref request failed for ${journal.name}: ${response.status}`);
  }

  const data = await response.json();
  return (data?.message?.items || []).map((item) => buildPaperCard(item, journal));
}

async function fetchAllPapers({ perJournal = 4, fromDate = "2024-01-01" } = {}) {
  const settled = await Promise.allSettled(
    JOURNALS.map((journal) => fetchCrossrefForJournal(journal, perJournal, fromDate))
  );

  const papers = [];
  const errors = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      papers.push(...result.value);
    } else {
      errors.push({
        journal: JOURNALS[index].name,
        error: result.reason?.message || "unknown error"
      });
    }
  });

  const seen = new Set();
  const deduped = papers.filter((paper) => {
    const key = paper.doi || `${paper.journal}::${paper.titleEn}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => {
    const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return String(b.publishedDate || "").localeCompare(String(a.publishedDate || ""));
  });

  return { papers: deduped, errors };
}

function extractLangblyTranslation(payload) {
  return (
    payload?.data?.translations?.[0]?.translatedText ||
    payload?.data?.translations?.[0]?.translated_text ||
    payload?.translations?.[0]?.translatedText ||
    payload?.translations?.[0]?.translated_text ||
    payload?.translatedText ||
    payload?.translated_text ||
    payload?.translation ||
    ""
  );
}

async function translateText(text, { source = "en", target = "zh-CN" } = {}) {
  const input = String(text || "").trim();

  if (!input) return "";

  if (!LANGBLY_API_KEY) {
    throw new Error("缺少 Langbly API key。请先设置环境变量 LANGBLY_API_KEY。");
  }

  const response = await fetch(LANGBLY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": LANGBLY_API_KEY
    },
    body: JSON.stringify({
      q: input,
      source,
      target,
      format: "text",
      quality: "standard"
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        `Langbly translation failed: ${response.status}`
    );
  }

  const translatedText = extractLangblyTranslation(payload);

  if (!translatedText) {
    throw new Error("Langbly 返回成功，但没有找到 translatedText 字段。");
  }

  return translatedText;
}

async function handleTranslate(req, res) {
  const body = await readJsonBody(req);

  const translatedText = await translateText(body.text, {
    source: body.source || "en",
    target: body.target || "zh-CN"
  });

  return sendJson(res, 200, { translatedText });
}

async function handleTranslatePaper(req, res) {
  const body = await readJsonBody(req);
  const paper = body.paper || {};

  const [titleZh, abstractZh] = await Promise.all([
    translateText(paper.titleEn || paper.titleZh || ""),
    translateText(paper.abstractEn || "")
  ]);

  const translatedPaper = {
    ...paper,
    titleZh: titleZh || paper.titleZh,
    abstractZh: abstractZh || paper.abstractZh,
    structured: {
      question: `本文围绕“${titleZh || paper.titleEn}”所涉及的核心研究问题展开。`,
      theory: pickGlossary(paper.titleEn, paper.abstractEn).map((item) => `${item.translation}相关理论`),
      method: "当前基于题名与摘要自动生成；具体研究方法需结合论文全文确认。",
      findings: abstractZh
        ? [`摘要要点：${abstractZh.slice(0, 120)}${abstractZh.length > 120 ? "..." : ""}`]
        : [],
      contribution: "当前版本已完成标题和摘要的中文翻译；理论贡献建议在导入全文后进一步精炼。"
    },
    glossary: pickGlossary(paper.titleEn, paper.abstractEn),
    variables: pickVariables(paper.titleEn, paper.abstractEn),
    citations: abstractZh
      ? [
          `该研究围绕“${titleZh || paper.titleEn}”展开，可作为相关理论讨论的参考文献。`,
          `从摘要来看，该文可用于支持 ${paper.journal || "管理学"} 情境下的机制解释。`
        ]
      : [],
    translated: true
  };

  return sendJson(res, 200, { paper: translatedPaper });
}

function serveStatic(req, res) {
  const cleanPath = (req.url || "/").split("?")[0];
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(ROOT, requested));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, "index.html"), (fallbackErr, fallbackData) => {
        if (fallbackErr) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fallbackData);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);

    if (requestUrl.pathname === "/api/journals") {
      return sendJson(res, 200, { journals: JOURNALS });
    }

    if (requestUrl.pathname === "/api/papers") {
      const perJournal = Number(requestUrl.searchParams.get("perJournal") || "4");
      const fromDate = requestUrl.searchParams.get("fromDate") || "2024-01-01";

      const payload = await fetchAllPapers({
        perJournal: Number.isFinite(perJournal) ? perJournal : 4,
        fromDate
      });

      return sendJson(res, 200, payload);
    }

    if (requestUrl.pathname === "/api/translate" && req.method === "POST") {
      return await handleTranslate(req, res);
    }

    if (requestUrl.pathname === "/api/translate-paper" && req.method === "POST") {
      return await handleTranslatePaper(req, res);
    }

    return serveStatic(req, res);
  } catch (error) {
    return sendJson(res, 500, {
      error: error.message || "Server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Chinese Academic OS running at http://localhost:${PORT}`);
  console.log(
    LANGBLY_API_KEY
      ? "Langbly translation proxy is enabled."
      : "Langbly translation proxy is disabled: LANGBLY_API_KEY is not set."
  );
});
