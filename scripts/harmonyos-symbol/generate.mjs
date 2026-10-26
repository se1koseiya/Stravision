#!/usr/bin/env node
/**
 * 生成 components/harmonyos-symbol-data.ts
 * ────────────────────────────────────────────────────────────────
 * 数据来源：HarmonyOS Symbol（华为 HarmonyOS 主题图标库）
 *   https://developer.huawei.com/consumer/cn/design/harmonyos-symbol/
 *   字体文件 HMSymbolVF.ttf（可变字体，wght 40–900，默认 400）
 *   字形清单来源：github.com/runoob-coder/hm_symbol_flutter（MIT）
 *
 * 再生成步骤：
 *   1) 下载 HMSymbolVF.ttf
 *   2) python（需 fonttools）实例化 wght=400 并导出字形 d：
 *        from fontTools.varLib import instancer
 *        from fontTools.pens.svgPathPen import SVGPathPen
 *        f = TTFont("HMSymbolVF.ttf"); instancer.instantiateVariableFont(f, {"wght": 400}, inplace=True)
 *        pen = SVGPathPen(f.getGlyphSet(), ntos=lambda v: str(round(v)))
 *        f.getGlyphSet()[glyphName].draw(pen); d = pen.getCommands()
 *      （坐标为字体单位，upem = 1000；数字已取整，无损降到 0.001em）
 *   3) 把结果写成 { "<glyphName>": "<d>" } 的 JSON，放到 --glyphs 指定的路径
 *   4) node scripts/harmonyos-symbol/generate.mjs --glyphs <dump.json>
 *
 * 坐标系：HarmonyOS Symbol 设计盒 = x[0,1000] × y[-120,880]（1:1 正方，中心 (500,380)）。
 *   映射到 24×24 viewBox：
 *     x' = 0.024x        y' = (880 - y) × 0.024 = 21.12 - 0.024y
 *   即挂一条 group transform：translate(0 21.12) scale(0.024 -0.024)
 *   这样字形路径可保留字体原始整数坐标，无损且体积最小。
 *
 * 样式：HarmonyOS Symbol 是**填充轮廓**（非描边），因此渲染用 fill + fill-rule:nonzero，
 *   与字体自身渲染一致（外轮廓 + 反向内轮廓 = 镂空）。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.join(ROOT, "components", "harmonyos-symbol-data.ts");

const argGlyphs = (() => {
  const i = process.argv.indexOf("--glyphs");
  return i > -1 ? process.argv[i + 1] : "/c/Users/24121/AppData/Local/Temp/hm-sym/weight-400.json";
})();

/**
 * 项目图标名 → HarmonyOS Symbol 字形名。
 * null = HarmonyOS Symbol 中没有对应图标 → 回退 lucide-react。
 */
