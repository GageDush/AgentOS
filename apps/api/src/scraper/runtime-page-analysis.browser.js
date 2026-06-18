window.__agentosAnalyzeRuntimePage = function analyzeRuntimePage() {
  function importanceFromLabel(label) {
    if (label.includes("nav") || label.includes("cta") || label.includes("pricing")) return "important";
    if (label.includes("hero") || label.includes("sticky")) return "critical";
    return "decorative";
  }

  function inferLabel(seed, classes) {
    const value = `${seed} ${classes}`.toLowerCase();
    if (value.includes("hero")) return "hero_section_reveal";
    if (value.includes("pricing")) return "interactive_pricing_card";
    if (value.includes("testimonial")) return "testimonial_carousel_or_quote_block";
    if (value.includes("feature")) return "animated_feature_tile";
    if (value.includes("nav")) return "floating_navigation_element";
    if (value.includes("button") || value.includes("cta")) return "primary_hero_cta_button";
    if (value.includes("gradient")) return "hero_gradient_background_panel";
    if (value.includes("card")) return "animated_feature_card";
    return sanitize(seed || classes || "scroll_triggered_reveal_container");
  }

  function sanitize(value) {
    return value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase()
      .slice(0, 80);
  }

  const collectText = (value) => value.trim().replace(/\s+/g, " ").slice(0, 160);
  const assetSet = new Map();
  const scripts = Array.from(document.querySelectorAll("script[src]"))
    .map((el) => el.getAttribute("src"))
    .filter(Boolean);
  const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style[data-href], link[as='style']"))
    .map((el) => (el instanceof HTMLLinkElement ? el.href : el.getAttribute("data-href")))
    .filter(Boolean);
  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((el) => el.getAttribute("href"))
    .filter(Boolean);
  const mailtoLinks = Array.from(document.querySelectorAll("a[href^='mailto:']"))
    .map((el) => (el.getAttribute("href") || "").replace(/^mailto:/i, "").trim())
    .filter(Boolean);
  const telLinks = Array.from(document.querySelectorAll("a[href^='tel:']"))
    .map((el) => (el.getAttribute("href") || "").replace(/^tel:/i, "").trim())
    .filter(Boolean);
  const socialLinks = Array.from(document.querySelectorAll("a[href]"))
    .map((el) => el.getAttribute("href") || "")
    .filter((href) => /instagram|twitter|x\.com|linkedin|facebook|youtube|tiktok|github/i.test(href))
    .slice(0, 12);
  const contactText = document.body.innerText || "";
  const emailMatches = Array.from(contactText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map((match) => match[0]);
  const phoneMatches = Array.from(contactText.matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)).map((match) => match[0].trim());
  const visibleTextSnippets = Array.from(document.querySelectorAll("h1, h2, h3, p, button, a"))
    .map((el) => collectText(el.textContent || ""))
    .filter(Boolean)
    .slice(0, 18);

  const heroText =
    collectText(document.querySelector("h1")?.textContent || "") ||
    collectText(document.querySelector("[data-framer-name]")?.textContent || "");

  const addAsset = (record) => {
    if (!record.sourceUrl && record.extractionMode !== "screenshot_inference") return;
    if (!assetSet.has(record.key)) assetSet.set(record.key, record);
  };

  Array.from(document.querySelectorAll("img[src]")).forEach((el, index) => {
    addAsset({
      key: `img:${el.currentSrc || el.src || index}`,
      labelHint: el.alt || `image_${index + 1}`,
      kind: "img",
      sourceUrl: el.currentSrc || el.src,
      extractionMode: "rendered_runtime",
      confidence: "high",
      selector: "img",
      nearbyText: collectText(el.closest("section, article, div")?.textContent || ""),
      screenshotRegion: "visible_runtime_layout"
    });
  });

  Array.from(document.querySelectorAll("picture source[srcset], source[srcset]")).forEach((el, index) => {
    const srcset = el.getAttribute("srcset") || "";
    const sourceUrl = srcset.split(",")[0]?.trim().split(" ")[0] || "";
    addAsset({
      key: `source:${sourceUrl || index}`,
      labelHint: `responsive_source_${index + 1}`,
      kind: "source",
      sourceUrl,
      extractionMode: "rendered_runtime",
      confidence: "medium",
      selector: "source",
      screenshotRegion: "responsive_media_candidate"
    });
  });

  Array.from(document.querySelectorAll("video[poster], video[src]")).forEach((el, index) => {
    addAsset({
      key: `video:${el.poster || el.currentSrc || el.src || index}`,
      labelHint: `video_poster_${index + 1}`,
      kind: "video",
      sourceUrl: el.poster || el.currentSrc || el.src,
      extractionMode: "rendered_runtime",
      confidence: "high",
      selector: "video",
      screenshotRegion: "runtime_video_surface"
    });
  });

  Array.from(document.querySelectorAll("link[rel*='icon']"))
    .slice(0, 4)
    .forEach((el, index) => {
      addAsset({
        key: `favicon:${el.href || index}`,
        labelHint: `favicon_${index + 1}`,
        kind: "favicon",
        sourceUrl: el.href,
        extractionMode: "rendered_runtime",
        confidence: "high",
        selector: "link[rel*=icon]"
      });
    });

  Array.from(document.querySelectorAll("meta[property='og:image'], meta[name='twitter:image']")).forEach((el, index) => {
    const content = el.getAttribute("content") || "";
    addAsset({
      key: `meta:${content || index}`,
      labelHint: `social_preview_image_${index + 1}`,
      kind: "og_image",
      sourceUrl: content,
      extractionMode: "rendered_runtime",
      confidence: "medium",
      selector: "meta[property='og:image']",
      preservationNote: "Useful as brand or marketing preview reference."
    });
  });

  Array.from(document.querySelectorAll("svg")).forEach((el, index) => {
    addAsset({
      key: `svg:${index}`,
      labelHint: el.getAttribute("aria-label") || `inline_svg_${index + 1}`,
      kind: "svg",
      sourceUrl: "not_directly_available",
      extractionMode: "screenshot_inference",
      confidence: "medium",
      selector: "svg",
      screenshotRegion: "inline_vector_surface",
      preservationNote: "Vector is visible at runtime but may not have a direct standalone asset URL."
    });
  });

  Array.from(document.querySelectorAll("canvas")).forEach((el, index) => {
    addAsset({
      key: `canvas:${index}`,
      labelHint: el.getAttribute("aria-label") || `canvas_surface_${index + 1}`,
      kind: "canvas",
      sourceUrl: "not_directly_available",
      extractionMode: "screenshot_inference",
      confidence: "low",
      selector: "canvas",
      screenshotRegion: "canvas_or_webgl_surface",
      preservationNote: "Canvas/WebGL was visible in runtime capture; treat screenshot as visual source of truth."
    });
  });

  Array.from(document.querySelectorAll("*"))
    .slice(0, 250)
    .forEach((el, index) => {
      const style = window.getComputedStyle(el);
      const background = style.backgroundImage;
      if (background && background !== "none" && background.includes("url(")) {
        const matches = Array.from(background.matchAll(/url\((['"]?)(.*?)\1\)/g));
        matches.forEach((match, offset) => {
          const sourceUrl = match[2] || "";
          addAsset({
            key: `bg:${sourceUrl}:${index}:${offset}`,
            labelHint: el.getAttribute("aria-label") || el.id || `background_${index + 1}`,
            kind: "background",
            sourceUrl,
            extractionMode: "css_asset",
            confidence: "medium",
            selector: el.tagName.toLowerCase(),
            nearbyText: collectText(el.textContent || ""),
            cssReference: background,
            screenshotRegion: "background_runtime_surface"
          });
        });
      }
    });

  const frameworkDetection = new Set();
  const htmlText = document.documentElement.outerHTML;
  const scriptText = scripts.join(" ").toLowerCase();
  if (
    htmlText.includes("data-framer-name") ||
    scriptText.includes("framer") ||
    scriptText.includes("motion") ||
    document.querySelector("[class*='framer'], [data-framer-name]")
  ) {
    frameworkDetection.add("framer_runtime_or_react_generated_site");
  }
  if (document.querySelector("#__next") || htmlText.includes("__NEXT_DATA__")) frameworkDetection.add("nextjs_runtime");
  if (document.querySelector("#root") || document.querySelector("#app")) frameworkDetection.add("react_runtime");
  if (scriptText.includes("webflow")) frameworkDetection.add("webflow_runtime");
  if (scriptText.includes("gsap")) frameworkDetection.add("gsap_runtime");
  if (scriptText.includes("three")) frameworkDetection.add("threejs_runtime");
  if (scriptText.includes("lottie")) frameworkDetection.add("lottie_runtime");

  const fixedOrSticky = Array.from(document.querySelectorAll("*")).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.position === "sticky" || style.position === "fixed";
  });

  const animations = [];
  Array.from(document.querySelectorAll("*"))
    .slice(0, 220)
    .forEach((el, index) => {
      const style = window.getComputedStyle(el);
      const classTokens = (el.getAttribute("class") || "").toLowerCase();
      const text = collectText(el.textContent || "");
      const labelSeed = text || el.getAttribute("aria-label") || el.id || el.tagName.toLowerCase();
      const suggestedAiLabel = inferLabel(labelSeed, classTokens);
      const hasMotionHint =
        style.animationName !== "none" ||
        style.transitionDuration !== "0s" ||
        classTokens.includes("motion") ||
        classTokens.includes("reveal") ||
        classTokens.includes("parallax") ||
        classTokens.includes("marquee") ||
        classTokens.includes("sticky");

      if (!hasMotionHint) return;

      const trigger = classTokens.includes("hover")
        ? "hover"
        : classTokens.includes("sticky")
          ? "scroll"
          : classTokens.includes("reveal") || classTokens.includes("inview")
            ? "scroll"
            : "initial_load";

      animations.push({
        id: `animation_${index + 1}`,
        type: classTokens.includes("marquee")
          ? "marquee"
          : classTokens.includes("sticky")
            ? "sticky_scroll_sequence"
            : classTokens.includes("parallax")
              ? "parallax"
              : style.animationName !== "none"
                ? "runtime_animation"
                : "transition",
        suggestedAiLabel,
        trigger,
        observedBehavior:
          trigger === "scroll"
            ? "Element appears to participate in a scroll-driven reveal or sticky transition."
            : trigger === "hover"
              ? "Element exposes a visual hover transition."
              : "Element exposes a runtime entrance or transition animation.",
        likelyFramework: frameworkDetection.has("framer_runtime_or_react_generated_site")
          ? "framer_runtime_or_react_generated_site"
          : frameworkDetection.values().next().value || "unknown",
        functionalImportance: importanceFromLabel(suggestedAiLabel),
        canRecreateWith: frameworkDetection.has("gsap_runtime")
          ? ["GSAP", "CSS"]
          : frameworkDetection.has("framer_runtime_or_react_generated_site")
            ? ["Motion", "Framer-style variants", "CSS"]
            : ["CSS", "unknown"],
        fallbackIfRemoved:
          trigger === "scroll"
            ? "Preserve section order and visible hierarchy even without timed reveal."
            : "Keep final visible state and affordance.",
        preservationNote:
          "Preserve hierarchy, CTA affordance, and timing relationship even if the generated class names are not reusable.",
        confidence: style.animationName !== "none" ? "medium" : "low"
      });
    });

  const interactions = fixedOrSticky.slice(0, 6).map((el, index) => ({
    id: `sticky_${index + 1}`,
    type: "sticky",
    label: inferLabel(collectText(el.textContent || "") || el.tagName.toLowerCase(), el.className?.toString().toLowerCase() || ""),
    observedBehavior: "Element uses fixed or sticky positioning during runtime layout.",
    selector: el.tagName.toLowerCase(),
    confidence: "medium"
  }));

  const directExtractionSummary = [
    "Rendered HTML captured after runtime stabilization.",
    "Full-page, above-the-fold, and mobile screenshots captured.",
    `${assetSet.size} visible asset candidates identified from DOM, CSS, metadata, SVG, and canvas surfaces.`,
    `${scripts.length} script references and ${styles.length} stylesheet references captured.`
  ];

  const screenshotInferenceSummary = [
    "Canvas, inline SVG, and non-exportable runtime surfaces were stored as screenshot-derived references when direct URLs were not available."
  ];

  const manualReview = [
    "Review scroll timing and reveal choreography manually for animation-heavy sections.",
    "Review click-driven drawers, modals, or pricing toggles if present before reuse.",
    "Treat screenshot-derived assets as visual references until direct source rights are confirmed."
  ];

  const designInspirationOnly = [
    "Generated runtime structure, screenshots, and semantic pattern notes are safe for inspiration.",
    "Do not reuse proprietary bundled source code or generated class names."
  ];

  const functionalityToPreserve = [
    "Preserve visible hierarchy, CTA order, and route intent.",
    "Preserve sticky or fixed elements that support navigation or story flow.",
    "Preserve mobile layout behavior separately from desktop."
  ];

  return {
    title: document.title || heroText || new URL(location.href).hostname,
    visibleTextSnippets,
    discoveredLinks: links,
    scriptReferences: scripts,
    cssReferences: styles,
    frameworkDetection: Array.from(frameworkDetection),
    assets: Array.from(assetSet.values()),
    animations: animations.slice(0, 24),
    interactions,
    contacts: {
      emails: Array.from(new Set([...mailtoLinks, ...emailMatches])).slice(0, 12),
      phones: Array.from(new Set([...telLinks, ...phoneMatches])).slice(0, 12),
      socialLinks: Array.from(new Set(socialLinks)),
      generalLinks: links.slice(0, 20)
    },
    directExtractionSummary,
    screenshotInferenceSummary,
    manualReview,
    designInspirationOnly,
    functionalityToPreserve
  };
};
