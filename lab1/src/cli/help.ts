/** help 命令的全部命令与语法。 */
export function helpText(): string[] {
  return [
    "commands:",
    "  init [w] [h]                     新建空画布（默认 800x600）",
    "  read <file.svg>                  读入 SVG 文件为当前文档",
    "  save [file.svg]                  保存当前文档（无参数存回读入路径）",
    "  canvas [w] [h]                   无参数显示画布尺寸；带参数修改",
    "  create <type> <id> [params…] [in <cid>]",
    "                                   创建图形：rect/circle/ellipse/line/text/g",
    "  delete <id>                      删除图形（容器连同子孙）",
    "  move <id> <dx> <dy>              平移（增量）",
    "  scale <id> <factor>              等比缩放",
    "  set <id> <attr> <value>          设置属性（白名单见文档）",
    "  group <newGid> <id1> <id2>…      新建容器并收编图形",
    "  ungroup <gid>                    解散容器，子图形提升到父级",
    "  addto <gid> <id>                 把图形移入容器",
    "  front <id> / back <id>           调整 z-order（同级最前/最后）",
    "  tree [id]                        结构树（默认全文档）",
    "  show <id>                        单个图形的属性明细",
    "  undo / redo                      撤销 / 重做",
    "  quit / exit                      退出（Ctrl+D 亦可）",
  ];
}
