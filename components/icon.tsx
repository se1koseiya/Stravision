"use client";

/**
 * 统一图标入口（全站图标基础设施）— 🦌 lucide-react 版
 *
 * 迁移记录（2026-09-19）：从 @icon-park/react 全量迁移到 lucide-react。
 * 原因：IconPark 描边在 14–20px 渲染下偏细、转角 miter 偏尖，用户明确要求
 * 换成 lucide 的圆润中等笔画（strokeLinecap/linejoin 均为 round）。
 *
 * 设计要点：
 * - 单一数据源：所有图标来自 `lucide-react`（ISC License）
 * - **API 完全向后兼容**：保留了原先 239 个具名导出的名字与 props，
 *   因此 ~230 个调用方文件（`import { IconX } from "@/components/icon"`）零改动。
 * - `size` 同时支持 number / string（lucide 要求 number，内部做兜底转换）
 * - 统一包一层 `<span style={{display:'inline-flex', lineHeight:0}}>`，
 *   避免 inline SVG 撑高行盒（与迁移前行为一致）
 * - `theme` / `spin` 为 IconPark 时代的历史 props，保留签名不再使用：
 *   `spin` 映射为 CSS 旋转动画；`theme` 忽略。
 *
 * 用法：
 * ```tsx
 * import { IconHome, IconSearch } from "@/components/icon";
 * <IconHome />
 * <IconSearch size={20} />
 * ```
 *
 * @see https://lucide.dev/icons/
 */

import * as Lucide from "lucide-react";
import * as React from "react";

export type IconTheme = "outline" | "filled" | "two-tone" | "multi-color";

/**
 * 全局描边宽度（lucide 24×24 grid 下的取值）。
 *
 * lucide 官方默认值是 2，在 24px 显示时视觉正常；本项目图标普遍以
 * 14–20px 渲染，此时 2/24 换算到屏幕约 1.4–1.7px，属于"中等偏细"。
 *
 * 取值 2 即 lucide 官方默认（也是 shadcn new-york 风格的基准），
 * 配合 lucide 天然的 round 端点/转角，观感圆润清晰。
 * 若某处需要更细/更粗，单独传 strokeWidth 覆盖。
 */
export const DEFAULT_STROKE_WIDTH = 2;

/** lucide 图标的尺寸基准 viewBox 为 24×24 */
const LUCIDE_BASE_SIZE = 24;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "size" | "color" | "ref"> {
  /** 尺寸（px），默认 16。字符串会按 px 解析，解析失败回退 16 */
  size?: number | string;
  /** 颜色，默认 currentColor（继承父级文字颜色） */
  color?: string | string[];
  /** @deprecated IconPark 时代的主题参数，迁移到 lucide 后无效，保留仅为兼容旧调用 */
  theme?: IconTheme;
  /** 描边宽度，默认 {@link DEFAULT_STROKE_WIDTH} */
  strokeWidth?: number;
  /** 是否旋转动画 */
  spin?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** 把 size（可能是 "16px" / "1.2em" / 16）归一化成 lucide 需要的数字 */
function normalizeSize(size: number | string | undefined): number {
  if (typeof size === "number") return Number.isFinite(size) ? size : 16;
  if (typeof size === "string") {
    const parsed = parseFloat(size);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 16;
}

type LucideComponent = React.ComponentType<Record<string, unknown>>;

/**
 * 把 lucide 原始组件包成统一 API 的图标组件。
 *
 * 关键转换（IconPark → lucide 语义差异）：
 * - IconPark 用 `fill` 上色且图标是「填充式」；lucide 是纯描边图标，颜色走
 *   `stroke`，同时把 `fill` 设为 `none`，否则会渲染出实心黑块。
 * - `spin` → CSS `animation: spin 1s linear infinite`。
 */
export function createIcon(Base: LucideComponent, displayName: string) {
  const Wrapped = React.forwardRef<HTMLSpanElement, IconProps>(function Icon(
    {
      size = 16,
      color = "currentColor",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      theme: _theme,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      spin,
      className,
      style,
      ...rest
    },
    ref
  ) {
    const px = normalizeSize(size);
    const stroke = Array.isArray(color) ? color[0] : color;

    return (
      <span
        ref={ref}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          ...(spin
            ? { animation: "stravision-icon-spin 1s linear infinite" }
            : null),
          ...style,
        }}
      >
        <Base
          size={px}
          color={stroke}
          stroke={stroke}
          fill="none"
          strokeWidth={strokeWidth}
          absoluteStrokeWidth={false}
          // lucide 的圆润端点/转角：与 IconPark 的圆角风格意图一致
          strokeLinecap="round"
          strokeLinejoin="round"
          width={px}
          height={px}
          {...rest}
        />
      </span>
    );
  });
  Wrapped.displayName = displayName;
  return Wrapped;
}

/**
 * 由 lucide 原生 `__iconNode` 数据（`["path"|"circle"|…, attrs]` 元组数组）直接构造图标组件，
 * 再走 {@link createIcon} 包装。用于「lucide 有个近似图标、但需要微调某几笔」的场景 ——
 * 不必新建 .tsx 组件文件，也不必从外部引入 path 字符串。
 *
 * `defaultProps` 会与原节点属性合并（同 key 以节点自身为准），可用来覆盖某个 `<path>` 的 d。
 */
