// Ask Android for the display's highest refresh rate (90/120/144 Hz) at the current resolution.
const { withMainActivity } = require('expo/config-plugins');

const MARK = '// goal:high-refresh';
const CODE = `
    ${MARK}
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
      try {
        @Suppress("DEPRECATION")
        val display = windowManager.defaultDisplay
        val cur = display.mode
        val best = display.supportedModes
          .filter { it.physicalWidth == cur.physicalWidth && it.physicalHeight == cur.physicalHeight }
          .maxByOrNull { it.refreshRate }
        if (best != null) {
          val lp = window.attributes
          lp.preferredDisplayModeId = best.modeId
          window.attributes = lp
        }
      } catch (e: Exception) { }
    }`;

module.exports = function withHighRefreshRate(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (cfg.modResults.language !== 'kt' || src.includes(MARK)) return cfg;
    const re = /super\.onCreate\([^)]*\)/;
    if (!re.test(src)) throw new Error('withHighRefreshRate: super.onCreate not found in MainActivity');
    src = src.replace(re, (m) => m + CODE);
    cfg.modResults.contents = src;
    return cfg;
  });
};
