/** Command 模式：一条编辑命令 = 一个对象 = 一个 undo 单元。 */
export interface Command {
  /** 校验并执行；失败抛 EditorError 且不改变任何状态。返回成功回显文案。 */
  execute(): string;
  /** 撤销本命令的全部效果；返回还原回显文案。 */
  undo(): string;
}
