'use strict';

/**
 * 构建期内置的联网搜索兜底凭据（Exa）。
 *
 * ⚠️ 默认留空是有意为之：Electron 的 asar 可以被解包，任何写进安装包的 key 都能被提取。
 * 正常链路是「桌面端启动 → 向授权服务器换取一台机器一把的 key」，见 lib/web-search.js。
 *
 * 这里只在**服务端暂时没配 key 池**、又必须保证联网搜索可用时，才填一把应急 key。
 * 一旦填了，就要按「会泄露」来对待：单独申请、单独限额、定期轮换。
 */
module.exports = {
  /** Exa API Key；留空表示不使用内置兜底 */
  exaKey: '',
  /** 内置 key 生效时的默认返回条数 */
  defaultCount: 8,
};
