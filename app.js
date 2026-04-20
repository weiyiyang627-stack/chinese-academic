(function () {
  const data = window.APP_DATA;
  data.papers = [];

  const state = {
    route: "home",
    locale: data.user.locale,
    viewMode: "summary",
    selectedPaperId: null,
    isLoading: true,
    loadError: "",
    isTranslating: false,
    translationError: ""
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSelectedPaper() {
    if (!Array.isArray(data.papers) || data.papers.length === 0) {
      return null;
    }

    return data.papers.find((paper) => paper.id === state.selectedPaperId) || data.papers[0];
  }

  async function fetchPapers() {
    const res = await fetch("/api/papers?perJournal=4&fromDate=2024-01-01");

    if (!res.ok) {
      throw new Error("论文数据加载失败");
    }

    const payload = await res.json();
    return payload.papers || [];
  }

  async function translatePaper(paper) {
    const res = await fetch("/api/translate-paper", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ paper })
    });

    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload.error || "翻译请求失败");
    }

    return payload.paper;
  }

  async function ensurePaperTranslated(paper) {
    if (!paper || paper.translated) {
      return paper;
    }

    state.isTranslating = true;
    state.translationError = "";
    render();

    try {
      const translatedPaper = await translatePaper(paper);
      const index = data.papers.findIndex((item) => item.id === paper.id);

      if (index >= 0) {
        data.papers[index] = translatedPaper;
      }

      return translatedPaper;
    } catch (error) {
      console.error("翻译失败：", error);
      state.translationError = error.message || "翻译失败，请稍后重试。";
      return paper;
    } finally {
      state.isTranslating = false;
      render();
    }
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
            <span>${escapeHtml(key)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `
      )
      .join("");

    topicList.innerHTML = data.user.interests
      .map((topic) => `<li>${escapeHtml(topic)}</li>`)
      .join("");
  }

  function renderHeroStats() {
    const translatedCount = data.papers.filter((paper) => paper.translated).length;

    const stats = [
      { label: "监控期刊", value: "13 本" },
      { label: "当前展示", value: `${data.papers.length} 篇` },
      { label: "已翻译", value: `${translatedCount} 篇` }
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

  function renderTranslationNotice() {
    if (state.isTranslating) {
      return `
        <section class="content-card">
          <p class="section-label">Langbly 翻译中</p>
          <p>正在调用 Langbly 生成中文标题和中文摘要，请稍候。</p>
        </section>
      `;
    }

    if (state.translationError) {
      return `
        <section class="content-card">
          <p class="section-label">翻译提示</p>
          <p>${escapeHtml(state.translationError)}</p>
        </section>
      `;
    }

    return "";
  }

  function paperCard(paper) {
    return `
      <article class="paper-card">
        <div class="paper-card-head">
          <div>
            <p class="paper-title-zh">${escapeHtml(paper.titleZh)}</p>
            <p class="paper-title-en">${escapeHtml(paper.titleEn)}</p>
          </div>
          <span class="status-pill">${escapeHtml(paper.status)}</span>
        </div>

        <p class="meta-line">${escapeHtml(paper.authors)} | ${escapeHtml(paper.journal)}</p>

        ${
          paper.abstractZh
            ? `<p class="paper-abstract">${escapeHtml(paper.abstractZh)}</p>`
            : `<p class="paper-abstract muted-copy"></p>`
        }

        <div class="relevance-box">
          <p class="section-label">为什么与你研究相关</p>
          <p>${escapeHtml(paper.relevance)}</p>
        </div>

        <div class="tag-row">
          ${(paper.recommendation || [])
            .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
            .join("")}
        </div>

        <div class="action-row">
          <button class="ghost-btn" data-open-paper="${escapeHtml(paper.id)}" data-mode="summary">只看中文总结</button>
          <button class="primary-btn" data-open-paper="${escapeHtml(paper.id)}" data-mode="full" data-translate="true">一键翻译全文</button>
          <button class="ghost-btn" data-open-paper="${escapeHtml(paper.id)}" data-mode="compare" data-translate="true">中英对照</button>
          <a class="text-link" href="${escapeHtml(paper.link)}" target="_blank" rel="noreferrer">DOI / 原文链接</a>
          <a class="text-link" href="${escapeHtml(paper.officialHome)}" target="_blank" rel="noreferrer">期刊官网</a>
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
            <p>${t("正在从 Crossref 获取论文元数据，请稍候。", "Fetching real paper metadata from Crossref.")}</p>
          </div>
        </section>
      `;
      return;
    }

    if (state.loadError) {
      contentRoot.innerHTML = `
        <section class="content-card">
          <p class="section-label">加载失败</p>
          <p>${escapeHtml(state.loadError)}</p>
        </section>
      `;
      return;
    }

    contentRoot.innerHTML = `
      ${renderTranslationNotice()}
      <section class="section-block">
        <div class="section-header">
          <div>
            <p class="section-label">Daily Paper Push</p>
            <h3>${t("顶刊论文监控", "Top-journal Paper Monitoring")}</h3>
          </div>
        </div>
        <div class="paper-grid">
          ${data.papers.map(paperCard).join("")}
        </div>
      </section>
    `;
  }

  function renderGlossaryChips(paper) {
    if (!paper.glossary || paper.glossary.length === 0) {
      return `<p class="muted-copy">暂未识别到可高亮术语。完成全文翻译或导入全文后可继续扩展。</p>`;
    }

    return paper.glossary
      .map(
        (item) => `
          <button class="term-chip" data-term="${escapeHtml(item.term)}">
            <span>${escapeHtml(item.translation)}</span>
            <small>${escapeHtml(item.term)}</small>
          </button>
        `
      )
      .join("");
  }

  function renderVariables(paper) {
    if (!paper.variables || paper.variables.length === 0) {
      return `<p class="muted-copy">暂未识别到关键变量。可在导入全文后进一步抽取。</p>`;
    }

    return paper.variables
      .map(
        (item, index) => `
          <button class="variable-card" data-variable-index="${index}">
            <span class="section-label">${escapeHtml(item.nameEn)}</span>
            <strong>${escapeHtml(item.nameZh)}</strong>
            <p>${escapeHtml(item.writing)}</p>
          </button>
        `
      )
      .join("");
  }

  function renderPaper() {
    const paper = getSelectedPaper();
    topbarTitle.textContent = t("论文深度阅读", "Deep Reading");

    if (!paper) {
      contentRoot.innerHTML = `<section class="content-card"><p>暂无论文可显示。</p></section>`;
      return;
    }

    const findings = paper.structured?.findings || [];

    const summaryHtml = `
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
            <p class="section-label">中文摘要（Langbly 翻译版）</p>
            <p>${escapeHtml(paper.abstractZh || "暂未生成中文摘要。点击“一键翻译全文”后生成。")}</p>
          </section>

          <section class="content-card">
            <p class="section-label">核心内容提炼</p>
            <div class="summary-grid">
              <div>
                <h4>研究问题</h4>
                <p>${escapeHtml(paper.structured?.question)}</p>
              </div>
              <div>
                <h4>理论基础</h4>
                <p>${escapeHtml((paper.structured?.theory || []).join("、"))}</p>
              </div>
              <div>
                <h4>方法</h4>
                <p>${escapeHtml(paper.structured?.method)}</p>
              </div>
              <div>
                <h4>理论贡献</h4>
                <p>${escapeHtml(paper.structured?.contribution)}</p>
              </div>
            </div>

            <h4>核心发现</h4>
            <ul class="flat-list">
              ${findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
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
              ${(paper.citations || [])
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("") || "<li>完成翻译后自动生成。</li>"}
            </ol>
          </section>
        </div>
      </section>
    `;

    const fullHtml = `
      <section class="content-card">
        <p class="section-label">标题翻译</p>
        <h3>${escapeHtml(paper.titleZh)}</h3>
        <p class="paper-title-en">${escapeHtml(paper.titleEn)}</p>
        <p class="meta-line">${escapeHtml(paper.authors)} | ${escapeHtml(paper.journal)} | ${escapeHtml(paper.status)}</p>
        <p>
          <a class="text-link" href="${escapeHtml(paper.link)}" target="_blank" rel="noreferrer">DOI / 原文链接</a>
          &nbsp;|&nbsp;
          <a class="text-link" href="${escapeHtml(paper.officialHome)}" target="_blank" rel="noreferrer">期刊官网</a>
        </p>
      </section>

      <section class="content-card">
        <p class="section-label">中文摘要</p>
        <p>${escapeHtml(paper.abstractZh || "暂未生成中文摘要。")}</p>
      </section>

      <section class="content-card">
        <p class="section-label">英文摘要</p>
        <p>${escapeHtml(paper.abstractEn)}</p>
      </section>
    `;

    const compareHtml = `
      <section class="compare-grid">
        <div class="compare-col">
          <p class="section-label">中文学术版</p>
          <h3>${escapeHtml(paper.titleZh)}</h3>
          <p>${escapeHtml(paper.abstractZh || "暂未生成中文摘要。")}</p>
          <p>${escapeHtml(paper.relevance)}</p>
        </div>

        <div class="compare-col">
          <p class="section-label">English Metadata / Abstract</p>
          <h3>${escapeHtml(paper.titleEn)}</h3>
          <p>${escapeHtml(paper.abstractEn)}</p>
        </div>
      </section>
    `;

    const bodyByMode = {
      summary: summaryHtml,
      full: fullHtml,
      compare: compareHtml
    };

    contentRoot.innerHTML = `
      ${renderTranslationNotice()}
      <section class="paper-header-card">
        <div>
          <p class="paper-title-zh">${escapeHtml(paper.titleZh)}</p>
          <p class="paper-title-en">${escapeHtml(paper.titleEn)}</p>
          <p class="meta-line">${escapeHtml(paper.authors)} | ${escapeHtml(paper.journal)} | ${escapeHtml(paper.status)}</p>
        </div>

        <div class="action-row wrap">
          <button class="mode-btn ${state.viewMode === "full" ? "active" : ""}" data-view-mode="full">一键翻译全文</button>
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
                  <p class="section-label">${escapeHtml(item.stage)}</p>
                  <h4>${escapeHtml(item.title)}</h4>
                  <p><strong>输入：</strong>${escapeHtml(item.input)}</p>
                  <p><strong>输出：</strong>${escapeHtml(item.output)}</p>
                  <button class="primary-btn workflow-launch" data-workflow="${escapeHtml(item.id)}">生成示例结果</button>
                </article>
              `
            )
            .join("")}
        </div>

        <section class="content-card">
          <p class="section-label">示例输出</p>
          <div id="workflow-output">选择一个工作流，即可查看符合中文学术风格的输出示例。</div>
        </section>
      </section>
    `;
  }

  function renderGlossary() {
    const paper = getSelectedPaper();
    topbarTitle.textContent = t("术语与变量库", "Glossary & Constructs");

    if (!paper) {
      contentRoot.innerHTML = `<section class="content-card"><p>暂无术语与变量可显示。</p></section>`;
      return;
    }

    contentRoot.innerHTML = `
      <section class="section-block">
        <div class="section-header">
          <div>
            <p class="section-label">Terminology Memory</p>
            <h3>保持中英文科研表达一致</h3>
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
                        <strong>${escapeHtml(item.translation)}</strong>
                        <p>${escapeHtml(item.term)}</p>
                      </div>
                      <p>${escapeHtml(item.description)}</p>
                    </div>
                  `
                )
                .join("") || "<p>暂未识别术语。</p>"}
            </div>
          </section>

          <section class="content-card">
            <p class="section-label">变量库</p>
            <div class="glossary-list">
              ${(paper.variables || [])
                .map(
                  (item, index) => `
                    <button class="library-variable" data-variable-index="${index}">
                      <strong>${escapeHtml(item.nameZh)}</strong>
                      <span>${escapeHtml(item.nameEn)}</span>
                      <p>${escapeHtml(item.writing)}</p>
                    </button>
                  `
                )
                .join("") || "<p>暂未识别变量。</p>"}
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

    if (state.route === "home") return renderHome();
    if (state.route === "paper") return renderPaper();
    if (state.route === "workflow") return renderWorkflow();

    return renderGlossary();
  }

  function openVariable(index) {
    const paper = getSelectedPaper();
    const item = paper?.variables?.[index];

    if (!item) return;

    modalContent.innerHTML = `
      <p class="section-label">${escapeHtml(item.nameEn)}</p>
      <h3>${escapeHtml(item.nameZh)}</h3>
      <p><strong>定义：</strong>${escapeHtml(item.definition)}</p>
      <p><strong>写作表达：</strong>${escapeHtml(item.writing)}</p>
      <p><strong>测量方式：</strong>${escapeHtml(item.measurement)}</p>
      <p><strong>替代变量：</strong>${escapeHtml(item.proxies)}</p>
    `;

    modalBackdrop.classList.remove("hidden");
  }

  function showTooltip(target, content) {
    tooltip.innerHTML = `
      <strong>${escapeHtml(content.translation)}</strong>
      <p>${escapeHtml(content.term)}</p>
      <p>${escapeHtml(content.description)}</p>
    `;

    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
    tooltip.classList.remove("hidden");
  }

  function updateWorkflowOutput(workflowId) {
    const el = document.getElementById("workflow-output");

    if (!el) return;

    const outputs = {
      "lit-review":
        "现有研究普遍将反馈寻求视为信息获取行为，强调其在绩效改进、学习适应和角色明确中的功能。然而，这一视角相对忽视了反馈寻求所具有的身份建构意义。",
      construct:
        "建议变量命名为“身份清晰性”（identity clarity）。该构念可定义为：个体对自身组织身份、角色边界与行为定位的清晰认知程度。",
      empirical:
        "结果显示，反馈寻求显著提升员工身份清晰性，且身份清晰性进一步促进主动行为。",
      writing:
        "中文草稿：本研究从意义建构视角出发，探讨反馈寻求如何通过身份清晰性影响员工主动行为。英文表达：Drawing on sensemaking theory, we examine how feedback seeking shapes employee proactivity through identity clarity."
    };

    el.textContent = outputs[workflowId] || "";
  }

  document.addEventListener("click", async (event) => {
    const routeBtn = event.target.closest("[data-route]");
    const paperBtn = event.target.closest("[data-open-paper]");
    const modeBtn = event.target.closest("[data-view-mode]");
    const variableBtn = event.target.closest("[data-variable-index]");
    const workflowBtn = event.target.closest("[data-workflow]");

    if (routeBtn) {
      state.route = routeBtn.dataset.route;
      render();
      return;
    }

    if (paperBtn) {
      state.selectedPaperId = paperBtn.dataset.openPaper;
      state.viewMode = paperBtn.dataset.mode;
      state.route = "paper";
      render();

      if (paperBtn.dataset.translate === "true") {
        await ensurePaperTranslated(getSelectedPaper());
      }

      return;
    }

    if (modeBtn) {
      state.viewMode = modeBtn.dataset.viewMode;
      render();

      if (state.viewMode === "full" || state.viewMode === "compare") {
        await ensurePaperTranslated(getSelectedPaper());
      }

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

    if (!termBtn) return;

    const paper = getSelectedPaper();
    const content = (paper?.glossary || []).find((item) => item.term === termBtn.dataset.term);

    if (content) {
      showTooltip(termBtn, content);
    }
  });

  document.addEventListener("mouseout", (event) => {
    if (event.target.closest("[data-term]")) {
      tooltip.classList.add("hidden");
    }
  });

  localeToggle.addEventListener("click", () => {
    state.locale = state.locale === "zh-CN" ? "en-US" : "zh-CN";
    render();
  });

  quickTranslate.addEventListener("click", async () => {
    state.route = "paper";
    state.viewMode = "full";
    render();
    await ensurePaperTranslated(getSelectedPaper());
  });

  modalClose.addEventListener("click", () => {
    modalBackdrop.classList.add("hidden");
  });

  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      modalBackdrop.classList.add("hidden");
    }
  });

  render();

  fetchPapers()
    .then((papers) => {
      state.isLoading = false;
      data.papers = papers;
      state.selectedPaperId = papers[0]?.id || null;
      state.loadError = papers.length ? "" : "没有抓取到符合条件的论文。";
      render();
    })
    .catch((error) => {
      console.error("加载期刊论文失败：", error);
      state.isLoading = false;
      data.papers = [];
      state.selectedPaperId = null;
      state.loadError = "论文请求失败或超时，请刷新重试，或更换网络环境。";
      render();
    });
})();
