import { createInputState, type InputState } from "../core/types/input";

export interface TouchBindings {
  left: HTMLButtonElement;
  right: HTMLButtonElement;
  accel: HTMLButtonElement;
  brake: HTMLButtonElement;
}

const bindHoldButton = (
  button: HTMLButtonElement,
  onPress: () => void,
  onRelease: () => void
): Array<() => void> => {
  const start = (): void => onPress();
  const end = (): void => onRelease();
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);

  return [
    () => button.removeEventListener("pointerdown", start),
    () => button.removeEventListener("pointerup", end),
    () => button.removeEventListener("pointercancel", end),
    () => button.removeEventListener("pointerleave", end)
  ];
};

export class DebugInputModel {
  private readonly state: InputState = createInputState();
  private readonly disposers: Array<() => void> = [];

  constructor(touchBindings: TouchBindings) {
    const onKeyDown = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "a":
        case "ArrowLeft":
          this.state.steerAxis = -1;
          break;
        case "d":
        case "ArrowRight":
          this.state.steerAxis = 1;
          break;
        case "w":
        case "ArrowUp":
          this.state.throttlePressed = true;
          break;
        case "s":
        case "ArrowDown":
          this.state.brakePressed = true;
          break;
        case "r":
        case "R":
          this.state.resetRequested = true;
          break;
        case "p":
        case "P":
          this.state.pauseToggleRequested = true;
          break;
        case ".":
          this.state.frameStepRequested = true;
          break;
        default:
          if (["1", "2", "3", "4", "5"].includes(event.key)) {
            this.state.sectionJumpRequest = {
              sectionId: event.key,
              requestedAtMs: performance.now()
            };
          }
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "a":
        case "ArrowLeft":
          if (this.state.steerAxis < 0) {
            this.state.steerAxis = 0;
          }
          break;
        case "d":
        case "ArrowRight":
          if (this.state.steerAxis > 0) {
            this.state.steerAxis = 0;
          }
          break;
        case "w":
        case "ArrowUp":
          this.state.throttlePressed = false;
          break;
        case "s":
        case "ArrowDown":
          this.state.brakePressed = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    this.disposers.push(
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp)
    );

    this.disposers.push(
      ...bindHoldButton(touchBindings.left, () => {
        this.state.steerAxis = -1;
      }, () => {
        if (this.state.steerAxis < 0) {
          this.state.steerAxis = 0;
        }
      }),
      ...bindHoldButton(touchBindings.right, () => {
        this.state.steerAxis = 1;
      }, () => {
        if (this.state.steerAxis > 0) {
          this.state.steerAxis = 0;
        }
      }),
      ...bindHoldButton(touchBindings.accel, () => {
        this.state.throttlePressed = true;
      }, () => {
        this.state.throttlePressed = false;
      }),
      ...bindHoldButton(touchBindings.brake, () => {
        this.state.brakePressed = true;
      }, () => {
        this.state.brakePressed = false;
      })
    );
  }

  public getState(): InputState {
    return this.state;
  }

  public consumeTransientFlags(): void {
    this.state.resetRequested = false;
    this.state.frameStepRequested = false;
    this.state.pauseToggleRequested = false;
    this.state.sectionJumpRequest = null;
  }

  public destroy(): void {
    for (const dispose of this.disposers) {
      dispose();
    }
  }
}
