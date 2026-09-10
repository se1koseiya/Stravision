import type { ThemeConfig } from "antd";
import { L } from "@/components/landing-v4/shared";

/* ------------------------------------------------------------
   莓界落地页 · antd 主题
   已对齐 Loomy：墨色 #222 正文、薄荷绿细线主题色、大圆角
   ------------------------------------------------------------ */

export const landingTheme: ThemeConfig = {
  token: {
    colorPrimary: L.navHover,
    colorInfo: L.navHover,
    colorLink: L.navHover,
    colorTextBase: L.ink,
    colorSuccess: L.navHover,
    borderRadius: 12,
    fontSize: 15,
    fontFamily:
      "var(--font-sans, inherit), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Button: {
      controlHeightLG: 44,
      borderRadiusLG: 999,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 24,
    },
    Collapse: {
      borderRadiusLG: 16,
    },
    Tag: {
      borderRadiusSM: 999,
    },
  },
};