function createIconFromLucideNode(
  node: [string, Record<string, string | number>][],
  displayName: string,
  defaultProps: Record<string, string | number> = {}
) {
  const Base: LucideComponent = (props: Record<string, unknown>) =>
    React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${LUCIDE_BASE_SIZE} ${LUCIDE_BASE_SIZE}`,
        ...props,
      },
      node.map(([tag, attrs], i) =>
        React.createElement(tag, { key: i, ...defaultProps, ...attrs })
      )
    );
  return createIcon(Base, displayName);
}

/**
 * 「圆角方气泡 + 右下尾巴 + 右上角**外侧**加号」的图标数据。
 *
 * 取 lucide `message-square-plus` 的官方气泡 path 原样保留，仅把其内部的
 * 加号（`M12 8v6` / `M9 11h6`）换成右上角外挂加号（`M19 2v6` / `M16 5h6`）。
 * 气泡 path 与 `message-square` / `message-square-dashed` 同源，并排不掉线宽。
 */
const MESSAGE_SQUARE_PLUS_OUTSIDE_NODE: [string, Record<string, string | number>][] = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
    },
  ],
  ["path", { d: "M19 2v6" }],
  ["path", { d: "M16 5h6" }],
];

/**
 * IconPark 名字 → lucide 名字 的映射表。
 *
 * 仅需列出「名字不完全相同」的条目；同名项由生成脚本自动直通。
 * 共 239 个图标，其中 111 个同名直通、128 个经此表映射。
 */
const LUCIDE_NAME_MAP: Record<string, string> = {
  // ---- 导航 / 布局 ----
  LayoutTwo: "PanelLeft",
  HamburgerButton: "Menu",
  Left: "ChevronLeft",
  Right: "ChevronRight",
  Up: "ChevronUp",
  Down: "ChevronDown",
  ArrowRightUp: "ArrowUpRight",
  ArrowCircleUp: "CircleArrowUp",
  Sort: "ArrowUpDown",
  Exchange: "ArrowLeftRight",
  Drag: "GripVertical",
  FullScreen: "Maximize",
  FullScreenOne: "Maximize2",
  OffScreen: "Minimize",
  OffScreenOne: "Minimize2",
  Ipad: "Tablet",

  // ---- 操作 ----
  Close: "X",
  CloseOne: "X",
  CheckOne: "Check",
  CheckCorrect: "CircleCheck",
  Edit: "Pencil",
  Save: "Save",
  Export: "FileOutput",
  LinkIn: "LogIn",
  LinkOut: "ExternalLink",
  PreviewOpen: "Eye",
  PreviewClose: "EyeOff",
  Key: "KeyRound",
  ScanCode: "ScanLine",
  ClickTap: "MousePointerClick",
  PlusCross: "Plus",

  // ---- 状态提示 ----
  Attention: "TriangleAlert",
  Caution: "TriangleAlert",
  Help: "CircleHelp",
  Loading: "LoaderCircle",
  CloseRemind: "BellOff",
  Remind: "Bell",
  RemindDisable: "BellOff",
  Certificate: "Award",
  Shield: "ShieldCheck",

  // ---- 内容 / 文件 ----
  FileAddition: "FilePlus",
  FileEditing: "FilePen",
  FilePdf: "FileType",
  FilePpt: "Presentation",
  FileWord: "FileType",
  FileZip: "FileArchive",
  FolderSettings: "FolderCog",
  FolderUpload: "FolderUp",
  BookOne: "BookMarked",
  Bookshelf: "Library",
  Edit3: "Pencil",

  // ---- 通讯 / 人员 ----
  AddUser: "UserPlus",
  Peoples: "Users",
  PeopleDelete: "UserMinus",
  Customer: "UserRound",
  Announcement: "Megaphone",
  Comment: "MessageSquare",
  Comments: "MessagesSquare",
  CommentAdd: "MessageSquarePlus",
  Inbox: "Inbox",
  Mail: "Mail",
  PhoneOff: "PhoneOff",
  Microphone: "Mic",
  VoiceOff: "MicOff",

  // ---- 数据 / 图表 ----
  ChartHistogram: "ChartColumn",
  ChartLine: "ChartLine",
  Dashboard: "LayoutDashboard",
  DatabaseNetwork: "Database",
  CloudStorage: "CloudUpload",
  HardDisk: "HardDrive",
  Cpu: "Cpu",

  // ---- 时间 ----
  Time: "Clock",
  Timer: "Timer",
  AlarmClock: "AlarmClock",
  Schedule: "CalendarClock",

  // ---- 设备 / 地理 ----
  Videocamera: "Video",
  VideoOne: "Video",
  Picture: "Image",
  Wifi: "Wifi",
  CloseWifi: "WifiOff",
  Api: "Webhook",
  Router: "Router",
  Navigation: "Navigation",
  LocalPin: "MapPin",
  MapDraw: "Map",
  Earth: "Earth",
  Globe: "Globe",
  Compass: "Compass",
  Target: "Target",
  Aiming: "Crosshair",
  Lightning: "Zap",
  Thunderbolt: "Zap",
  Fire: "Flame",
  Water: "Droplet",
  Wind: "Wind",
  Thermometer: "Thermometer",
  Sun: "Sun",
  Moon: "Moon",
  Leaf: "Leaf",
  Tree: "TreePine",
  Seedling: "Sprout",
  Experiment: "FlaskConical",
  MedicineChest: "BriefcaseMedical",

  // ---- 天气（lucide 有完整天气图标族）----
  Cloudy: "Cloud",
  CloudyNight: "CloudMoon",
  Fog: "CloudFog",
  LightRain: "CloudDrizzle",
  HeavyRain: "CloudRainWind",
  Snow: "CloudSnow",
  Sunny: "SunMedium",
  Thunderstorm: "CloudLightning",

  // ---- 外观 / 主题 ----
  Setting: "Settings",
  SettingOne: "Settings",
  SettingTwo: "Settings2",
  Switch: "ArrowLeftRight",
  BackgroundColor: "PaintBucket",
  Light: "Lightbulb",
  Magic: "Sparkles",
  MagicWand: "Wand2",
  EmotionHappy: "Smile",
  Round: "Circle",
  RoundCaliper: "CircleDot",
  SquareSmall: "Square",
  Dot: "Dot",
  Cd: "Disc",

  // ---- 商业 / 其它 ----
  Bill: "Receipt",
  Dollar: "DollarSign",
  Currency: "CircleDollarSign",
  Shop: "Store",
  Briefcase: "Briefcase",
  BuildingFour: "Building2",
  DegreeHat: "GraduationCap",
  Translate: "Languages",
  Fingerprint: "Fingerprint",
  HashtagKey: "Hash",
  HeadphoneSound: "Headphones",
  VolumeMute: "VolumeX",
  VolumeNotice: "Volume2",
  NetworkTree: "Network",
  Connect: "Cable",
  Layers: "Layers",
  Merge: "Merge",
  More: "Ellipsis",
  ApplicationOne: "LayoutGrid",
  Column: "Columns2",
  GridFour: "Grid2x2",
  ListTwo: "List",
  ListCheckbox: "ListChecks",
  Compression: "Minimize2",
  GithubOne: "Github",
  HtmlFive: "FileCode",
  HexagonOne: "Hexagon",
  Tool: "Wrench",
  Robot: "Bot",
  Wand: "Wand",
  Zip: "FileArchive",
  Waves: "Waves",
  Pocket: "Pocket",
  Trophy: "Trophy",
  Star: "Star",
  Heart: "Heart",
  Bookmark: "Bookmark",
  Quote: "Quote",
  Ticket: "Ticket",
  Wallet: "Wallet",
  Tag: "Tag",
  Rocket: "Rocket",
  Brain: "Brain",
  Code: "Code",
  Terminal: "Terminal",
  Bug: "Bug",
  Github: "Github",
  Twitter: "Twitter",
  Logout: "LogOut",
  HandUp: "Hand",
  Scissors: "Scissors",
  PlayOne: "Play",
  Radio: "Radio",
  Music: "Music",
  Video: "Video",
  Pause: "Pause",
  VolumeOff: "VolumeX",

  // ---- 云存储 / 备份（用于知识库备份等语义，保留 CloudStorage 名）----
  CloudUpload: "CloudUpload",
};

/**
 * 全部已适配图标（语义分组）。
 *
 * 注意：这里的值是 **lucide 组件**，最终由 `createIcon` 统一包装。
 * 下方 `export const IconXxx` 段落按字母序稳定输出（由映射表 + Icons 对象生成）。
 */
export const Icons = {
  // ---- 导航 / 布局 ----
  IconHome: Lucide.House,
  IconLayoutTwo: Lucide.PanelLeft,
  IconHamburgerButton: Lucide.Menu,
  IconLeft: Lucide.ChevronLeft,
  IconRight: Lucide.ChevronRight,
  IconUp: Lucide.ChevronUp,
  IconDown: Lucide.ChevronDown,
  IconArrowLeft: Lucide.ArrowLeft,
  IconArrowRight: Lucide.ArrowRight,
  IconArrowUp: Lucide.ArrowUp,
  /** 实心圆底向上的箭头 — 发送按钮（参照对话产品的实心发送按钮） */
  IconArrowUpSolid: Lucide.ArrowUp,
  IconArrowDown: Lucide.ArrowDown,
  IconArrowRightUp: Lucide.ArrowUpRight,
  IconArrowCircleUp: Lucide.CircleArrowUp,
  IconSort: Lucide.ArrowUpDown,
  IconExchange: Lucide.ArrowLeftRight,
  IconDrag: Lucide.GripVertical,
  IconFullScreen: Lucide.Maximize,
  IconFullScreenOne: Lucide.Maximize2,
  IconOffScreen: Lucide.Minimize,
  IconOffScreenOne: Lucide.Minimize2,
  IconMonitor: Lucide.Monitor,
  IconIpad: Lucide.Tablet,
  IconPhone: Lucide.Smartphone,
  IconLaptop: Lucide.Laptop,

  // ---- 操作 ----
  IconPlus: Lucide.Plus,
  IconMinus: Lucide.Minus,
  IconClose: Lucide.X,
  IconCloseOne: Lucide.X,
  IconCheck: Lucide.Check,
  IconCheckOne: Lucide.Check,
  IconCheckCorrect: Lucide.CircleCheck,
  IconCopy: Lucide.Copy,
  IconEdit: Lucide.Pencil,
  IconDelete: Lucide.Trash2,
  IconRotate: Lucide.RotateCw,
  IconTool: Lucide.Wrench,
  IconSave: Lucide.Save,
  IconDownload: Lucide.Download,
  IconUpload: Lucide.Upload,
  IconShare: Lucide.Share2,
  IconSend: Lucide.Send,
  IconSearch: Lucide.Search,
  IconFilter: Lucide.Funnel,
  IconRefresh: Lucide.RefreshCw,
  IconUndo: Lucide.Undo2,
  IconRedo: Lucide.Redo2,
  IconPin: Lucide.Pin,
  IconLink: Lucide.Link,
  IconLinkOut: Lucide.ExternalLink,
  IconLinkIn: Lucide.LogIn,
  IconUnlink: Lucide.Unlink,
  IconPreviewOpen: Lucide.Eye,
  IconPreviewClose: Lucide.EyeOff,
  IconLock: Lucide.Lock,
  IconUnlock: Lucide.LockOpen,
  IconKey: Lucide.KeyRound,
  IconPower: Lucide.Power,
  IconPencil: Lucide.Pencil,
  IconScan: Lucide.Scan,
  IconScanCode: Lucide.ScanLine,
  IconZoomIn: Lucide.ZoomIn,
  IconZoomOut: Lucide.ZoomOut,
  IconExport: Lucide.FileOutput,
  IconClickTap: Lucide.MousePointerClick,
  IconPlusCross: Lucide.Plus,
  IconSquareSmall: Lucide.Square,

  // ---- 状态提示 ----
  IconAttention: Lucide.TriangleAlert,
  IconCaution: Lucide.TriangleAlert,
  IconInfo: Lucide.Info,
  IconHelp: Lucide.CircleHelp,
  IconLoading: Lucide.LoaderCircle,
  IconCloseRemind: Lucide.BellOff,
  IconRemind: Lucide.Bell,
  IconRemindDisable: Lucide.BellOff,
  IconShield: Lucide.ShieldCheck,
  /** 盾牌 + 勾 — 「完全访问权限」模式标识（参照对话产品） */
  IconShieldCheck: Lucide.ShieldCheck,
  IconCertificate: Lucide.Award,
  IconTrophy: Lucide.Trophy,
  IconStar: Lucide.Star,

  // ---- 内容 / 文件 ----
  IconFileText: Lucide.FileText,
  IconFileCode: Lucide.FileCode,
  IconFileAddition: Lucide.FilePlus,
  IconFileEditing: Lucide.FilePen,
  IconFileSearch: Lucide.FileSearch,
  IconFilePdf: Lucide.FileType,
  IconFilePpt: Lucide.Presentation,
  IconFileWord: Lucide.FileType,
  IconFileZip: Lucide.FileArchive,
  IconFolder: Lucide.Folder,
  IconFolderOpen: Lucide.FolderOpen,
  IconFolderPlus: Lucide.FolderPlus,
  IconFolderMinus: Lucide.FolderMinus,
  IconFolderSettings: Lucide.FolderCog,
  IconFolderUpload: Lucide.FolderUp,
  IconBook: Lucide.Book,
  IconBookOne: Lucide.BookMarked,
  IconBookOpen: Lucide.BookOpen,
  IconBookmark: Lucide.Bookmark,
  IconBookshelf: Lucide.Library,
  IconNotebook: Lucide.Notebook,
  IconList: Lucide.List,
  IconListTwo: Lucide.List,
  IconListCheckbox: Lucide.ListChecks,
  IconColumn: Lucide.Columns2,
  IconGridFour: Lucide.Grid2x2,
  IconBox: Lucide.Package,
  IconPaperclip: Lucide.Paperclip,

  // ---- 通讯 / 人员 ----
  IconUser: Lucide.User,
  IconPeoples: Lucide.Users,
  IconAddUser: Lucide.UserPlus,
  IconPeopleDelete: Lucide.UserMinus,
  IconComment: Lucide.MessageSquare,
  IconComments: Lucide.MessagesSquare,
  /**
   * 「气泡 + 加号」= 新建对话。
   *
   * 说明：lucide 的 `MessageSquarePlus` 把加号画在气泡**内部**（`M12 8v6` / `M9 11h6`），
   * 而 Qwen / ChatGPT 侧栏那款是**圆角方气泡 + 右下尾巴 + 右上角外侧加号**。
   * 这里保持气泡 path 原样（`M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202…z`），
   * 只把内部加号替换成右上角外挂加号（`M19 2v6` / `M16 5h6`），
   * 造型与参考一致，且仍走 lucide 网格 —— 不引入外来 path 源。
   *
   * 与 `IconCommentDashed`（临时对话）同排并置时，两者气泡轮廓/线宽完全同源，不会一粗一细。
   */
  IconCommentAdd: createIconFromLucideNode(MESSAGE_SQUARE_PLUS_OUTSIDE_NODE, "IconCommentAdd"),
  IconCommentDashed: Lucide.MessageSquareDashed,
  IconMail: Lucide.Mail,
  IconPhoneOff: Lucide.PhoneOff,
  IconMicrophone: Lucide.Mic,
  IconVoiceOff: Lucide.MicOff,
  IconAnnouncement: Lucide.Megaphone,
  IconInbox: Lucide.Inbox,
  IconCustomer: Lucide.UserRound,

  // ---- 数据 / 图表 ----
  IconChartHistogram: Lucide.ChartColumn,
  IconChartLine: Lucide.ChartLine,
  IconChartPie: Lucide.ChartPie,
  IconTrendingUp: Lucide.TrendingUp,
  IconTrendingDown: Lucide.TrendingDown,
  IconDashboard: Lucide.LayoutDashboard,
  IconDatabaseNetwork: Lucide.Database,
  IconServer: Lucide.Server,
  IconCloudStorage: Lucide.CloudUpload,
  IconHardDisk: Lucide.HardDrive,
  IconCpu: Lucide.Cpu,

  // ---- 时间 ----
  IconTime: Lucide.Clock,
  IconTimer: Lucide.Timer,
  IconCalendar: Lucide.Calendar,
  IconHistory: Lucide.History,
  IconAlarmClock: Lucide.Clock,
  IconSchedule: Lucide.CalendarClock,

  // ---- 设备 / 地理 ----
  IconCamera: Lucide.Camera,
  IconVideo: Lucide.Video,
  IconVideoOne: Lucide.Video,
  IconVideocamera: Lucide.Video,
  IconPicture: Lucide.Image,
  IconMusic: Lucide.Music,
  IconWifi: Lucide.Wifi,
  IconCloseWifi: Lucide.WifiOff,
  IconSignal: Lucide.Signal,
  IconApi: Lucide.Webhook,
  IconRouter: Lucide.Router,
  IconNavigation: Lucide.Navigation,
  IconLocalPin: Lucide.MapPin,
  IconMapDraw: Lucide.Map,
  IconEarth: Lucide.Earth,
  IconGlobe: Lucide.Globe,
  IconCompass: Lucide.Compass,
  IconTarget: Lucide.Target,
  IconAiming: Lucide.Crosshair,
  IconLightning: Lucide.Zap,
  IconThunderbolt: Lucide.Zap,
  IconFire: Lucide.Flame,
  IconWater: Lucide.Droplet,
  IconWind: Lucide.Wind,
  IconThermometer: Lucide.Thermometer,
  IconSun: Lucide.Sun,
  IconMoon: Lucide.Moon,
  IconLeaf: Lucide.Leaf,
  IconTree: Lucide.TreePine,
  IconSeedling: Lucide.Sprout,
  IconExperiment: Lucide.FlaskConical,
  IconMedicineChest: Lucide.BriefcaseMedical,

  // ---- 天气 ----
  IconCloudy: Lucide.Cloud,
  IconCloudyNight: Lucide.CloudMoon,
  IconFog: Lucide.CloudFog,
  IconLightRain: Lucide.CloudDrizzle,
  IconHeavyRain: Lucide.CloudRainWind,
  IconSnow: Lucide.CloudSnow,
  IconSunny: Lucide.SunMedium,
  IconThunderstorm: Lucide.CloudLightning,

  // ---- 外观 / 主题 ----
  IconSetting: Lucide.Settings,
  IconSettingOne: Lucide.Settings,
  IconSettingTwo: Lucide.Settings2,
  IconSwitch: Lucide.ArrowLeftRight,
  IconBackgroundColor: Lucide.PaintBucket,
  IconLight: Lucide.Lightbulb,
  IconMagic: Lucide.Sparkles,
  IconMagicWand: Lucide.Wand2,
  IconEmotionHappy: Lucide.Smile,
  IconCrown: Lucide.Crown,
  IconHexagonOne: Lucide.Hexagon,
  IconRound: Lucide.Circle,
  IconRoundCaliper: Lucide.CircleDot,
  IconSquare: Lucide.Square,
  IconDot: Lucide.Dot,
  IconCd: Lucide.Disc,
  IconRocket: Lucide.Rocket,
  IconBrain: Lucide.Brain,
  IconRobot: Lucide.Bot,
  IconCode: Lucide.Code,
  IconTerminal: Lucide.Terminal,
  IconBug: Lucide.Bug,
  IconGithub: Lucide.Github,
  IconGithubOne: Lucide.Github,
  IconTwitter: Lucide.Twitter,
  IconLogout: Lucide.LogOut,
  IconCompression: Lucide.Minimize2,
  IconHandUp: Lucide.Hand,
  IconQuote: Lucide.Quote,

  // ---- 商业 / 其它 ----
  IconBill: Lucide.Receipt,
  IconWallet: Lucide.Wallet,
  IconDollar: Lucide.DollarSign,
  IconCurrency: Lucide.CircleDollarSign,
  IconTag: Lucide.Tag,
  IconTicket: Lucide.Ticket,
  IconBriefcase: Lucide.Briefcase,
  IconBuildingFour: Lucide.Building2,
  IconShop: Lucide.Store,
  IconDegreeHat: Lucide.GraduationCap,
  IconTranslate: Lucide.Languages,
  IconFingerprint: Lucide.Fingerprint,
  IconApplicationOne: Lucide.LayoutGrid,
  IconConnect: Lucide.Cable,
  IconFan: Lucide.Fan,
  IconHashtagKey: Lucide.Hash,
  IconHeadphoneSound: Lucide.Headphones,
  IconHeart: Lucide.Heart,
  IconHtmlFive: Lucide.FileCode,
  IconLayers: Lucide.Layers,
  IconMerge: Lucide.Merge,
  IconMore: Lucide.Ellipsis,
  IconNetworkTree: Lucide.Network,
  IconPause: Lucide.Pause,
  IconPlay: Lucide.Play,
  IconPlayOne: Lucide.Play,
  IconRadio: Lucide.Radio,
  IconScissors: Lucide.Scissors,
  IconSunrise: Lucide.Sunrise,
  IconSunset: Lucide.Sunset,
  IconVolumeMute: Lucide.VolumeX,
  IconVolumeNotice: Lucide.Volume2,
  IconWaves: Lucide.Waves,
  IconZip: Lucide.FileArchive,

  // ---- 兼容别名（历史遗留名，保持导出不报错）----
  IconEdit3: Lucide.Pencil,
  IconWand: Lucide.Wand,
  IconPocket: Lucide.Pocket,
  IconVolumeOff: Lucide.VolumeX,
  IconCloudUpload: Lucide.CloudUpload,
} as const;

export type IconName = keyof typeof Icons;

/** 全部图标名清单（便于调试 / 遍历） */
export const ICON_NAMES = Object.keys(Icons) as IconName[];

/** IconPark 名 → lucide 名 的只读映射（供外部工具/迁移脚本查询） */
export const ICON_PARK_TO_LUCIDE = LUCIDE_NAME_MAP;

/** lucide 基准网格，供需要换算描边的场景使用 */
export const ICON_BASE_SIZE = LUCIDE_BASE_SIZE;

// ────────────────────────────────────────────────────────────────
// 具名导出（与迁移前 239 个名字 1:1 对应，保证调用方零改动）
// ────────────────────────────────────────────────────────────────

export const IconAddUser = createIcon(Icons.IconAddUser as unknown as LucideComponent, "IconAddUser");
export const IconAiming = createIcon(Icons.IconAiming as unknown as LucideComponent, "IconAiming");
export const IconAlarmClock = createIcon(Icons.IconAlarmClock as unknown as LucideComponent, "IconAlarmClock");
export const IconAnnouncement = createIcon(Icons.IconAnnouncement as unknown as LucideComponent, "IconAnnouncement");
export const IconApi = createIcon(Icons.IconApi as unknown as LucideComponent, "IconApi");
export const IconApplicationOne = createIcon(Icons.IconApplicationOne as unknown as LucideComponent, "IconApplicationOne");
export const IconArrowCircleUp = createIcon(Icons.IconArrowCircleUp as unknown as LucideComponent, "IconArrowCircleUp");
export const IconArrowDown = createIcon(Icons.IconArrowDown as unknown as LucideComponent, "IconArrowDown");
export const IconArrowLeft = createIcon(Icons.IconArrowLeft as unknown as LucideComponent, "IconArrowLeft");
export const IconArrowRight = createIcon(Icons.IconArrowRight as unknown as LucideComponent, "IconArrowRight");
export const IconArrowRightUp = createIcon(Icons.IconArrowRightUp as unknown as LucideComponent, "IconArrowRightUp");
export const IconArrowUp = createIcon(Icons.IconArrowUp as unknown as LucideComponent, "IconArrowUp");
export const IconArrowUpSolid = createIcon(Icons.IconArrowUpSolid as unknown as LucideComponent, "IconArrowUpSolid");
export const IconAttention = createIcon(Icons.IconAttention as unknown as LucideComponent, "IconAttention");
export const IconBackgroundColor = createIcon(Icons.IconBackgroundColor as unknown as LucideComponent, "IconBackgroundColor");
export const IconBill = createIcon(Icons.IconBill as unknown as LucideComponent, "IconBill");
export const IconBook = createIcon(Icons.IconBook as unknown as LucideComponent, "IconBook");
export const IconBookOne = createIcon(Icons.IconBookOne as unknown as LucideComponent, "IconBookOne");
export const IconBookOpen = createIcon(Icons.IconBookOpen as unknown as LucideComponent, "IconBookOpen");
export const IconBookmark = createIcon(Icons.IconBookmark as unknown as LucideComponent, "IconBookmark");
export const IconBookshelf = createIcon(Icons.IconBookshelf as unknown as LucideComponent, "IconBookshelf");
export const IconBox = createIcon(Icons.IconBox as unknown as LucideComponent, "IconBox");
export const IconBrain = createIcon(Icons.IconBrain as unknown as LucideComponent, "IconBrain");
export const IconBriefcase = createIcon(Icons.IconBriefcase as unknown as LucideComponent, "IconBriefcase");
export const IconBug = createIcon(Icons.IconBug as unknown as LucideComponent, "IconBug");
export const IconBuildingFour = createIcon(Icons.IconBuildingFour as unknown as LucideComponent, "IconBuildingFour");
export const IconCalendar = createIcon(Icons.IconCalendar as unknown as LucideComponent, "IconCalendar");
export const IconCamera = createIcon(Icons.IconCamera as unknown as LucideComponent, "IconCamera");
export const IconCaution = createIcon(Icons.IconCaution as unknown as LucideComponent, "IconCaution");
export const IconCd = createIcon(Icons.IconCd as unknown as LucideComponent, "IconCd");
export const IconCertificate = createIcon(Icons.IconCertificate as unknown as LucideComponent, "IconCertificate");
export const IconChartHistogram = createIcon(Icons.IconChartHistogram as unknown as LucideComponent, "IconChartHistogram");
export const IconChartLine = createIcon(Icons.IconChartLine as unknown as LucideComponent, "IconChartLine");
export const IconChartPie = createIcon(Icons.IconChartPie as unknown as LucideComponent, "IconChartPie");
export const IconCheck = createIcon(Icons.IconCheck as unknown as LucideComponent, "IconCheck");
export const IconCheckCorrect = createIcon(Icons.IconCheckCorrect as unknown as LucideComponent, "IconCheckCorrect");
export const IconCheckOne = createIcon(Icons.IconCheckOne as unknown as LucideComponent, "IconCheckOne");
export const IconClickTap = createIcon(Icons.IconClickTap as unknown as LucideComponent, "IconClickTap");
export const IconClose = createIcon(Icons.IconClose as unknown as LucideComponent, "IconClose");
export const IconCloseOne = createIcon(Icons.IconCloseOne as unknown as LucideComponent, "IconCloseOne");
export const IconCloseRemind = createIcon(Icons.IconCloseRemind as unknown as LucideComponent, "IconCloseRemind");
export const IconCloseWifi = createIcon(Icons.IconCloseWifi as unknown as LucideComponent, "IconCloseWifi");
export const IconCloudStorage = createIcon(Icons.IconCloudStorage as unknown as LucideComponent, "IconCloudStorage");
export const IconCloudUpload = createIcon(Icons.IconCloudUpload as unknown as LucideComponent, "IconCloudUpload");
export const IconCloudy = createIcon(Icons.IconCloudy as unknown as LucideComponent, "IconCloudy");
export const IconCloudyNight = createIcon(Icons.IconCloudyNight as unknown as LucideComponent, "IconCloudyNight");
export const IconCode = createIcon(Icons.IconCode as unknown as LucideComponent, "IconCode");
export const IconColumn = createIcon(Icons.IconColumn as unknown as LucideComponent, "IconColumn");
export const IconComment = createIcon(Icons.IconComment as unknown as LucideComponent, "IconComment");
export const IconCommentAdd = Icons.IconCommentAdd;
export const IconComments = createIcon(Icons.IconComments as unknown as LucideComponent, "IconComments");
export const IconCommentDashed = createIcon(Icons.IconCommentDashed as unknown as LucideComponent, "IconCommentDashed");
export const IconCompass = createIcon(Icons.IconCompass as unknown as LucideComponent, "IconCompass");
export const IconCompression = createIcon(Icons.IconCompression as unknown as LucideComponent, "IconCompression");
export const IconConnect = createIcon(Icons.IconConnect as unknown as LucideComponent, "IconConnect");
export const IconCopy = createIcon(Icons.IconCopy as unknown as LucideComponent, "IconCopy");
export const IconCpu = createIcon(Icons.IconCpu as unknown as LucideComponent, "IconCpu");
export const IconCrown = createIcon(Icons.IconCrown as unknown as LucideComponent, "IconCrown");
export const IconCurrency = createIcon(Icons.IconCurrency as unknown as LucideComponent, "IconCurrency");
export const IconCustomer = createIcon(Icons.IconCustomer as unknown as LucideComponent, "IconCustomer");
export const IconDashboard = createIcon(Icons.IconDashboard as unknown as LucideComponent, "IconDashboard");
export const IconDatabaseNetwork = createIcon(Icons.IconDatabaseNetwork as unknown as LucideComponent, "IconDatabaseNetwork");
export const IconDegreeHat = createIcon(Icons.IconDegreeHat as unknown as LucideComponent, "IconDegreeHat");
export const IconDelete = createIcon(Icons.IconDelete as unknown as LucideComponent, "IconDelete");
export const IconDollar = createIcon(Icons.IconDollar as unknown as LucideComponent, "IconDollar");
export const IconDot = createIcon(Icons.IconDot as unknown as LucideComponent, "IconDot");
export const IconDown = createIcon(Icons.IconDown as unknown as LucideComponent, "IconDown");
export const IconDownload = createIcon(Icons.IconDownload as unknown as LucideComponent, "IconDownload");
export const IconDrag = createIcon(Icons.IconDrag as unknown as LucideComponent, "IconDrag");
export const IconEarth = createIcon(Icons.IconEarth as unknown as LucideComponent, "IconEarth");
export const IconEdit = createIcon(Icons.IconEdit as unknown as LucideComponent, "IconEdit");
export const IconEdit3 = createIcon(Icons.IconEdit3 as unknown as LucideComponent, "IconEdit3");
export const IconEmotionHappy = createIcon(Icons.IconEmotionHappy as unknown as LucideComponent, "IconEmotionHappy");
export const IconExchange = createIcon(Icons.IconExchange as unknown as LucideComponent, "IconExchange");
export const IconExperiment = createIcon(Icons.IconExperiment as unknown as LucideComponent, "IconExperiment");
export const IconExport = createIcon(Icons.IconExport as unknown as LucideComponent, "IconExport");
export const IconFan = createIcon(Icons.IconFan as unknown as LucideComponent, "IconFan");
export const IconFileAddition = createIcon(Icons.IconFileAddition as unknown as LucideComponent, "IconFileAddition");
export const IconFileCode = createIcon(Icons.IconFileCode as unknown as LucideComponent, "IconFileCode");
export const IconFileEditing = createIcon(Icons.IconFileEditing as unknown as LucideComponent, "IconFileEditing");
export const IconFilePdf = createIcon(Icons.IconFilePdf as unknown as LucideComponent, "IconFilePdf");
export const IconFilePpt = createIcon(Icons.IconFilePpt as unknown as LucideComponent, "IconFilePpt");
export const IconFileSearch = createIcon(Icons.IconFileSearch as unknown as LucideComponent, "IconFileSearch");
export const IconFileText = createIcon(Icons.IconFileText as unknown as LucideComponent, "IconFileText");
export const IconFileWord = createIcon(Icons.IconFileWord as unknown as LucideComponent, "IconFileWord");
export const IconFileZip = createIcon(Icons.IconFileZip as unknown as LucideComponent, "IconFileZip");
export const IconFilter = createIcon(Icons.IconFilter as unknown as LucideComponent, "IconFilter");
export const IconFingerprint = createIcon(Icons.IconFingerprint as unknown as LucideComponent, "IconFingerprint");
export const IconFire = createIcon(Icons.IconFire as unknown as LucideComponent, "IconFire");
export const IconFog = createIcon(Icons.IconFog as unknown as LucideComponent, "IconFog");
export const IconFolder = createIcon(Icons.IconFolder as unknown as LucideComponent, "IconFolder");
export const IconFolderMinus = createIcon(Icons.IconFolderMinus as unknown as LucideComponent, "IconFolderMinus");
export const IconFolderOpen = createIcon(Icons.IconFolderOpen as unknown as LucideComponent, "IconFolderOpen");
export const IconFolderPlus = createIcon(Icons.IconFolderPlus as unknown as LucideComponent, "IconFolderPlus");
export const IconFolderSettings = createIcon(Icons.IconFolderSettings as unknown as LucideComponent, "IconFolderSettings");
export const IconFolderUpload = createIcon(Icons.IconFolderUpload as unknown as LucideComponent, "IconFolderUpload");
export const IconFullScreen = createIcon(Icons.IconFullScreen as unknown as LucideComponent, "IconFullScreen");
export const IconFullScreenOne = createIcon(Icons.IconFullScreenOne as unknown as LucideComponent, "IconFullScreenOne");
export const IconGithub = createIcon(Icons.IconGithub as unknown as LucideComponent, "IconGithub");
export const IconGithubOne = createIcon(Icons.IconGithubOne as unknown as LucideComponent, "IconGithubOne");
export const IconGlobe = createIcon(Icons.IconGlobe as unknown as LucideComponent, "IconGlobe");
export const IconGridFour = createIcon(Icons.IconGridFour as unknown as LucideComponent, "IconGridFour");
export const IconHamburgerButton = createIcon(Icons.IconHamburgerButton as unknown as LucideComponent, "IconHamburgerButton");
export const IconHandUp = createIcon(Icons.IconHandUp as unknown as LucideComponent, "IconHandUp");
export const IconHardDisk = createIcon(Icons.IconHardDisk as unknown as LucideComponent, "IconHardDisk");
export const IconHashtagKey = createIcon(Icons.IconHashtagKey as unknown as LucideComponent, "IconHashtagKey");
export const IconHeadphoneSound = createIcon(Icons.IconHeadphoneSound as unknown as LucideComponent, "IconHeadphoneSound");
export const IconHeart = createIcon(Icons.IconHeart as unknown as LucideComponent, "IconHeart");
export const IconHeavyRain = createIcon(Icons.IconHeavyRain as unknown as LucideComponent, "IconHeavyRain");
export const IconHelp = createIcon(Icons.IconHelp as unknown as LucideComponent, "IconHelp");
export const IconHexagonOne = createIcon(Icons.IconHexagonOne as unknown as LucideComponent, "IconHexagonOne");
export const IconHistory = createIcon(Icons.IconHistory as unknown as LucideComponent, "IconHistory");
export const IconHome = createIcon(Icons.IconHome as unknown as LucideComponent, "IconHome");
export const IconHtmlFive = createIcon(Icons.IconHtmlFive as unknown as LucideComponent, "IconHtmlFive");
export const IconInbox = createIcon(Icons.IconInbox as unknown as LucideComponent, "IconInbox");
export const IconInfo = createIcon(Icons.IconInfo as unknown as LucideComponent, "IconInfo");
export const IconIpad = createIcon(Icons.IconIpad as unknown as LucideComponent, "IconIpad");
export const IconKey = createIcon(Icons.IconKey as unknown as LucideComponent, "IconKey");
export const IconLaptop = createIcon(Icons.IconLaptop as unknown as LucideComponent, "IconLaptop");
export const IconLayers = createIcon(Icons.IconLayers as unknown as LucideComponent, "IconLayers");
export const IconLayoutTwo = createIcon(Icons.IconLayoutTwo as unknown as LucideComponent, "IconLayoutTwo");
export const IconLeaf = createIcon(Icons.IconLeaf as unknown as LucideComponent, "IconLeaf");
export const IconLeft = createIcon(Icons.IconLeft as unknown as LucideComponent, "IconLeft");
export const IconLight = createIcon(Icons.IconLight as unknown as LucideComponent, "IconLight");
export const IconLightning = createIcon(Icons.IconLightning as unknown as LucideComponent, "IconLightning");
export const IconLightRain = createIcon(Icons.IconLightRain as unknown as LucideComponent, "IconLightRain");
export const IconLink = createIcon(Icons.IconLink as unknown as LucideComponent, "IconLink");
export const IconLinkIn = createIcon(Icons.IconLinkIn as unknown as LucideComponent, "IconLinkIn");
export const IconLinkOut = createIcon(Icons.IconLinkOut as unknown as LucideComponent, "IconLinkOut");
export const IconList = createIcon(Icons.IconList as unknown as LucideComponent, "IconList");
export const IconListCheckbox = createIcon(Icons.IconListCheckbox as unknown as LucideComponent, "IconListCheckbox");
export const IconListTwo = createIcon(Icons.IconListTwo as unknown as LucideComponent, "IconListTwo");
export const IconLoading = createIcon(Icons.IconLoading as unknown as LucideComponent, "IconLoading");
export const IconLocalPin = createIcon(Icons.IconLocalPin as unknown as LucideComponent, "IconLocalPin");
export const IconLock = createIcon(Icons.IconLock as unknown as LucideComponent, "IconLock");
export const IconLogout = createIcon(Icons.IconLogout as unknown as LucideComponent, "IconLogout");
export const IconMagic = createIcon(Icons.IconMagic as unknown as LucideComponent, "IconMagic");
export const IconMagicWand = createIcon(Icons.IconMagicWand as unknown as LucideComponent, "IconMagicWand");
export const IconMail = createIcon(Icons.IconMail as unknown as LucideComponent, "IconMail");
export const IconMapDraw = createIcon(Icons.IconMapDraw as unknown as LucideComponent, "IconMapDraw");
export const IconMedicineChest = createIcon(Icons.IconMedicineChest as unknown as LucideComponent, "IconMedicineChest");
export const IconMerge = createIcon(Icons.IconMerge as unknown as LucideComponent, "IconMerge");
export const IconMicrophone = createIcon(Icons.IconMicrophone as unknown as LucideComponent, "IconMicrophone");
export const IconMinus = createIcon(Icons.IconMinus as unknown as LucideComponent, "IconMinus");
export const IconMonitor = createIcon(Icons.IconMonitor as unknown as LucideComponent, "IconMonitor");
export const IconMoon = createIcon(Icons.IconMoon as unknown as LucideComponent, "IconMoon");
export const IconMore = createIcon(Lucide.ChevronDown as unknown as LucideComponent, "IconMore");
export const IconMusic = createIcon(Icons.IconMusic as unknown as LucideComponent, "IconMusic");
export const IconNavigation = createIcon(Icons.IconNavigation as unknown as LucideComponent, "IconNavigation");
export const IconNetworkTree = createIcon(Icons.IconNetworkTree as unknown as LucideComponent, "IconNetworkTree");
export const IconNotebook = createIcon(Icons.IconNotebook as unknown as LucideComponent, "IconNotebook");
export const IconOffScreen = createIcon(Icons.IconOffScreen as unknown as LucideComponent, "IconOffScreen");
export const IconOffScreenOne = createIcon(Icons.IconOffScreenOne as unknown as LucideComponent, "IconOffScreenOne");
export const IconPaperclip = createIcon(Icons.IconPaperclip as unknown as LucideComponent, "IconPaperclip");
export const IconPause = createIcon(Icons.IconPause as unknown as LucideComponent, "IconPause");
export const IconPencil = createIcon(Icons.IconPencil as unknown as LucideComponent, "IconPencil");
export const IconPeopleDelete = createIcon(Icons.IconPeopleDelete as unknown as LucideComponent, "IconPeopleDelete");
export const IconPeoples = createIcon(Icons.IconPeoples as unknown as LucideComponent, "IconPeoples");
export const IconPhone = createIcon(Icons.IconPhone as unknown as LucideComponent, "IconPhone");
export const IconPhoneOff = createIcon(Icons.IconPhoneOff as unknown as LucideComponent, "IconPhoneOff");
export const IconPicture = createIcon(Icons.IconPicture as unknown as LucideComponent, "IconPicture");
export const IconPin = createIcon(Icons.IconPin as unknown as LucideComponent, "IconPin");
export const IconPlay = createIcon(Icons.IconPlay as unknown as LucideComponent, "IconPlay");
export const IconPlayOne = createIcon(Icons.IconPlayOne as unknown as LucideComponent, "IconPlayOne");
export const IconPlus = createIcon(Icons.IconPlus as unknown as LucideComponent, "IconPlus");
export const IconPlusCross = createIcon(Icons.IconPlusCross as unknown as LucideComponent, "IconPlusCross");
export const IconPocket = createIcon(Icons.IconPocket as unknown as LucideComponent, "IconPocket");
export const IconPower = createIcon(Icons.IconPower as unknown as LucideComponent, "IconPower");
export const IconPreviewClose = createIcon(Icons.IconPreviewClose as unknown as LucideComponent, "IconPreviewClose");
export const IconPreviewOpen = createIcon(Icons.IconPreviewOpen as unknown as LucideComponent, "IconPreviewOpen");
export const IconQuote = createIcon(Icons.IconQuote as unknown as LucideComponent, "IconQuote");
export const IconRadio = createIcon(Icons.IconRadio as unknown as LucideComponent, "IconRadio");
export const IconRedo = createIcon(Icons.IconRedo as unknown as LucideComponent, "IconRedo");
export const IconRefresh = createIcon(Icons.IconRefresh as unknown as LucideComponent, "IconRefresh");
export const IconRemind = createIcon(Icons.IconRemind as unknown as LucideComponent, "IconRemind");
export const IconRemindDisable = createIcon(Icons.IconRemindDisable as unknown as LucideComponent, "IconRemindDisable");
export const IconRight = createIcon(Icons.IconRight as unknown as LucideComponent, "IconRight");
export const IconRobot = createIcon(Icons.IconRobot as unknown as LucideComponent, "IconRobot");
export const IconRocket = createIcon(Icons.IconRocket as unknown as LucideComponent, "IconRocket");
export const IconRotate = createIcon(Icons.IconRotate as unknown as LucideComponent, "IconRotate");
export const IconRound = createIcon(Icons.IconRound as unknown as LucideComponent, "IconRound");
export const IconRoundCaliper = createIcon(Icons.IconRoundCaliper as unknown as LucideComponent, "IconRoundCaliper");
export const IconRouter = createIcon(Icons.IconRouter as unknown as LucideComponent, "IconRouter");
export const IconSave = createIcon(Icons.IconSave as unknown as LucideComponent, "IconSave");
export const IconScan = createIcon(Icons.IconScan as unknown as LucideComponent, "IconScan");
export const IconScanCode = createIcon(Icons.IconScanCode as unknown as LucideComponent, "IconScanCode");
export const IconSchedule = createIcon(Icons.IconSchedule as unknown as LucideComponent, "IconSchedule");
export const IconScissors = createIcon(Icons.IconScissors as unknown as LucideComponent, "IconScissors");
export const IconSearch = createIcon(Icons.IconSearch as unknown as LucideComponent, "IconSearch");
export const IconSeedling = createIcon(Icons.IconSeedling as unknown as LucideComponent, "IconSeedling");
export const IconSend = createIcon(Icons.IconSend as unknown as LucideComponent, "IconSend");
export const IconServer = createIcon(Icons.IconServer as unknown as LucideComponent, "IconServer");
export const IconSetting = createIcon(Icons.IconSetting as unknown as LucideComponent, "IconSetting");
export const IconSettingOne = createIcon(Icons.IconSettingOne as unknown as LucideComponent, "IconSettingOne");
export const IconSettingTwo = createIcon(Icons.IconSettingTwo as unknown as LucideComponent, "IconSettingTwo");
export const IconShare = createIcon(Icons.IconShare as unknown as LucideComponent, "IconShare");
export const IconShield = createIcon(Icons.IconShield as unknown as LucideComponent, "IconShield");
export const IconShieldCheck = createIcon(Icons.IconShieldCheck as unknown as LucideComponent, "IconShieldCheck");
export const IconShop = createIcon(Icons.IconShop as unknown as LucideComponent, "IconShop");
export const IconSignal = createIcon(Icons.IconSignal as unknown as LucideComponent, "IconSignal");
export const IconSnow = createIcon(Icons.IconSnow as unknown as LucideComponent, "IconSnow");
export const IconSort = createIcon(Icons.IconSort as unknown as LucideComponent, "IconSort");
export const IconSquare = createIcon(Icons.IconSquare as unknown as LucideComponent, "IconSquare");
export const IconSquareSmall = createIcon(Icons.IconSquareSmall as unknown as LucideComponent, "IconSquareSmall");
export const IconStar = createIcon(Icons.IconStar as unknown as LucideComponent, "IconStar");
export const IconSun = createIcon(Icons.IconSun as unknown as LucideComponent, "IconSun");
export const IconSunny = createIcon(Icons.IconSunny as unknown as LucideComponent, "IconSunny");
export const IconSunrise = createIcon(Icons.IconSunrise as unknown as LucideComponent, "IconSunrise");
export const IconSunset = createIcon(Icons.IconSunset as unknown as LucideComponent, "IconSunset");
export const IconSwitch = createIcon(Icons.IconSwitch as unknown as LucideComponent, "IconSwitch");
export const IconTag = createIcon(Icons.IconTag as unknown as LucideComponent, "IconTag");
export const IconTarget = createIcon(Icons.IconTarget as unknown as LucideComponent, "IconTarget");
export const IconTerminal = createIcon(Icons.IconTerminal as unknown as LucideComponent, "IconTerminal");
export const IconThermometer = createIcon(Icons.IconThermometer as unknown as LucideComponent, "IconThermometer");
export const IconThunderbolt = createIcon(Icons.IconThunderbolt as unknown as LucideComponent, "IconThunderbolt");
export const IconThunderstorm = createIcon(Icons.IconThunderstorm as unknown as LucideComponent, "IconThunderstorm");
export const IconTicket = createIcon(Icons.IconTicket as unknown as LucideComponent, "IconTicket");
export const IconTime = createIcon(Icons.IconTime as unknown as LucideComponent, "IconTime");
export const IconTimer = createIcon(Icons.IconTimer as unknown as LucideComponent, "IconTimer");
export const IconTool = createIcon(Icons.IconTool as unknown as LucideComponent, "IconTool");
export const IconTranslate = createIcon(Icons.IconTranslate as unknown as LucideComponent, "IconTranslate");
export const IconTree = createIcon(Icons.IconTree as unknown as LucideComponent, "IconTree");
export const IconTrendingDown = createIcon(Icons.IconTrendingDown as unknown as LucideComponent, "IconTrendingDown");
export const IconTrendingUp = createIcon(Icons.IconTrendingUp as unknown as LucideComponent, "IconTrendingUp");
export const IconTrophy = createIcon(Icons.IconTrophy as unknown as LucideComponent, "IconTrophy");
export const IconTwitter = createIcon(Icons.IconTwitter as unknown as LucideComponent, "IconTwitter");
export const IconUndo = createIcon(Icons.IconUndo as unknown as LucideComponent, "IconUndo");
export const IconUnlink = createIcon(Icons.IconUnlink as unknown as LucideComponent, "IconUnlink");
export const IconUnlock = createIcon(Icons.IconUnlock as unknown as LucideComponent, "IconUnlock");
export const IconUp = createIcon(Icons.IconUp as unknown as LucideComponent, "IconUp");
export const IconUpload = createIcon(Icons.IconUpload as unknown as LucideComponent, "IconUpload");
export const IconUser = createIcon(Icons.IconUser as unknown as LucideComponent, "IconUser");
export const IconVideo = createIcon(Icons.IconVideo as unknown as LucideComponent, "IconVideo");
export const IconVideoOne = createIcon(Icons.IconVideoOne as unknown as LucideComponent, "IconVideoOne");
export const IconVideocamera = createIcon(Icons.IconVideocamera as unknown as LucideComponent, "IconVideocamera");
export const IconVoiceOff = createIcon(Icons.IconVoiceOff as unknown as LucideComponent, "IconVoiceOff");
export const IconVolumeMute = createIcon(Icons.IconVolumeMute as unknown as LucideComponent, "IconVolumeMute");
export const IconVolumeNotice = createIcon(Icons.IconVolumeNotice as unknown as LucideComponent, "IconVolumeNotice");
export const IconVolumeOff = createIcon(Icons.IconVolumeOff as unknown as LucideComponent, "IconVolumeOff");
export const IconWallet = createIcon(Icons.IconWallet as unknown as LucideComponent, "IconWallet");
export const IconWand = createIcon(Icons.IconWand as unknown as LucideComponent, "IconWand");
export const IconWater = createIcon(Icons.IconWater as unknown as LucideComponent, "IconWater");
export const IconWaves = createIcon(Icons.IconWaves as unknown as LucideComponent, "IconWaves");
export const IconWifi = createIcon(Icons.IconWifi as unknown as LucideComponent, "IconWifi");
export const IconWind = createIcon(Icons.IconWind as unknown as LucideComponent, "IconWind");
export const IconZip = createIcon(Icons.IconZip as unknown as LucideComponent, "IconZip");
export const IconZoomIn = createIcon(Icons.IconZoomIn as unknown as LucideComponent, "IconZoomIn");
export const IconZoomOut = createIcon(Icons.IconZoomOut as unknown as LucideComponent, "IconZoomOut");
