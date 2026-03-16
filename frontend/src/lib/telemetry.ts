type DataLayerEvent = Record<string, unknown> & {
  event: string;
};

type UmamiTracker = {
  track: {
    (): void;
    (eventName: string, data?: Record<string, unknown>): void;
    (payload: Record<string, unknown>): void;
  };
  identify: (id: string, data?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    umami?: UmamiTracker;
  }

  interface ImportMetaEnv {
    readonly VITE_TELEMETRY_ENABLED?: string;
    readonly VITE_TELEMETRY_DEBUG?: string;
    readonly VITE_TELEMETRY_CAPTURE_TEXT?: string;
    readonly VITE_TELEMETRY_SKIP_PATHS?: string;
    readonly VITE_TELEMETRY_SKIP_SELECTORS?: string;
    readonly VITE_UMAMI_SCRIPT_URL?: string;
    readonly VITE_UMAMI_WEBSITE_ID?: string;
    readonly VITE_UMAMI_HOST_URL?: string;
    readonly VITE_UMAMI_DOMAINS?: string;
  }
}

type QueuedUmamiAction =
  | { type: "pageview" }
  | { type: "event"; name: string; data: Record<string, unknown> }
  | { type: "identify"; id: string };

const TELEMETRY_SESSION_KEY = "tunetribe-telemetry-session-id";
const DEFAULT_SKIP_SELECTORS = [
  "[data-telemetry-skip='true']",
  "input[type='password']",
  "input[type='email']",
  "input[type='tel']",
  "input[type='number']",
  "input[type='search']",
  "textarea",
  "select",
  "[contenteditable='true']",
];
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "summary",
  "label",
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "[role='button']",
  "[role='link']",
  "[data-telemetry-click='true']",
].join(", ");
const GENERIC_CAPTURE_TAGS = new Set([
  "a",
  "article",
  "button",
  "canvas",
  "div",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "img",
  "li",
  "p",
  "path",
  "section",
  "span",
  "svg",
]);
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const longNumberPattern = /\b\d{5,}\b/g;

let telemetryInstalled = false;
let currentUserId: string | null = null;
let currentSessionId: string | null = null;
let lastPageviewKey: string | null = null;
let umamiScriptInjected = false;
let umamiQueue: QueuedUmamiAction[] = [];

const parseBoolean = (value: string | undefined, defaultValue = false) => {
  if (value == null) return defaultValue;
  return value.toLowerCase() === "true";
};

const splitList = (value: string | undefined) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const isTelemetryEnabled = () => parseBoolean(import.meta.env.VITE_TELEMETRY_ENABLED, false);

const shouldDebug = () => parseBoolean(import.meta.env.VITE_TELEMETRY_DEBUG, false);

const shouldCaptureText = () => parseBoolean(import.meta.env.VITE_TELEMETRY_CAPTURE_TEXT, false);

const configuredSkipPaths = () => splitList(import.meta.env.VITE_TELEMETRY_SKIP_PATHS);

const configuredSkipSelectors = () => [
  ...DEFAULT_SKIP_SELECTORS,
  ...splitList(import.meta.env.VITE_TELEMETRY_SKIP_SELECTORS),
];

const isUmamiConfigured = () =>
  Boolean(import.meta.env.VITE_UMAMI_SCRIPT_URL && import.meta.env.VITE_UMAMI_WEBSITE_ID);