export const PROJECT_TO_SYMBOL = {
  // ── 导航 / 布局 ──
  IconHome: "house",
  IconLayoutTwo: "open_sidebar",
  // 「面板 / 侧栏」开关（AI 助手顶栏）：圆角矩形外框 + 内嵌填充块，
  // 取自 HarmonyOS「面板」语义字形（实测与华为系统 UI 的侧栏开关一致）
  IconSidebarPanel: "rectangle_inset_filled",
  IconHamburgerButton: "line_3_horizontal",
  IconLeft: "chevron_left",
  IconRight: "chevron_right",
  IconUp: "chevron_up",
  IconDown: "chevron_down",
  IconArrowLeft: "arrow_left",
  IconArrowRight: "arrow_right",
  IconArrowUp: "arrow_up",
  IconArrowUpSolid: "arrow_up",
  IconArrowDown: "arrow_down",
  IconArrowRightUp: "arrow_up_right",
  IconArrowCircleUp: "arrow_up_circle",
  IconSort: "sort",
  IconExchange: "arrow_left_arrow_right",
  IconDrag: "dot_grid_1x2",
  IconFullScreen: "arrow_up_left_and_arrow_down_right",
  IconFullScreenOne: "arrow_up_left_and_arrow_down_right",
  IconOffScreen: "arrow_down_right_and_arrow_up_left",
  IconOffScreenOne: "arrow_down_right_and_arrow_up_left",
  IconMonitor: "display",
  IconIpad: "pad",
  IconPhone: "phone",
  IconLaptop: "pc",

  // ── 操作 ──
  IconPlus: "plus",
  IconMinus: "minus",
  IconClose: "xmark",
  IconCloseOne: "xmark",
  IconCheck: "checkmark",
  IconCheckOne: "checkmark",
  IconCheckCorrect: "checkmark_circle",
  IconCopy: "doc_text_on_doc_text",
  IconEdit: "pencil_line",
  IconDelete: "trash",
  IconRotate: "arrow_clockwise",
  IconTool: "wrench_and_screwdriver",
  IconSave: "save",
  IconDownload: "download",
  IconUpload: "upload",
  IconShare: "share",
  IconSend: "paperplane",
  IconSearch: "magnifyingglass",
  IconFilter: "funnel",
  IconRefresh: "arrow_2_circlepath",
  IconUndo: "undo",
  IconRedo: "redo",
  IconPin: "pin",
  IconLink: "link",
  IconLinkOut: "arrow_right_up_and_square",
  IconLinkIn: "arrow_right_and_square",
  IconUnlink: "link_slash",
  IconPreviewOpen: "eye",
  IconPreviewClose: "eye_slash",
  IconLock: "lock",
  IconUnlock: "lock_open",
  IconKey: "key_horizontal",
  IconPower: "power",
  IconPencil: "pencil_line",
  IconScan: "viewfinder_square",
  IconScanCode: "qrcode",
  IconZoomIn: "plus_magnifyingglass",
  IconZoomOut: "minus_magnifyingglass",
  IconExport: "arrow_up_to_line",
  IconClickTap: "hand_tap",
  IconPlusCross: "plus",
  IconSquareSmall: "square",

  // ── 状态提示 ──
  IconAttention: "exclamationmark_triangle",
  IconCaution: "exclamationmark_triangle",
  IconInfo: "info_circle",
  IconHelp: "questionmark_circle",
  IconLoading: "arrow_counterclockwise",
  IconCloseRemind: "bell_slash",
  IconRemind: "bell",
  IconRemindDisable: "bell_slash",
  IconShield: "checkmark_shield",
  IconShieldCheck: "checkmark_shield",
  IconCertificate: "medal",
  IconTrophy: "star_trophy",
  IconStar: "star",

  // ── 内容 / 文件 ──
  IconFileText: "doc_text",
  IconFileCode: "doc_plaintext",
  IconFileAddition: "notepad_badge_plus",
  IconFileEditing: "doc_plaintext_and_pencil",
  IconFileSearch: "doc_text_badge_magnifyingglass",
  IconFilePdf: "pdf_doc",
  IconFilePpt: "doc_text",
  IconFileWord: "doc_text",
  IconFileZip: "doc_zipper",
  IconFolder: "folder",
  IconFolderOpen: "arrow_right_folder_circle",
  IconFolderPlus: "folder_badge_plus",
  IconFolderMinus: "folder_badge_ellipsis",
  IconFolderSettings: "folder_circle",
  IconFolderUpload: "folder_badge_arrow_left",
  IconBook: "book_closed_right_left",
  IconBookOne: "bookmark_book_closed",
  IconBookOpen: "book_pages",
  IconBookmark: "bookmark",
  IconBookshelf: "bookshelf",
  IconNotebook: "notepad",
  IconList: "list_bullet",
  IconListTwo: "list_bullet_square",
  IconListCheckbox: "list_checkmask",
  IconColumn: "rectangle_split_2x1",
  IconGridFour: "square_grid_2x2",
  IconBox: "archivebox",
  IconPaperclip: "paperclip",

  // ── 通讯 / 人员 ──
  IconUser: "person",
  IconPeoples: "person_2",
  IconAddUser: "person_badge_plus",
  IconPeopleDelete: "person_xmark",
  IconComment: "message",
  IconComments: "message_on_message",
  IconCommentAdd: "message_badge_plus",
  IconCommentDashed: "ellipsis_message",
  IconMail: "envelope",
  IconPhoneOff: "phone_badge_nosign",
  IconMicrophone: "mic",
  IconVoiceOff: "mic_slash",
  IconAnnouncement: "speaker_wave_3",
  IconInbox: "inbox",
  IconCustomer: "person_square",

  // ── 数据 / 图表 ──
  IconChartHistogram: "histogram",
  IconChartLine: "waveform",
  IconChartPie: "data_proportion",
  IconTrendingUp: "arrow_up_right",
  IconTrendingDown: "arrow_down",
  IconDashboard: "rectangle_grid_2x1",
  IconDatabaseNetwork: "storagebox",
  IconServer: "computer",
  IconCloudStorage: "icloud",
  IconHardDisk: "externaldrive",
  IconCpu: "memory_module",

  // ── 时间 ──
  IconTime: "clock",
  IconTimer: "timer",
  IconCalendar: "calendar",
  IconHistory: "clock_arrow_2_circlepath",
  IconAlarmClock: "alarm",
  IconSchedule: "calendar_badge_clock",

  // ── 设备 / 地理 ──
  IconCamera: "camera",
  IconVideo: "video",
  IconVideoOne: "video",
  IconVideocamera: "video",
  IconPicture: "picture",
  IconMusic: "music",
  IconWifi: "wifi",
  IconCloseWifi: "wifi_slash",
  IconSignal: "signal",
  IconApi: "square_link_square",
  IconRouter: "wifi_router",
  IconNavigation: "location_north_up_right",
  IconLocalPin: "pin",
  IconMapDraw: "map",
  IconEarth: "star_planet",
  IconGlobe: "worldclock",
  IconCompass: "compass",
  IconTarget: "dart_target",
  IconAiming: "scope",
  IconLightning: "bolt",
  IconThunderbolt: "bolt",
  IconFire: "flame",
  IconWater: "drop",
  IconWind: "wind",
  IconThermometer: "thermometer",
  IconSun: "sun_max",
  IconMoon: "moon",
  IconLeaf: "leaf",
  IconTree: "tropicaltrees_and_sand",
  IconSeedling: "flower",
  IconExperiment: "laboratories",
  IconMedicineChest: "cross_case",

  // ── 天气 ──
  IconCloudy: "cloud",
  IconCloudyNight: "star_2_moon",
  IconFog: "foggy",
  IconLightRain: "light_rain",
  IconHeavyRain: "heavy_rain",
  IconSnow: "cloud_snow",
  IconSunny: "sun_max",
  IconThunderstorm: "thunderstorm",

  // ── 外观 / 主题 ──
  IconSetting: "gearshape",
  IconSettingOne: "gearshape",
  IconSettingTwo: "gearshape_small",
  IconSwitch: "arrow_left_arrow_right",
  IconBackgroundColor: "paintpalette",
  IconLight: "lightbulb",
  IconMagic: "AI_wand_stars_and_cloud",
  IconMagicWand: "wand_and_stars",
  IconEmotionHappy: "face_smiling",
  IconCrown: "crown",
  IconHexagonOne: "star_hexagon",
  IconRound: "circle",
  IconRoundCaliper: "dot_circle",
  IconSquare: "square",
  IconDot: "dot",
  IconCd: "opticaldisc",
  IconRocket: "airplane",
  IconBrain: "AI_memory",
  IconRobot: "robot",
  IconCode: "code_square",
  IconTerminal: "code_square",
  IconBug: "exclamationmark_triangle",
  IconGithub: "code_square",
  IconGithubOne: "code_square",
  IconTwitter: "bird_ball",
  IconLogout: "door_service",
  IconCompression: "arrow_down_right_and_arrow_up_left",
  IconHandUp: "hand_raised_fingers_spread",
  IconQuote: "character_textbox",

  // ── 商业 / 其它 ──
  IconBill: "list_square_bill",
  IconWallet: "wallet",
  IconDollar: "yuansign_circle",
  IconCurrency: "yuansign_circle",
  IconTag: "label",
  IconTicket: "train_ticket",
  IconBriefcase: "briefcase",
  IconBuildingFour: "building",
  IconShop: "store",
  IconDegreeHat: "graduationcap",
  IconTranslate: "translate",
  IconFingerprint: "touchid",
  IconApplicationOne: "circle_grid_2x2",
  IconConnect: "charg_cable",
  IconFan: "fan_blade_4_pcs",
  IconHashtagKey: "hash",
  IconHeadphoneSound: "headphones",
  IconHeart: "heart",
  IconHtmlFive: "doc_plaintext",
  IconLayers: "layer",
  IconMerge: "arrow_triangle_merge",
  IconMore: "chevron_down",
  IconNetworkTree: "share",
  IconPause: "pause",
  IconPlay: "play",
  IconPlayOne: "play",
  IconRadio: "radio",
  IconScissors: "cut",
  IconSunrise: "sunrise_fill",
  IconSunset: "sunset",
  IconVolumeMute: "speaker_slash",
  IconVolumeNotice: "speaker_wave_2",
  IconWaves: "water_waves",
  IconZip: "doc_zipper",

  // ── 兼容别名 ──
  IconEdit3: "pencil_line",
  IconWand: "wand_and_stars",
  IconPocket: "bag",
  IconVolumeOff: "speaker_slash",
  IconCloudUpload: "cloud_and_arrow_up",
};

