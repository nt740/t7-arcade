import type { DebugSnapshot } from "../core/types/debug";

export interface HudMount {
  render(snapshot: DebugSnapshot): void;
}

export const mountHud = (target: HTMLElement): HudMount => ({
  render(snapshot: DebugSnapshot): void {
    target.textContent = snapshot.summaryLines.join("\n");
  }
});
