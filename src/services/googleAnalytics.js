const GA_SCRIPT_ELEMENT_ID = 'inu-google-analytics';
const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

const PRODUCT_EVENT_NAMES = Object.freeze({
  SEARCH: 'course_search',
  TIMETABLE_ADD: 'add_to_timetable',
  WISHLIST_ADD: 'add_to_wishlist',
  COMBINATION_GENERATE: 'generate_timetable',
  COURSE_DETAIL_VIEW: 'view_course_detail',
});

function currentWindow() {
  return typeof window === 'undefined' ? null : window;
}

function currentDocument() {
  return typeof document === 'undefined' ? null : document;
}

export function normalizeMeasurementId(value) {
  if (typeof value !== 'string') return null;

  const measurementId = value.trim().toUpperCase();
  return GA4_MEASUREMENT_ID_PATTERN.test(measurementId) ? measurementId : null;
}

export function initializeGoogleAnalytics({
  measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID,
  windowObject = currentWindow(),
  documentObject = currentDocument(),
  now = () => new Date(),
} = {}) {
  const normalizedId = normalizeMeasurementId(measurementId);
  if (!normalizedId || !windowObject || !documentObject?.head) return false;

  const existingScript = documentObject.getElementById(GA_SCRIPT_ELEMENT_ID);
  if (existingScript) {
    return existingScript.dataset?.measurementId === normalizedId;
  }

  windowObject.dataLayer = windowObject.dataLayer || [];
  if (typeof windowObject.gtag !== 'function') {
    windowObject.gtag = (...args) => {
      windowObject.dataLayer.push(args);
    };
  }

  const script = documentObject.createElement('script');
  script.id = GA_SCRIPT_ELEMENT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(normalizedId)}`;
  script.dataset.measurementId = normalizedId;
  documentObject.head.appendChild(script);

  windowObject.gtag('js', now());
  windowObject.gtag('config', normalizedId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
  });
  return true;
}

export function trackGoogleAnalyticsEvent(eventType, windowObject = currentWindow()) {
  const eventName = PRODUCT_EVENT_NAMES[eventType];
  if (!eventName || typeof windowObject?.gtag !== 'function') return false;

  windowObject.gtag('event', eventName);
  return true;
}