// ────────────────────────────────────────────────────────────────
// 生成
// ────────────────────────────────────────────────────────────────
const glyphs = JSON.parse(fs.readFileSync(argGlyphs, "utf8"));

const pairs = Object.entries(PROJECT_TO_SYMBOL).filter(
  ([k, v]) => v && !k.endsWith("_")
);

const usedGlyphs = [...new Set(pairs.map(([, v]) => v))].sort();
const missing = usedGlyphs.filter((g) => !glyphs[g]);
if (missing.length) {
  console.error("❌ 以下字形在 dump 中不存在：\n  " + missing.join("\n  "));
  process.exit(1);
}

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const glyphLines = usedGlyphs
  .map((g) => `  "${esc(g)}":\n    "${esc(glyphs[g])}",`)
  .join("\n");

const mapLines = pairs
  .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  .map(([k, v]) => `  ${k}: "${esc(v)}",`)
  .join("\n");

const file = `/**
 * HarmonyOS Symbol 图标数据 — 🚨 自动生成，请勿手改
 *
 * 生成脚本：scripts/harmonyos-symbol/generate.mjs
 * 图标来源：HarmonyOS Symbol（华为 HarmonyOS 主题图标库）
 *   https://developer.huawei.com/consumer/cn/design/harmonyos-symbol/
 *   字体 HMSymbolVF.ttf（可变字体，wght 40–900），本文件为 **wght=400（Regular）**
 *   实例；字形名清单参考 github.com/runoob-coder/hm_symbol_flutter（MIT）。
 *
 * 许可：HarmonyOS Symbol 为华为官方图标资源，开发者可免费使用（含商用）。
 *
 * ── 坐标系 ──
 * 设计盒 x[0,1000] × y[-120,880]（1:1，中心 (500,380)），映射到 24×24 viewBox：
 *   x' = 0.024·x      y' = 21.12 - 0.024·y
 * 即 {@link HARMONY_SYMBOL_TRANSFORM}。路径保留字体原始整数坐标，无损。
 *
 * ── 渲染方式 ──
 * HarmonyOS Symbol 是**填充轮廓**（不是描边）：用 fill + fill-rule="nonzero"，
 * 与字体自身渲染一致（外轮廓 + 反向内轮廓 = 镂空）。因此图标组件不再支持
 * strokeWidth（见 components/icon.tsx 注释）。
 *
 * 共 ${usedGlyphs.length} 个字形，映射 ${pairs.length} 个项目图标。
 */

/** group transform：字体单位 → 24×24 viewBox（y 轴翻转） */
export const HARMONY_SYMBOL_TRANSFORM = "translate(0 21.12) scale(0.024 -0.024)";

/** HarmonyOS Symbol 设计盒（字体单位） */
export const HARMONY_SYMBOL_DESIGN_BOX = { width: 1000, height: 1000, upem: 1000 } as const;

/** 字形名 → SVG path d（字体单位坐标，需配合 {@link HARMONY_SYMBOL_TRANSFORM}） */
export const HARMONY_SYMBOL_PATHS: Record<string, string> = {
${glyphLines}
};

/** 项目图标名 → HarmonyOS Symbol 字形名 */
export const HARMONY_SYMBOL_ICON_MAP: Record<string, string> = {
${mapLines}
};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, file, "utf8");
console.log(`✅ 写入 ${path.relative(ROOT, OUT)}`);
console.log(`   字形 ${usedGlyphs.length} 个 / 映射 ${pairs.length} 条 / ${(file.length / 1024).toFixed(1)} KB`);
