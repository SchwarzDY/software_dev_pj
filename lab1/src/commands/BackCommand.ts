import { Document } from "../domain/Document";
import { ZOrderCommand } from "./ZOrderCommand";

/** back <id>：调整 z-order，同级最后。 */
export class BackCommand extends ZOrderCommand {
  constructor(doc: Document, id: string) {
    super(doc, id);
  }

  protected toFront(): boolean {
    return false;
  }
}