const debugLog = (message: string, details?: unknown) => {
  if (!shouldDebug()) return;
  console.info(`[telemetry] ${message}`, details ?? "");
};

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Math.random().toString(36).slice(2, 12)}`;
};

const getSessionId = () => {
  if (currentSessionId) return currentSessionId;

  try {
    const stored = window.sessionStorage.getItem(TELEMETRY_SESSION_KEY);
    if (stored) {
      currentSessionId = stored;
      return stored;
    }

    const next = generateSessionId();
    window.sessionStorage.setItem(TELEMETRY_SESSION_KEY, next);
    currentSessionId = next;
    return next;
  } catch {
    currentSessionId = generateSessionId();
    return currentSessionId;
  }
};

const sanitizeText = (value: string) =>
  value.replace(emailPattern, "[redacted-email]").replace(longNumberPattern, "[redacted-number]");

const toSafeText = (value: string | null | undefined) => {
  if (!value) return undefined;
  const trimmed = sanitizeText(value.replace(/\s+/g, " ").trim());
  if (!trimmed) return undefined;
  return trimmed.slice(0, 80);
};

const sanitizeHref = (href: string | null) => {
  if (!href) return undefined;

  try {
    const url = new URL(href, window.location.origin);
    const isSameOrigin = url.origin === window.location.origin;
    return isSameOrigin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
};

const currentPagePath = () => window.location.pathname;

const matchesPathPattern = (pathname: string, pattern: string) => {
  if (!pattern) return false;
  if (pattern.endsWith("*")) {
    return pathname.startsWith(pattern.slice(0, -1));
  }
  return pathname === pattern;
};

const isSkippedPath = (pathname = currentPagePath()) =>
  configuredSkipPaths().some((pattern) => matchesPathPattern(pathname, pattern));

const selectorList = () => configuredSkipSelectors().join(", ");

const hasSkippedAncestor = (element: Element) => {
  const selector = selectorList();
  return Boolean(selector && element.closest(selector));
};

const isInputLikeElement = (element: Element) => {
  const tagName = element.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
};

const isContainerTag = (tagName: string) =>
  tagName === "html" ||
  tagName === "body" ||
  tagName === "main" ||
  tagName === "header" ||
  tagName === "footer" ||
  tagName === "nav";

const nthOfType = (element: Element) => {
  const parent = element.parentElement;
  if (!parent) return 1;

  const siblings = Array.from(parent.children).filter((entry) => entry.tagName === element.tagName);
  return siblings.indexOf(element) + 1;
};

const selectorSegment = (element: Element) => {
  const tag = element.tagName.toLowerCase();
  const telemetryName = element.getAttribute("data-telemetry-name");
  const elementId = element.getAttribute("id");

  if (telemetryName) {
    return `${tag}[data-telemetry-name="${telemetryName}"]`;
  }

  if (elementId && /^[A-Za-z0-9_-]+$/.test(elementId)) {
    return `${tag}#${elementId}`;
  }

  return `${tag}:nth-of-type(${nthOfType(element)})`;
};

const buildSelector = (element: Element) => {
  const segments: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (current && depth < 4) {
    segments.unshift(selectorSegment(current));
    current = current.parentElement;
    depth += 1;
    if (!current || current.tagName.toLowerCase() === "body") {
      break;
    }
  }

  return segments.join(" > ");
};

const resolveElementName = (element: Element) => {
  const telemetryName = toSafeText(element.getAttribute("data-telemetry-name"));
  if (telemetryName) return telemetryName;

  const ariaLabel = toSafeText(element.getAttribute("aria-label"));
  if (ariaLabel) return ariaLabel;

  const title = toSafeText(element.getAttribute("title"));
  if (title) return title;

  const alt = toSafeText(element.getAttribute("alt"));
  if (alt) return alt;

  const id = toSafeText(element.getAttribute("id"));
  if (id) return id;

  if (!shouldCaptureText()) {
    return undefined;
  }

  if (isInputLikeElement(element)) {
    return undefined;
  }

  return toSafeText((element.textContent ?? "").slice(0, 120));
};

const findCaptureElement = (target: Element) => {
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (interactive) {
    return interactive;
  }

  let current: Element | null = target;
  while (current) {
    const tag = current.tagName.toLowerCase();
    const hasMeaningfulIdentity =
      current.hasAttribute("data-telemetry-name") ||
      current.hasAttribute("id") ||
      current.hasAttribute("role");

    if (hasMeaningfulIdentity || GENERIC_CAPTURE_TAGS.has(tag)) {
      if (!isContainerTag(tag)) {
        return current;
      }
    }

    current = current.parentElement;
  }

  return null;
};

const pushToDataLayer = (payload: DataLayerEvent) => {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
};

const queueUmamiAction = (action: QueuedUmamiAction) => {
  if (!window.umami && !isUmamiConfigured()) {
    return;
  }

  if (window.umami) {
    if (action.type === "pageview") {
      window.umami.track();
      return;
    }

    if (action.type === "event") {
      window.umami.track(action.name, action.data);
      return;
    }

    window.umami.identify(action.id);
    return;
  }

  umamiQueue.push(action);
};

const flushUmamiQueue = () => {
  if (!window.umami || umamiQueue.length === 0) return;

  const queued = [...umamiQueue];
  umamiQueue = [];

  queued.forEach((action) => queueUmamiAction(action));
};

