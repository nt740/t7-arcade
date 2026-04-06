import "./style.css";
import { ReferenceRoadLab } from "./referenceRoadLab";

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing Road Lab DOM node: ${selector}`);
  }
  return element;
};

const bindPanelToggle = (panelSelector: string, buttonSelector: string): void => {
  const panel = query<HTMLElement>(panelSelector);
  const button = query<HTMLButtonElement>(buttonSelector);
  button.addEventListener("click", () => {
    const collapsed = panel.dataset.collapsed === "true";
    panel.dataset.collapsed = collapsed ? "false" : "true";
    button.textContent = collapsed ? "Hide" : "Show";
    button.setAttribute("aria-expanded", collapsed ? "true" : "false");
  });
};

const app = query<HTMLElement>("#app");
const isUiInputTarget = (target: EventTarget | null): boolean => (
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable)
);

window.addEventListener("keydown", (event) => {
  if (isUiInputTarget(event.target)) {
    return;
  }
  if (event.key === "q" || event.key === "Q") {
    const hidden = app.dataset.debugUi === "hidden";
    app.dataset.debugUi = hidden ? "visible" : "hidden";
    event.preventDefault();
  }
});

const lab = new ReferenceRoadLab({
  canvas: query<HTMLCanvasElement>("#lab-canvas"),
  panels: {
    subhead: query<HTMLElement>("#debug-panel .subhead"),
    debugReadout: query<HTMLElement>("#debug-readout"),
    trackSelect: query<HTMLSelectElement>("#track-select"),
    recipeEditor: query<HTMLTextAreaElement>("#recipe-editor"),
    recipeApplyButton: query<HTMLButtonElement>("#recipe-apply-button"),
    recipeResetButton: query<HTMLButtonElement>("#recipe-reset-button"),
    recipeStatus: query<HTMLElement>("#recipe-status"),
    curveStrength: query<HTMLInputElement>("#curve-strength"),
    curveStrengthValue: query<HTMLElement>("#curve-strength-value"),
    pauseButton: query<HTMLButtonElement>("#pause-button"),
    stepButton: query<HTMLButtonElement>("#step-button"),
    resetButton: query<HTMLButtonElement>("#reset-button"),
    audioMusic: query<HTMLInputElement>("#audio-music"),
    audioMusicValue: query<HTMLElement>("#audio-music-value"),
    audioEngine: query<HTMLInputElement>("#audio-engine"),
    audioEngineValue: query<HTMLElement>("#audio-engine-value"),
    placementGroup: query<HTMLElement>("#placement-group"),
    placementSection: query<HTMLSelectElement>("#placement-section"),
    placementAsset: query<HTMLSelectElement>("#placement-asset"),
    placementSide: query<HTMLSelectElement>("#placement-side"),
    placementPosition: query<HTMLInputElement>("#placement-position"),
    placementPositionValue: query<HTMLElement>("#placement-position-value"),
    placementOffset: query<HTMLInputElement>("#placement-offset"),
    placementOffsetValue: query<HTMLElement>("#placement-offset-value"),
    placementScale: query<HTMLInputElement>("#placement-scale"),
    placementScaleValue: query<HTMLElement>("#placement-scale-value"),
    placementList: query<HTMLSelectElement>("#placement-list"),
    placementAddButton: query<HTMLButtonElement>("#placement-add-button"),
    placementUpdateButton: query<HTMLButtonElement>("#placement-update-button"),
    placementDeleteButton: query<HTMLButtonElement>("#placement-delete-button"),
    placementClearSectionButton: query<HTMLButtonElement>("#placement-clear-section-button"),
    placementStatus: query<HTMLElement>("#placement-status")
  },
  touch: {
    left: query<HTMLButtonElement>("#touch-left"),
    right: query<HTMLButtonElement>("#touch-right"),
    accel: query<HTMLButtonElement>("#touch-accel"),
    brake: query<HTMLButtonElement>("#touch-brake")
  },
  ui: {
    coinCounter: query<HTMLElement>("#coin-counter"),
    coinCount: query<HTMLElement>("#coin-count"),
    audioMuteButton: query<HTMLButtonElement>("#audio-mute-button"),
    splashOverlay: query<HTMLElement>("#splash-screen"),
    splashStartButton: query<HTMLButtonElement>("#splash-start-button"),
    introOverlay: query<HTMLElement>("#intro-overlay"),
    introStartButton: query<HTMLButtonElement>("#intro-start-button"),
    victoryOverlay: query<HTMLElement>("#victory-overlay"),
    victoryRestartButton: query<HTMLButtonElement>("#victory-restart-button")
  }
});

lab.start();

bindPanelToggle("#debug-panel", "#debug-panel-toggle");
bindPanelToggle("#legend", "#legend-panel-toggle");

window.addEventListener("beforeunload", () => {
  lab.destroy();
});
