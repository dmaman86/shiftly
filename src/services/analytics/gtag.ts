const GA_ID = "G-G19J1209M6";

export const gtagService = {
  initConsentMode() {
    if (location.hostname === "localhost") return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments as never);
    };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ads_storage: "denied",
    });
  },

  load() {
    if (location.hostname === "localhost") return;
    if (document.querySelector(`script[src*="${GA_ID}"]`)) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.gtag?.("js", new Date());
    window.gtag?.("config", GA_ID);
  },

  grantConsent() {
    window.gtag?.("consent", "update", {
      analytics_storage: "granted",
    });
  },
};