const injectUmamiScript = () => {
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

  if (!scriptUrl || !websiteId || umamiScriptInjected) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = scriptUrl;
  script.setAttribute("data-website-id", websiteId);
  script.setAttribute("data-auto-track", "false");

  const hostUrl = import.meta.env.VITE_UMAMI_HOST_URL;
  if (hostUrl) {
    script.setAttribute("data-host-url", hostUrl);
  }

  const domains = import.meta.env.VITE_UMAMI_DOMAINS;
  if (domains) {
    script.setAttribute("data-domains", domains);
  }

  script.addEventListener("load", () => {
    debugLog("Umami script loaded");
    flushUmamiQueue();
    if (currentUserId) {
      queueUmamiAction({ type: "identify", id: currentUserId });
    }
  });

  script.addEventListener("error", () => {
    debugLog("Umami script failed to load", scriptUrl);
  });

  document.head.appendChild(script);
  umamiScriptInjected = true;
};

const commonPayload = () => ({
  telemetry_app: "tunetribe-frontend",
  telemetry_session_id: getSessionId(),
  telemetry_user_id: currentUserId ?? undefined,
  page_path: currentPagePath(),
  page_title: document.title,
});

const emit = (payload: DataLayerEvent) => {
  pushToDataLayer(payload);
  window.dispatchEvent(new CustomEvent("tunetribe:telemetry", { detail: payload }));
  debugLog("Event captured", payload);
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!isTelemetryEnabled() || isSkippedPath()) return;
  if (!(event.target instanceof Element)) return;
  if (hasSkippedAncestor(event.target)) return;

  const captureElement = findCaptureElement(event.target);
  if (!captureElement || hasSkippedAncestor(captureElement)) return;

  const tagName = captureElement.tagName.toLowerCase();
  if (isInputLikeElement(captureElement) && !captureElement.hasAttribute("data-telemetry-click")) {
    return;
  }

  const anchor = captureElement.closest("a[href]");

  const payload: DataLayerEvent = {
    event: "tunetribe_click",
    ...commonPayload(),
    click_button: event.button,
    click_ctrl_key: event.ctrlKey,
    click_meta_key: event.metaKey,
    click_shift_key: event.shiftKey,
    click_alt_key: event.altKey,
    click_href_path: sanitizeHref(anchor?.getAttribute("href") ?? null),
    click_interactive: Boolean(captureElement.closest(INTERACTIVE_SELECTOR)),
    click_name: resolveElementName(captureElement),
    click_role: captureElement.getAttribute("role") ?? undefined,
    click_selector: buildSelector(captureElement),
    click_tag: tagName,
    click_x: Math.round(event.clientX),
    click_y: Math.round(event.clientY),
  };

  emit(payload);
  queueUmamiAction({
    type: "event",
    name: "tunetribe_click",
    data: {
      page_path: payload.page_path,
      click_name: payload.click_name ?? "",
      click_selector: payload.click_selector,
      click_tag: payload.click_tag,
    },
  });
};

export const installTelemetry = () => {
  if (telemetryInstalled || !isTelemetryEnabled() || typeof window === "undefined") {
    return;
  }

  if (isSkippedPath()) {
    debugLog("Telemetry skipped for current path", currentPagePath());
  }

  injectUmamiScript();
  document.addEventListener("click", handleDocumentClick, true);
  telemetryInstalled = true;
  debugLog("Telemetry installed");
};

export const trackPageview = () => {
  if (!isTelemetryEnabled() || typeof window === "undefined") return;
  if (isSkippedPath()) return;

  const pageKey = `${window.location.pathname}|${window.location.search}|${window.location.hash}`;
  if (pageKey === lastPageviewKey) return;
  lastPageviewKey = pageKey;

  const payload: DataLayerEvent = {
    event: "tunetribe_pageview",
    ...commonPayload(),
  };

  emit(payload);
  queueUmamiAction({ type: "pageview" });
};

export const setTelemetryUserId = (userId: string | null) => {
  currentUserId = userId;

  if (!isTelemetryEnabled() || !userId) {
    return;
  }

  queueUmamiAction({ type: "identify", id: userId });
};

export const clearTelemetryUserId = () => {
  currentUserId = null;
};

export const __private__ = {
  buildSelector,
  findCaptureElement,
  matchesPathPattern,
  resolveElementName,
  sanitizeHref,
  sanitizeText,
  toSafeText,
};
