const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

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

// 你可以在这里自行增删期刊
const JOURNALS = [
  {
    name: "Academy of Management Journal",
    officialHome: "https://journals.aom.org/journal/amj"
  },
  {
    name: "Academy of Management Review",
    officialHome: "https://www.aom.org/publications/journals/review/"
  },
  {
    name: "Administrative Science Quarterly",
    officialHome: "https://journals.sagepub.com/home/asq"
  },
  {
    name: "Organization Science",
    officialHome: "https://pubsonline.informs.org/journal/orsc"
  },
  {
    name: "Strategic Management Journal",
    officialHome: "https://sms.onlinelibrary.wiley.com/journal/10970266"
  },
  {
    name: "Journal of Applied Psychology",
    officialHome: "https://www.apa.org/pubs/journals/apl"
  },
  {
    name: "Personnel Psychology",
    officialHome: "https://onlinelibrary.wiley.com/journal/17446570"
  },
  {
    name: "Organizational Behavior and Human Decision Processes",
    officialHome: "https://www.sciencedirect.com/journal/organizational-behavior-and-human-decision-processes"
  },
  {
    name: "MIS Quarterly",
    officialHome: "https://misq.umn.edu/"
  },
  {
    name: "Information Systems Research",
    officialHome: "https://pubsonline.informs.org/journal/isre"
  },
  {
    name: "Journal of Management Information Systems",
    officialHome: "https://www.tandfonline.com/journals/mmis20"
  },
  {
    name: "Journal of Organizational Behavior",
    officialHome: "https://onlinelibrary.wiley.com/journal/10991379"
  },
  {
    name: "Human Resource Management",
    officialHome: "https://onlinelibrary.wiley.com/journal/1099050X"
  }
];

function resolvePath(urlPath) {
  const cleanPath = urlPath.split("?")[0];
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(ROOT, requested));

  if (!filePath.startsWith(ROOT)) {
    return null;
  }

  return filePath;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function decodeHtml(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripJats(text = "") {
  return decodeHtml(String(text))
    .replace(/<jats:p>/g, "")
    .replace(/<\/jats:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPublishedDate(item) {
  const dateParts =
    item?.["published-online"]?.["date-parts"]?.[0] ||
    item?.published?.["date-parts"]?.[0] ||
    item?.issued?.["date-parts"]?.[0] ||
    [];

  const [year, month = 1, day = 1] = dateParts;
  if (!year) return null;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "日期待确认";
  return dateStr;
}

function buildRelevanceText(journalName) {
  return `来自 ${journalName} 的真实论文。当前版本按你设定的顶刊列表监控，后续可继续叠加研究主题相关性排序。`;
}

function buildPaperCard(item, journal) {
  const titleEn = item?.title?.[0]?.trim() || "Untitled";
  const authors = (item.author || [])
    .map((a) => {
      const given = a.given || "";
      const family = a.family || "";
      return `${given} ${family}`.trim();
    })
    .filter(Boolean)
    .join(", ");

  const dateStr = getPublishedDate(item);
  const doi = item.DOI ? `https://doi.org/${item.DOI}` : "";
  const abstractEn = stripJats(item.abstract || "");

  return {
    id: item.DOI || `${journal.name}-${titleEn}`.replace(/\s+/g, "-"),
    titleZh: `【真实文献】${titleEn}`,
    titleEn,
    authors: authors || "作者信息待补充",
    journal: journal.name,
    status: formatDate(dateStr),
    relevance: buildRelevanceText(journal.name),
    recommendation: ["真实文献", "顶刊监控"],
    link: doi || journal.officialHome,
    officialHome: journal.officialHome,
    abstractZh:
      "当前版本已接入真实文献元数据，但尚未自动生成中文摘要。下一步可再接 OpenAI 自动翻译与重写。",
    abstractEn:
      abstractEn ||
      "Crossref 元数据中未稳定返回摘要；可点击 DOI 或原刊官网查看原文页面。",
    structured: {
      question: "待自动抽取研究问题",
      theory: ["待自动抽取理论基础"],
      method: "待自动抽取研究方法",
      findings: ["待自动抽取核心发现"],
      contribution: "待自动抽取理论贡献"
    },
    glossary: [],
    variables: [],
    citations: [],
    sourceType: "crossref",
    doi: item.DOI || "",
    publishedDate: dateStr || ""
  };
}

async function fetchCrossrefForJournal(journal, rows = 5, fromDate = "2024-01-01") {
  const apiUrl = new URL("https://api.crossref.org/works");
  apiUrl.searchParams.set(
    "filter",
    `container-title:${journal.name},type:journal-article,from-pub-date:${fromDate}`
  );
  apiUrl.searchParams.set("sort", "published");
  apiUrl.searchParams.set("order", "desc");
  apiUrl.searchParams.set("rows", String(rows));
  apiUrl.searchParams.set(
    "select",
    "DOI,title,author,container-title,issued,published,published-online,URL,abstract"
  );
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
  const items = data?.message?.items || [];
  return items.map((item) => buildPaperCard(item, journal));
}

async function fetchAllPapers({ perJournal = 4, fromDate = "2024-01-01" } = {}) {
  const settled = await Promise.allSettled(
    JOURNALS.map((journal) =>
      fetchCrossrefForJournal(journal, perJournal, fromDate)
    )
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

  const deduped = [];
  const seen = new Set();

  for (const paper of papers) {
    const key = paper.doi || `${paper.journal}::${paper.titleEn}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(paper);
    }
  }

  deduped.sort((a, b) => {
    const da = a.publishedDate || "";
    const db = b.publishedDate || "";
    return db.localeCompare(da);
  });

  return { papers: deduped, errors };
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);

    // API: 期刊列表
    if (requestUrl.pathname === "/api/journals") {
      return sendJson(res, 200, {
        journals: JOURNALS
      });
    }

    // API: 真实论文
    if (requestUrl.pathname === "/api/papers") {
      const perJournal = Number(requestUrl.searchParams.get("perJournal") || "4");
      const fromDate = requestUrl.searchParams.get("fromDate") || "2024-01-01";

      const payload = await fetchAllPapers({
        perJournal: Number.isFinite(perJournal) ? perJournal : 4,
        fromDate
      });

      return sendJson(res, 200, payload);
    }

    const filePath = resolvePath(req.url || "/");

    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const fallback = path.join(ROOT, "index.html");

        fs.readFile(fallback, (fallbackErr, fallbackData) => {
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
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Chinese Academic OS running at http://localhost:${PORT}`);
});