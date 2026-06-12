(function () {
  const STORAGE_KEY = "agentos-scoping-form-v1";
  const steps = window.AGENTOS_SCOPING_STEPS;
  let currentStep = 0;
  let values = {};

  const el = {
    progressBar: document.getElementById("progress-bar"),
    progressLabel: document.getElementById("progress-label"),
    stepTitle: document.getElementById("step-title"),
    stepSubtitle: document.getElementById("step-subtitle"),
    fields: document.getElementById("fields"),
    prevBtn: document.getElementById("btn-prev"),
    nextBtn: document.getElementById("btn-next"),
    saveHint: document.getElementById("save-hint"),
    exportPanel: document.getElementById("export-panel"),
    exportText: document.getElementById("export-text"),
    copyBtn: document.getElementById("btn-copy"),
    downloadBtn: document.getElementById("btn-download"),
    clearBtn: document.getElementById("btn-clear")
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        values = parsed.values || {};
        currentStep = Math.min(parsed.currentStep ?? 0, steps.length - 1);
      }
    } catch {
      values = {};
    }
    if (!values.filledDate) {
      values.filledDate = new Date().toISOString().slice(0, 10);
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ values, currentStep }));
    el.saveHint.textContent = "Saved " + new Date().toLocaleTimeString();
  }

  function getVal(id) {
    return values[id] ?? "";
  }

  function setVal(id, v) {
    values[id] = v;
    save();
  }

  function isProjectSkipped(step) {
    if (!step.projectKey) return false;
    const inc = getVal(step.id.replace(/^p/, "p") + "_include");
    const key = step.id + "_include";
    const v = getVal(key);
    return v === "NO" || v === "SKIP" || v === "DEFER";
  }

  function renderField(field) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.dataset.fieldId = field.id;

    const label = document.createElement("label");
    label.htmlFor = field.id;
    label.textContent = field.label + (field.required ? " *" : "");
    wrap.appendChild(label);

    const id = field.id;
    const val = getVal(id);

    if (field.type === "text" || field.type === "date" || field.type === "number") {
      const input = document.createElement("input");
      input.type = field.type;
      input.id = id;
      input.name = id;
      input.value = val;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.min != null) input.min = field.min;
      if (field.max != null) input.max = field.max;
      input.addEventListener("input", () => setVal(id, input.value));
      wrap.appendChild(input);
    } else if (field.type === "textarea") {
      const ta = document.createElement("textarea");
      ta.id = id;
      ta.name = id;
      ta.value = val;
      ta.rows = 3;
      if (field.placeholder) ta.placeholder = field.placeholder;
      ta.addEventListener("input", () => setVal(id, ta.value));
      wrap.appendChild(ta);
    } else if (field.type === "radio") {
      const group = document.createElement("div");
      group.className = "option-group";
      field.options.forEach((opt) => {
        const row = document.createElement("label");
        row.className = "option-row";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = id;
        input.value = opt;
        input.checked = val === opt;
        input.addEventListener("change", () => setVal(id, opt));
        row.appendChild(input);
        row.appendChild(document.createTextNode(" " + opt));
        group.appendChild(row);
      });
      wrap.appendChild(group);
    } else if (field.type === "checkbox") {
      const group = document.createElement("div");
      group.className = "option-group";
      const selected = Array.isArray(val) ? val : val ? String(val).split("|||") : [];
      field.options.forEach((opt) => {
        const row = document.createElement("label");
        row.className = "option-row";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = opt;
        input.checked = selected.includes(opt);
        input.addEventListener("change", () => {
          const boxes = group.querySelectorAll('input[type="checkbox"]');
          const next = [...boxes].filter((b) => b.checked).map((b) => b.value);
          setVal(id, next);
        });
        row.appendChild(input);
        row.appendChild(document.createTextNode(" " + opt));
        group.appendChild(row);
      });
      wrap.appendChild(group);
    }

    return wrap;
  }

  function updateFieldVisibility(step) {
    const inc = getVal(step.id + "_include");
    const skip = inc === "NO" || inc === "SKIP" || inc === "DEFER";
    if (!step.projectKey) return;
    el.fields.querySelectorAll(".field").forEach((node) => {
      const fid = node.dataset.fieldId;
      if (fid === step.id + "_include") return;
      node.classList.toggle("dimmed", skip);
    });
  }

  function renderStep() {
    const step = steps[currentStep];
    const pct = Math.round(((currentStep + 1) / steps.length) * 100);
    el.progressBar.style.width = pct + "%";
    el.progressLabel.textContent = "Step " + (currentStep + 1) + " of " + steps.length;
    el.stepTitle.textContent = step.title;
    el.stepSubtitle.textContent = step.subtitle || "";

    el.fields.innerHTML = "";
    step.fields.forEach((f) => el.fields.appendChild(renderField(f)));

    if (step.projectKey) {
      const incField = step.id + "_include";
      el.fields.querySelectorAll(`input[name="${incField}"]`).forEach((r) => {
        r.addEventListener("change", () => updateFieldVisibility(step));
      });
      updateFieldVisibility(step);
    }

    el.prevBtn.disabled = currentStep === 0;
    el.nextBtn.textContent = currentStep === steps.length - 1 ? "Finish & export" : "Next";

    el.exportPanel.hidden = currentStep !== steps.length - 1 || !el.exportText.value;
  }

  function formatCheckbox(id) {
    const v = getVal(id);
    const arr = Array.isArray(v) ? v : [];
    return arr.length ? arr.map((x) => "[x] " + x).join("\n") : "[ ] (none selected)";
  }

  function line(label, id) {
    const v = getVal(id);
    if (v === "" || v == null) return label + ": ___";
    if (Array.isArray(v)) return label + ":\n" + formatCheckbox(id);
    return label + ": " + v;
  }

  function projectBlock(num, title, subtitle, includeId, fieldLines) {
    const inc = getVal(includeId) || "___";
    let block =
      "\n================================================================================\n" +
      num +
      " — " +
      title +
      "\n" +
      subtitle +
      "\n================================================================================\n\n" +
      "Include: " +
      inc +
      "\n";
    fieldLines.forEach(([label, id]) => {
      block += line(label, id) + "\n";
    });
    return block;
  }

  function buildExport() {
    const text =
      "================================================================================\n" +
      "AGENTOS — ALL-PROJECTS SCOPING FORM (exported from web form)\n" +
      "================================================================================\n\n" +
      "FILLED BY: " +
      (getVal("filledBy") || "___") +
      "\n" +
      "DATE: " +
      (getVal("filledDate") || "___") +
      "\n\n" +
      "--------------------------------------------------------------------------------\n" +
      "SECTION 0 — GLOBAL DEFAULTS\n" +
      "--------------------------------------------------------------------------------\n\n" +
      line("Overall target", "overallTarget") +
      "\n" +
      line("Default implementer mode", "defaultImplementer") +
      "\n" +
      line("Default hosting", "defaultHosting") +
      "\n" +
      line("CI platform", "ciPlatform") +
      "\n" +
      line("Project order", "projectOrder") +
      "\n" +
      line("Projects to SKIP", "projectsSkip") +
      "\n" +
      line("Cross-cutting notes", "crossCutting") +
      "\n" +
      projectBlock("P1", "IMPLEMENTER REALISM", "Steps 141–150", "p1_include", [
        ["Priority", "p1_priority"],
        ["Target", "p1_target"],
        ["Modes", "p1_modes"],
        ["Tools", "p1_tools"],
        ["Other tools", "p1_toolsOther"],
        ["Max iterations", "p1_maxIterations"],
        ["Max minutes", "p1_maxMinutes"],
        ["Fix-verify", "p1_fixVerify"],
        ["Fix retries", "p1_fixRetries"],
        ["Gate commands", "p1_gateCommands"],
        ["No-write paths", "p1_noWritePaths"],
        ["Repo roots", "p1_repoRoots"],
        ["Repo roots other", "p1_repoRootsOther"],
        ["LLM", "p1_llm"],
        ["Success demo", "p1_demo"],
        ["Out of scope", "p1_outOfScope"],
        ["Blockers", "p1_blockers"]
      ]) +
      projectBlock("P2", "QUALITY GATES", "Steps 151–160", "p2_include", [
        ["Priority", "p2_priority"],
        ["Target", "p2_target"],
        ["Gates", "p2_gates"],
        ["Semgrep", "p2_semgrep"],
        ["Semgrep path", "p2_semgrepPath"],
        ["Min diff", "p2_minDiff"],
        ["UI", "p2_ui"],
        ["On fail", "p2_onFail"],
        ["Waive", "p2_waive"],
        ["Success demo", "p2_demo"],
        ["Out of scope", "p2_outOfScope"]
      ]) +
      projectBlock("P3", "RELEASE EXECUTION", "Steps 161–170", "p3_include", [
        ["Priority", "p3_priority"],
        ["Target", "p3_target"],
        ["Branch", "p3_branch"],
        ["Branch other", "p3_branchOther"],
        ["Commit author", "p3_commitAuthor"],
        ["Push", "p3_push"],
        ["Human approve", "p3_humanApprove"],
        ["Autopilot PR", "p3_autopilot"],
        ["GitHub repo", "p3_githubRepo"],
        ["PR template", "p3_prTemplate"],
        ["Issue on start", "p3_issueOnStart"],
        ["UI", "p3_ui"],
        ["Success demo", "p3_demo"],
        ["Out of scope", "p3_outOfScope"]
      ]) +
      projectBlock("P4", "LIVE DEV UX", "Steps 21–22, 185–186", "p4_include", [
        ["Priority", "p4_priority"],
        ["Target", "p4_target"],
        ["Routes", "p4_routes"],
        ["Events", "p4_events"],
        ["Events other", "p4_eventsOther"],
        ["WS fallback", "p4_wsFallback"],
        ["Poll seconds", "p4_pollSeconds"],
        ["Offline banner", "p4_offlineBanner"],
        ["Tunnel demo", "p4_tunnelDemo"],
        ["Polish", "p4_polish"],
        ["Success demo", "p4_demo"],
        ["Out of scope", "p4_outOfScope"]
      ]) +
      projectBlock("P5", "DISCORD TEST PARITY + CI", "D-04–D-17", "p5_include", [
        ["Priority", "p5_priority"],
        ["Target", "p5_target"],
        ["CI platform", "p5_ciPlatform"],
        ["CI jobs", "p5_ciJobs"],
        ["Work packages", "p5_workPackages"],
        ["Token in CI", "p5_tokenInCi"],
        ["Success demo", "p5_demo"],
        ["Out of scope", "p5_outOfScope"]
      ]) +
      projectBlock("P6", "HOSTED SCALE", "Steps 171–174", "p6_include", [
        ["Priority", "p6_priority"],
        ["Target", "p6_target"],
        ["Hosting", "p6_hosting"],
        ["Postgres", "p6_postgres"],
        ["Postgres custom", "p6_postgresCustom"],
        ["Redis", "p6_redis"],
        ["Workers", "p6_workers"],
        ["Same machine", "p6_sameMachine"],
        ["Scheduler", "p6_scheduler"],
        ["Migrate SQLite", "p6_migrate"],
        ["Success demo", "p6_demo"],
        ["Out of scope", "p6_outOfScope"]
      ]) +
      projectBlock("P7", "MEMORY CURATOR", "Steps 178–180", "p7_include", [
        ["Priority", "p7_priority"],
        ["Target", "p7_target"],
        ["Vector required", "p7_vectorRequired"],
        ["Backend", "p7_backend"],
        ["Types", "p7_types"],
        ["Approve policy", "p7_approve"],
        ["UI", "p7_ui"],
        ["Success demo", "p7_demo"],
        ["Out of scope", "p7_outOfScope"]
      ]) +
      projectBlock("P8", "SHIP", "Steps 187–190", "p8_include", [
        ["Priority", "p8_priority"],
        ["Target", "p8_target"],
        ["Tag", "p8_tag"],
        ["E2E in MR", "p8_e2e"],
        ["Merge checks", "p8_mergeChecks"],
        ["Docker", "p8_docker"],
        ["Registry", "p8_registry"],
        ["Release criteria", "p8_criteria"],
        ["Audience", "p8_audience"],
        ["Success demo", "p8_demo"],
        ["Out of scope", "p8_outOfScope"]
      ]) +
      projectBlock("P9", "APP INTAKE (optional)", "Step 123", "p9_include", [
        ["Priority", "p9_priority"],
        ["Target", "p9_target"],
        ["Inspect", "p9_inspect"],
        ["Output dir", "p9_outputDir"],
        ["Preview from", "p9_preview"],
        ["Regen", "p9_regen"],
        ["Success demo", "p9_demo"]
      ]) +
      "\n================================================================================\n" +
      "SECTION Z — SIGN-OFF\n" +
      "================================================================================\n\n" +
      line("Biggest risk", "z_risk") +
      "\n" +
      line("Success metric", "z_metric") +
      "\n" +
      line("Anything else", "z_other") +
      "\n\n================================================================================\n" +
      "END OF FORM — paste into Cursor chat for revised gameplans\n" +
      "================================================================================\n";

    return text;
  }

  function showExport() {
    const text = buildExport();
    el.exportText.value = text;
    el.exportPanel.hidden = false;
    el.exportPanel.scrollIntoView({ behavior: "smooth" });
  }

  el.prevBtn.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      save();
      renderStep();
    }
  });

  el.nextBtn.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      save();
      renderStep();
      if (currentStep === steps.length - 1) {
        showExport();
      }
    } else {
      showExport();
    }
  });

  el.copyBtn.addEventListener("click", async () => {
    if (!el.exportText.value) showExport();
    await navigator.clipboard.writeText(el.exportText.value);
    el.copyBtn.textContent = "Copied!";
    setTimeout(() => (el.copyBtn.textContent = "Copy for Cursor chat"), 2000);
  });

  el.downloadBtn.addEventListener("click", () => {
    if (!el.exportText.value) showExport();
    const blob = new Blob([el.exportText.value], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agentos-scoping-" + (getVal("filledDate") || "export") + ".txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  el.clearBtn.addEventListener("click", () => {
    if (confirm("Clear all saved answers?")) {
      localStorage.removeItem(STORAGE_KEY);
      values = { filledDate: new Date().toISOString().slice(0, 10) };
      currentStep = 0;
      el.exportPanel.hidden = true;
      el.exportText.value = "";
      renderStep();
    }
  });

  load();
  renderStep();
})();
