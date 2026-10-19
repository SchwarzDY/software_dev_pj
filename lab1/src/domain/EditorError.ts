/** 领域层统一错误：message 即面向用户的错误正文；"error: " 前缀由 CLI 统一添加。 */
export class EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorError";
  }
}
