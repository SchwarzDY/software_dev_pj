import { Document } from "../domain/Document";
import { ZOrderCommand } from "./ZOrderCommand";

/** front <id>：调整 z-order，同级最前。 */
export class FrontCommand extends ZOrderCommand {
  constructor(doc: Document, id: string) {
    super(doc, id);
  }

  protected toFront(): boolean {
    return true;
  }
}
