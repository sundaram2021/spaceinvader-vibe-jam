import "./style.css";
import * as THREE from "three";

type GamePhase = "menu" | "playing" | "paused" | "levelClear" | "gameOver" | "victory";
type MenuStep = "pilot" | "ship";
type ProjectileOwner = "player" | "enemy";
type PowerUpKind = "repair" | "overdrive" | "score" | "shield";
type EnemyKind = "scout" | "gunner" | "charger" | "miniBoss" | "boss";
type DamageCause = "alienShot" | "alienCollision" | "asteroid" | "sectorBreach";

interface ShipConfig {
  id: string;
  name: string;
  tagline: string;
  color: string;
  accent: string;
  speed: number;
  armor: number;
  fireRate: number;
  bulletDamage: number;
  spread: number;
  special: string;
  dashPower: number;
}

interface PilotPersonality {
  id: string;
  name: string;
  role: string;
  color: string;
  introLines: string[];
  quips: string[];
  lowHealth: string[];
  levelClear: string[];
  death: string[];
  specialLines: string[];
}

interface EnvironmentConfig {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  fog: string;
  star: string;
  enemyTint: string;
  asteroidRate: number;
  asteroidSpeed: number;
  drift: number;
  enemySpeedMod: number;
  hazardText: string;
}

interface LevelDefinition {
  index: number;
  name: string;
  duration: number;
  rows: number;
  cols: number;
  enemyHp: number;
  enemySpeed: number;
  enemyFireRate: number;
  asteroidRateMod: number;
  rearAttackRate: number;
  waveDelay: number;
  miniBoss?: boolean;
  boss?: boolean;
  intro: string;
  reward: number;
}

interface Entity {
  id: number;
  group: THREE.Group;
  radius: number;
  hp: number;
  maxHp: number;
  velocity: THREE.Vector3;
}

interface EnemyEntity extends Entity {
  kind: EnemyKind;
  baseX: number;
  baseY: number;
  phase: number;
  amplitude: number;
  fireCooldown: number;
  attackMode: "formation" | "dive" | "retreat" | "ambush";
  diveTarget: number;
  scoreValue: number;
}

interface Projectile {
  id: number;
  mesh: THREE.Mesh;
  owner: ProjectileOwner;
  radius: number;
  damage: number;
  velocity: THREE.Vector3;
  life: number;
  piercing: boolean;
}

interface Asteroid {
  id: number;
  mesh: THREE.Mesh;
  radius: number;
  hp: number;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  scoreValue: number;
}

interface PowerUp {
  id: number;
  group: THREE.Group;
  kind: PowerUpKind;
  radius: number;
  velocity: THREE.Vector3;
  life: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: THREE.Vector3;
}

interface ScoreState {
  score: number;
  best: number;
  combo: number;
  kills: number;
  level: number;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface HudSnapshot {
  score: number;
  best: number;
  combo: number;
  kills: number;
  level: number;
  levelName: string;
  timeLeft: number;
  progressPct: number;
  environment: string;
  shipName: string;
  health: number;
  maxHealth: number;
  hitsTaken: number;
  maxAlienHits: number;
  specialPct: number;
  quip: string;
  phaseText: string;
}

const LEVEL_DURATION_SECONDS = 7 * 60;
const MAX_ALIEN_HITS = 10;

const SHIPS: ShipConfig[] = [
  {
    id: "interceptor",
    name: "Interceptor",
    tagline: "Needle-fast assault frame with a brutal fire cadence.",
    color: "#42f8c8",
    accent: "#ffe66b",
    speed: 8.4,
    armor: 5,
    fireRate: 0.13,
    bulletDamage: 1,
    spread: 1,
    special: "Overdrive",
    dashPower: 3.4,
  },
  {
    id: "bulwark",
    name: "Bulwark",
    tagline: "Heavy guardian hull that turns mistakes into survivable stories.",
    color: "#7aa8ff",
    accent: "#ffef9e",
    speed: 5.7,
    armor: 9,
    fireRate: 0.2,
    bulletDamage: 1.25,
    spread: 1,
    special: "Aegis Pulse",
    dashPower: 2,
  },
  {
    id: "phantom",
    name: "Phantom",
    tagline: "Blink drive skirmisher with sharp angles and sharper escapes.",
    color: "#c084fc",
    accent: "#6fffe9",
    speed: 7.4,
    armor: 6,
    fireRate: 0.18,
    bulletDamage: 1,
    spread: 2,
    special: "Phase Dash",
    dashPower: 5.2,
  },
  {
    id: "nova",
    name: "Nova",
    tagline: "Balanced prototype with a satisfying fan of plasma.",
    color: "#ff7a90",
    accent: "#42f8c8",
    speed: 6.7,
    armor: 7,
    fireRate: 0.22,
    bulletDamage: 1.15,
    spread: 3,
    special: "Starburst",
    dashPower: 2.8,
  },
];

const PILOTS: PilotPersonality[] = [
  {
    id: "tactician",
    name: "Vera Sync",
    role: "Calm tactical",
    color: "#42f8c8",
    introLines: [
      "Vectors aligned. We enter clean and leave louder.",
      "Telemetry is stable. Make every shot useful.",
      "I am plotting their formation gaps now.",
    ],
    quips: [
      "Enemy lanes are opening. Slide through the quiet parts.",
      "Asteroids inbound. Treat them like moving cover.",
      "Combo window active. Keep pressure on the center mass.",
      "Their firing rhythm is predictable. Yours does not need to be.",
    ],
    lowHealth: [
      "Hull integrity is thin. Prioritize survival.",
      "We are one bad angle from vacuum. Breathe, then move.",
    ],
    levelClear: [
      "Wave erased. Good discipline.",
      "The sector is ours for about three seconds. Useful.",
    ],
    death: ["Mission log sealed. Next run, fewer heroic pauses."],
    specialLines: ["Special system online. Spend it cleanly."],
  },
  {
    id: "ace",
    name: "Jax Sol",
    role: "Sarcastic ace",
    color: "#ffe66b",
    introLines: [
      "Great, another sky full of things with terrible manners.",
      "If it glows, shoot it. If it screams, shoot it again.",
      "I packed confidence and exactly no spare oxygen.",
    ],
    quips: [
      "That alien formation is begging for a strongly worded laser.",
      "Asteroids. Nature's least helpful furniture.",
      "You are doing great, assuming the plan was chaos.",
      "More hostiles? Fantastic. I was afraid we would relax.",
    ],
    lowHealth: [
      "Hull is smoking. Stylish, but not ideal.",
      "We are leaking expensive pieces.",
    ],
    levelClear: [
      "Sector cleared. I will accept applause in cash.",
      "Nobody panic. I made that look planned.",
    ],
    death: ["Well, the ship is now modern art."],
    specialLines: ["Special ready. Time to be irresponsible with style."],
  },
  {
    id: "commander",
    name: "Mara Vale",
    role: "Heroic commander",
    color: "#7aa8ff",
    introLines: [
      "Armada, hold the line. We are the shield today.",
      "Every star behind us has someone worth defending.",
      "Forward, pilot. Let them learn what resolve looks like.",
    ],
    quips: [
      "Stand firm. Break their advance.",
      "Good hit. Keep the lane clean for the colonies.",
      "Their pressure is rising. So is ours.",
      "We do not surrender a sky we can still fight for.",
    ],
    lowHealth: [
      "The hull is wounded, not beaten.",
      "Damage is severe. Courage is still operational.",
    ],
    levelClear: [
      "Wave defeated. The line holds.",
      "Excellent work. The fleet breathes easier.",
    ],
    death: ["Remember this fight. Then improve it."],
    specialLines: ["Special charged. Strike like a signal fire."],
  },
  {
    id: "speedrunner",
    name: "Zip Nyx",
    role: "Chaotic speedrunner",
    color: "#ff7a90",
    introLines: [
      "Timer starts when the universe blinks.",
      "No slow routes, no safe routes, only clean routes.",
      "I saw the future. It had a very large score number.",
    ],
    quips: [
      "Route update: everything explodes faster now.",
      "Dodge left. Or right. Honestly, pick a lane with confidence.",
      "Combo is warm. Feed it.",
      "That asteroid pattern is rude but farmable.",
    ],
    lowHealth: [
      "One HP strats. Totally intentional.",
      "Red hull, high focus. Classic.",
    ],
    levelClear: [
      "Gold split. Absolutely real.",
      "Clean enough. Next sector, less blinking.",
    ],
    death: ["Reset. Blame lag. Even offline."],
    specialLines: ["Special ready. Send the timeline sideways."],
  },
];

const ENVIRONMENTS: EnvironmentConfig[] = [
  {
    id: "orbit",
    name: "Orbit Debris Field",
    description: "Blue planetlight, broken stations, predictable drift.",
    primary: "#42f8c8",
    secondary: "#7aa8ff",
    fog: "#071120",
    star: "#d9f8ff",
    enemyTint: "#9cf7ff",
    asteroidRate: 0.42,
    asteroidSpeed: 1,
    drift: 0.35,
    enemySpeedMod: 1,
    hazardText: "Debris sweeps in broad lanes.",
  },
  {
    id: "nebula",
    name: "Red Nebula",
    description: "Ion mist, hot colors, aggressive alien fire.",
    primary: "#ff4f6d",
    secondary: "#ffe66b",
    fog: "#190711",
    star: "#ffd6dc",
    enemyTint: "#ff9ab0",
    asteroidRate: 0.35,
    asteroidSpeed: 1.08,
    drift: 0.5,
    enemySpeedMod: 1.12,
    hazardText: "Enemy weapons charge faster in the mist.",
  },
  {
    id: "ice",
    name: "Ice Belt",
    description: "Cold shards, pale light, faster stonefall.",
    primary: "#9cf7ff",
    secondary: "#e8f6ff",
    fog: "#06141a",
    star: "#f3fbff",
    enemyTint: "#c9f6ff",
    asteroidRate: 0.62,
    asteroidSpeed: 1.22,
    drift: 0.72,
    enemySpeedMod: 0.94,
    hazardText: "Ice fragments arrive often and slide sideways.",
  },
  {
    id: "hive",
    name: "Alien Hive Sector",
    description: "Living lattice, toxic glow, dense enemy swarms.",
    primary: "#a3ff52",
    secondary: "#ff7a90",
    fog: "#071608",
    star: "#d8ffb0",
    enemyTint: "#a3ff52",
    asteroidRate: 0.48,
    asteroidSpeed: 1.04,
    drift: 0.44,
    enemySpeedMod: 1.2,
    hazardText: "Hive craft move as a faster swarm.",
  },
  {
    id: "rim",
    name: "Black-Hole Rim",
    description: "Bent starlight, violent arcs, unstable gravity.",
    primary: "#c084fc",
    secondary: "#42f8c8",
    fog: "#080613",
    star: "#efe6ff",
    enemyTint: "#d2b4ff",
    asteroidRate: 0.54,
    asteroidSpeed: 1.15,
    drift: 1.02,
    enemySpeedMod: 1.08,
    hazardText: "Gravity bends hazards across the screen.",
  },
];

const LEVELS: LevelDefinition[] = [
  {
    index: 1,
    name: "Training Orbit",
    duration: LEVEL_DURATION_SECONDS,
    rows: 3,
    cols: 6,
    enemyHp: 1,
    enemySpeed: 0.82,
    enemyFireRate: 0.09,
    asteroidRateMod: 0.72,
    rearAttackRate: 0.035,
    waveDelay: 2.8,
    intro: "The scout screen is waking up.",
    reward: 1200,
  },
  {
    index: 2,
    name: "Raider Belt",
    duration: LEVEL_DURATION_SECONDS,
    rows: 4,
    cols: 7,
    enemyHp: 1.25,
    enemySpeed: 1.05,
    enemyFireRate: 0.14,
    asteroidRateMod: 1.05,
    rearAttackRate: 0.055,
    waveDelay: 2.4,
    intro: "Asteroid density rises and raiders begin flanking from behind.",
    reward: 1800,
  },
  {
    index: 3,
    name: "Crossfire Nebula",
    duration: LEVEL_DURATION_SECONDS,
    rows: 4,
    cols: 8,
    enemyHp: 1.55,
    enemySpeed: 1.28,
    enemyFireRate: 0.2,
    asteroidRateMod: 1.28,
    rearAttackRate: 0.075,
    waveDelay: 2,
    miniBoss: true,
    intro: "Gunners coordinate crossfire while rocks fall in tighter lanes.",
    reward: 2600,
  },
  {
    index: 4,
    name: "Hive Rush",
    duration: LEVEL_DURATION_SECONDS,
    rows: 5,
    cols: 9,
    enemyHp: 1.85,
    enemySpeed: 1.52,
    enemyFireRate: 0.28,
    asteroidRateMod: 1.55,
    rearAttackRate: 0.105,
    waveDelay: 1.65,
    miniBoss: true,
    intro: "The hive floods the sector with fast ships and near-constant hazards.",
    reward: 3800,
  },
  {
    index: 5,
    name: "Command Storm",
    duration: LEVEL_DURATION_SECONDS,
    rows: 3,
    cols: 8,
    enemyHp: 2.35,
    enemySpeed: 1.82,
    enemyFireRate: 0.38,
    asteroidRateMod: 1.82,
    rearAttackRate: 0.135,
    waveDelay: 1.35,
    boss: true,
    intro: "The command ship owns the edge of the map.",
    reward: 6000,
  },
];

const STORAGE_KEYS = {
  best: "starfall-armada-best",
  ship: "starfall-armada-ship",
  pilot: "starfall-armada-pilot",
  env: "starfall-armada-env",
  controlsSeen: "starfall-armada-controls-seen",
};

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
let nextId = 1;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readNumberStorage(key: string, fallback: number): number {
  const value = Number(readStorage(key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function writeStorage(key: string, value: string | number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Local storage can be unavailable in private or embedded contexts.
  }
}

function byId<T extends { id: string }>(items: T[], id: string | null): T {
  return items.find((item) => item.id === id) ?? items[0];
}

function makeMaterial(color: string, emissive = color, intensity = 0.75): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    metalness: 0.2,
    roughness: 0.42,
  });
}

function worldDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

class AudioSystem {
  private context?: AudioContext;

  unlock(): void {
    if (!this.context) {
      const AudioCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        return;
      }
      this.context = new AudioCtor();
    }

    void this.context.resume();
  }

  tone(frequency: number, duration: number, type: OscillatorType, gain = 0.035, bend = 1): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * bend), ctx.currentTime + duration);
    volume.gain.setValueAtTime(gain, ctx.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(volume);
    volume.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  shoot(): void {
    this.tone(820, 0.045, "triangle", 0.022, 1.45);
  }

  enemyShoot(): void {
    this.tone(170, 0.08, "sawtooth", 0.014, 0.7);
  }

  hit(): void {
    this.tone(90, 0.12, "square", 0.045, 0.55);
  }

  explosion(): void {
    this.tone(64, 0.22, "sawtooth", 0.06, 0.35);
  }

  powerUp(): void {
    this.tone(520, 0.14, "sine", 0.04, 1.9);
  }

  level(): void {
    this.tone(320, 0.18, "triangle", 0.04, 1.7);
    window.setTimeout(() => this.tone(520, 0.18, "triangle", 0.035, 1.45), 90);
  }
}

class InputSystem {
  private keys = new Set<string>();
  pointerActive = false;
  pointerFiring = false;
  pointerX = 0;
  specialQueued = false;
  onPause?: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "ShiftLeft", "ShiftRight"].includes(event.code)) {
        event.preventDefault();
      }

      if (event.code === "KeyP" || event.code === "Escape") {
        this.onPause?.();
        return;
      }

      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        this.specialQueued = true;
      }

      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    canvas.addEventListener("pointerdown", (event) => {
      this.pointerActive = true;
      this.pointerFiring = true;
      this.pointerX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (this.pointerActive) {
        this.pointerX = event.clientX;
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      this.pointerActive = false;
      this.pointerFiring = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("pointercancel", () => {
      this.pointerActive = false;
      this.pointerFiring = false;
    });
  }

  axis(): number {
    const left = this.keys.has("ArrowLeft") || this.keys.has("KeyA");
    const right = this.keys.has("ArrowRight") || this.keys.has("KeyD");
    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  verticalAxis(): number {
    const up = this.keys.has("ArrowUp") || this.keys.has("KeyW");
    const down = this.keys.has("ArrowDown") || this.keys.has("KeyS");
    return (up ? 1 : 0) - (down ? 1 : 0);
  }

  wantsFire(): boolean {
    return this.keys.has("Space") || this.pointerFiring;
  }

  consumeSpecial(): boolean {
    const queued = this.specialQueued;
    this.specialQueued = false;
    return queued;
  }

  resetTransient(): void {
    this.pointerFiring = false;
    this.specialQueued = false;
  }
}

class UIOverlay {
  selectedShip = byId(SHIPS, readStorage(STORAGE_KEYS.ship, SHIPS[0].id));
  selectedPilot = byId(PILOTS, readStorage(STORAGE_KEYS.pilot, PILOTS[0].id));
  selectedEnvironment = byId(ENVIRONMENTS, readStorage(STORAGE_KEYS.env, ENVIRONMENTS[0].id));
  onStart?: (ship: ShipConfig, pilot: PilotPersonality, environment: EnvironmentConfig) => void;
  onRestart?: () => void;
  onMenu?: () => void;
  onResume?: () => void;
  onSpecial?: () => void;

  private messageNode?: HTMLElement;
  private scoreNode?: HTMLElement;
  private bestNode?: HTMLElement;
  private comboNode?: HTMLElement;
  private killsNode?: HTMLElement;
  private timerNode?: HTMLElement;
  private progressFill?: HTMLElement;
  private levelNode?: HTMLElement;
  private phaseNode?: HTMLElement;
  private environmentNode?: HTMLElement;
  private healthFill?: HTMLElement;
  private healthText?: HTMLElement;
  private specialFill?: HTMLElement;
  private specialText?: HTMLElement;
  private quipNode?: HTMLElement;
  private menuStep: MenuStep = "pilot";

  constructor(private root: HTMLElement) {}

  renderMenu(best: number): void {
    const isPilotStep = this.menuStep === "pilot";
    this.root.innerHTML = `
      <section class="overlay onboarding-overlay">
        <div class="menu loadout-modal">
          <div class="modal-chrome">
            <div>
              <p class="kicker">Starfall Armada</p>
              <h1>${isPilotStep ? "Choose Your Avatar" : "Choose Your Spaceship"}</h1>
              <p class="lead">${isPilotStep ? "Pick the pilot identity you want in the cockpit." : "Select the ship that matches your fighting style."}</p>
            </div>
            <div class="modal-status">
              <span class="score-chip">Best ${best.toLocaleString()}</span>
              <span class="step-dot ${isPilotStep ? "active" : "done"}">1</span>
              <span class="step-line"></span>
              <span class="step-dot ${isPilotStep ? "" : "active"}">2</span>
            </div>
          </div>

          <div class="selector-grid cinematic-selector">
            <div class="stage-body">${isPilotStep ? this.renderPilotChoices() : this.renderShipChoices()}</div>
            ${this.renderStageActions()}
          </div>
        </div>
      </section>
    `;

    this.root.querySelectorAll<HTMLButtonElement>("[data-ship]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedShip = byId(SHIPS, button.dataset.ship ?? null);
        this.persistSelections();
        this.renderMenu(best);
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-pilot]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedPilot = byId(PILOTS, button.dataset.pilot ?? null);
        this.menuStep = "ship";
        this.persistSelections();
        this.renderMenu(best);
      });
    });
    this.root.querySelector<HTMLButtonElement>("[data-randomize]")?.addEventListener("click", () => {
      this.selectedShip = pick(SHIPS);
      this.selectedPilot = pick(PILOTS);
      this.selectedEnvironment = pick(ENVIRONMENTS);
      this.menuStep = "ship";
      this.persistSelections();
      this.renderMenu(best);
    });
    this.root.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => {
      this.menuStep = "pilot";
      this.renderMenu(best);
    });
    this.root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => {
      this.menuStep = "ship";
      this.renderMenu(best);
    });
    this.root.querySelector<HTMLButtonElement>("[data-start]")?.addEventListener("click", () => {
      this.persistSelections();
      this.onStart?.(this.selectedShip, this.selectedPilot, this.selectedEnvironment);
    });
  }

  renderPlaying(snapshot: HudSnapshot, showControlsCoachmark = false): void {
    this.root.innerHTML = `
      <section class="hud">
        <div class="hud-panel">
          <div class="stat">
            <span class="label">Score</span>
            <span class="value" data-score>0</span>
          </div>
          <div class="stat">
            <span class="label">Best</span>
            <span class="value" data-best>0</span>
          </div>
          <div class="stat">
            <span class="label">Combo</span>
            <span class="value" data-combo>x1</span>
          </div>
          <div class="stat">
            <span class="label">Timer</span>
            <span class="value" data-timer>--</span>
          </div>
        </div>
        <div class="hud-center">
          <div class="mission-tag" data-level>Level</div>
          <span class="progress-shell"><span class="progress-fill" data-progress-fill></span></span>
          <div class="quip" data-quip></div>
        </div>
        <div class="hud-panel hud-right">
          <div class="stat">
            <span class="label">Hull</span>
            <span class="value" data-health-text>0/0</span>
            <span class="bar-shell"><span class="bar-fill" data-health-fill></span></span>
          </div>
          <div class="stat">
            <span class="label">Special</span>
            <span class="value" data-special-text>0%</span>
            <span class="bar-shell"><span class="bar-fill" data-special-fill></span></span>
          </div>
          <div class="stat">
            <span class="label">Kills</span>
            <span class="value" data-kills>0</span>
          </div>
          <div class="stat">
            <span class="label">Sector</span>
            <span class="value" data-environment></span>
          </div>
        </div>
      </section>
      <div class="status-pill game-message" data-phase></div>
      <div class="mobile-controls">
        <button class="mobile-special" data-special type="button">Special</button>
      </div>
      ${showControlsCoachmark ? this.renderControlsCoachmark() : ""}
    `;

    this.scoreNode = this.root.querySelector("[data-score]") ?? undefined;
    this.bestNode = this.root.querySelector("[data-best]") ?? undefined;
    this.comboNode = this.root.querySelector("[data-combo]") ?? undefined;
    this.killsNode = this.root.querySelector("[data-kills]") ?? undefined;
    this.timerNode = this.root.querySelector("[data-timer]") ?? undefined;
    this.progressFill = this.root.querySelector("[data-progress-fill]") ?? undefined;
    this.levelNode = this.root.querySelector("[data-level]") ?? undefined;
    this.phaseNode = this.root.querySelector("[data-phase]") ?? undefined;
    this.environmentNode = this.root.querySelector("[data-environment]") ?? undefined;
    this.healthFill = this.root.querySelector("[data-health-fill]") ?? undefined;
    this.healthText = this.root.querySelector("[data-health-text]") ?? undefined;
    this.specialFill = this.root.querySelector("[data-special-fill]") ?? undefined;
    this.specialText = this.root.querySelector("[data-special-text]") ?? undefined;
    this.quipNode = this.root.querySelector("[data-quip]") ?? undefined;
    this.messageNode = this.phaseNode;
    this.root.querySelector<HTMLButtonElement>("[data-special]")?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.onSpecial?.();
    });
    this.updateHUD(snapshot);
  }

  renderPaused(snapshot: HudSnapshot): void {
    this.renderPlaying(snapshot);
    this.root.insertAdjacentHTML(
      "beforeend",
      `
        <section class="overlay">
          <div class="summary-card">
            <p class="kicker">Paused</p>
            <h2>Hold Position</h2>
            <p class="lead">Score ${snapshot.score.toLocaleString()} in ${snapshot.levelName}.</p>
            <div class="actions">
              <button class="secondary" data-menu type="button">Menu</button>
              <button class="secondary" data-restart type="button">Restart</button>
              <button class="primary" data-resume type="button">Resume</button>
            </div>
          </div>
        </section>
      `,
    );
    this.root.querySelector<HTMLButtonElement>("[data-resume]")?.addEventListener("click", () => this.onResume?.());
    this.root.querySelector<HTMLButtonElement>("[data-restart]")?.addEventListener("click", () => this.onRestart?.());
    this.root.querySelector<HTMLButtonElement>("[data-menu]")?.addEventListener("click", () => this.onMenu?.());
  }

  renderSummary(snapshot: HudSnapshot, won: boolean): void {
    const title = won ? "Armada Broken" : "Signal Lost";
    const copy = won
      ? "The mothership is gone. Your route is now official space folklore."
      : "The signal faded, but the next launch is ready.";
    this.root.innerHTML = `
      <section class="overlay">
        <div class="summary-card">
          <p class="kicker">${won ? "Victory" : "Run complete"}</p>
          <h2>${title}</h2>
          <p class="lead">${copy}</p>
          <div class="summary-stats">
            <div class="summary-stat">
              <span class="label">Score</span>
              <span class="value">${snapshot.score.toLocaleString()}</span>
            </div>
            <div class="summary-stat">
              <span class="label">Best</span>
              <span class="value">${snapshot.best.toLocaleString()}</span>
            </div>
            <div class="summary-stat">
              <span class="label">Kills</span>
              <span class="value">${snapshot.kills}</span>
            </div>
          </div>
          <p class="lead">${snapshot.quip}</p>
          <div class="actions">
            <button class="secondary" data-menu type="button">Change Loadout</button>
            <button class="primary" data-restart type="button">Run It Back</button>
          </div>
        </div>
      </section>
    `;
    this.root.querySelector<HTMLButtonElement>("[data-restart]")?.addEventListener("click", () => this.onRestart?.());
    this.root.querySelector<HTMLButtonElement>("[data-menu]")?.addEventListener("click", () => this.onMenu?.());
  }

  updateHUD(snapshot: HudSnapshot): void {
    if (this.scoreNode) this.scoreNode.textContent = snapshot.score.toLocaleString();
    if (this.bestNode) this.bestNode.textContent = snapshot.best.toLocaleString();
    if (this.comboNode) this.comboNode.textContent = `x${snapshot.combo}`;
    if (this.killsNode) this.killsNode.textContent = String(snapshot.kills);
    if (this.timerNode) this.timerNode.textContent = formatTime(snapshot.timeLeft);
    if (this.progressFill) this.progressFill.style.width = `${Math.round(snapshot.progressPct * 100)}%`;
    if (this.levelNode) this.levelNode.textContent = `L${snapshot.level} ${snapshot.levelName}`;
    if (this.phaseNode) this.phaseNode.textContent = snapshot.phaseText;
    if (this.environmentNode) this.environmentNode.textContent = snapshot.environment;
    const hullRatio = clamp(1 - snapshot.hitsTaken / snapshot.maxAlienHits, 0, 1);
    if (this.healthText) this.healthText.textContent = `${Math.round(hullRatio * 100)}%`;
    if (this.healthFill) {
      this.healthFill.style.width = `${Math.round(hullRatio * 100)}%`;
      this.healthFill.classList.toggle("low", hullRatio < 0.34);
    }
    if (this.specialText) this.specialText.textContent = `${Math.round(snapshot.specialPct * 100)}%`;
    if (this.specialFill) this.specialFill.style.width = `${Math.round(snapshot.specialPct * 100)}%`;
    if (this.quipNode) this.quipNode.textContent = snapshot.quip;
  }

  showMessage(message: string): void {
    if (this.messageNode) {
      this.messageNode.textContent = message;
    }
  }

  private renderStageActions(): string {
    const backButton = this.menuStep === "ship" ? `<button class="secondary" data-back type="button">Back</button>` : "";
    const mainButton =
      this.menuStep === "ship"
        ? `<button class="primary" data-start type="button">Start Game</button>`
        : `<button class="primary" data-next type="button">Next</button>`;

    return `
      <div class="actions stage-actions">
        <button class="secondary" data-randomize type="button">Surprise Me</button>
        <div class="action-cluster">
          ${backButton}
          ${mainButton}
        </div>
      </div>
    `;
  }

  private renderControlsCoachmark(): string {
    return `
      <div class="control-coachmark" aria-live="polite">
        <div class="control-coachmark-title">Flight controls</div>
        <div class="control-keys">
          <div class="control-card left">
            <span class="keycap">&larr;</span>
            <span>Move Left</span>
          </div>
          <div class="control-card right">
            <span class="keycap">&rarr;</span>
            <span>Move Right</span>
          </div>
          <div class="control-card fire">
            <span class="keycap spacebar">Space</span>
            <span>Shoot</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderPilotChoices(): string {
    return `
      <div class="choice-grid avatar-grid">
        ${PILOTS.map((pilot) => this.renderPilotCard(pilot)).join("")}
      </div>
    `;
  }

  private renderShipChoices(): string {
    return `
      <div class="ship-step">
        <div class="pilot-lock" style="--avatar:${this.selectedPilot.color}">
          ${this.renderPilotPortrait(this.selectedPilot, true)}
          <div>
            <span class="label">Pilot locked</span>
            <strong>${this.selectedPilot.name}</strong>
          </div>
        </div>
        <div class="choice-grid ship-grid">
          ${SHIPS.map((ship) => this.renderShipCard(ship)).join("")}
        </div>
      </div>
    `;
  }

  private renderPilotCard(pilot: PilotPersonality): string {
    const selected = pilot.id === this.selectedPilot.id ? "selected" : "";
    return `
      <button class="choice-card avatar-card ${selected}" data-pilot="${pilot.id}" type="button" style="--avatar:${pilot.color}">
        ${this.renderPilotPortrait(pilot)}
        <span class="choice-copy">
          <span class="choice-title">${pilot.name}</span>
          <span class="choice-subtitle">${pilot.role}</span>
          <span class="choice-line">${pilot.introLines[0]}</span>
        </span>
      </button>
    `;
  }

  private renderPilotPortrait(pilot: PilotPersonality, compact = false): string {
    const initials = pilot.name
      .split(" ")
      .map((part) => part[0])
      .join("");

    return `
      <span class="pilot-portrait pilot-${pilot.id} ${compact ? "compact" : ""}" aria-hidden="true">
        <span class="pilot-glow"></span>
        <span class="pilot-shoulders"></span>
        <span class="pilot-helmet">
          <span class="pilot-visor"></span>
          <span class="pilot-face">${initials}</span>
        </span>
      </span>
    `;
  }

  private renderShipCard(ship: ShipConfig): string {
    const selected = ship.id === this.selectedShip.id ? "selected" : "";
    return `
      <button class="choice-card ship-card ${selected}" data-ship="${ship.id}" type="button" style="--ship:${ship.color}; --ship-accent:${ship.accent}">
        ${this.renderShipVisual(ship)}
        <span class="choice-copy">
          <span class="choice-title">${ship.name}</span>
          <span class="choice-subtitle">${ship.tagline}</span>
          <span class="ship-stat-row">
            <span>Speed ${ship.speed.toFixed(1)}</span>
            <span>Fire ${ship.spread}x</span>
            <span>${ship.special}</span>
          </span>
        </span>
      </button>
    `;
  }

  private renderShipVisual(ship: ShipConfig): string {
    return `
      <span class="ship-display ship-${ship.id}" aria-hidden="true">
        <span class="ship-rail"></span>
        <span class="ship-model">
          <span class="ship-wing ship-wing-left"></span>
          <span class="ship-wing ship-wing-right"></span>
          <span class="ship-core"></span>
          <span class="ship-nose"></span>
          <span class="ship-cockpit"></span>
          <span class="ship-engine ship-engine-left"></span>
          <span class="ship-engine ship-engine-right"></span>
        </span>
      </span>
    `;
  }

  private persistSelections(): void {
    writeStorage(STORAGE_KEYS.ship, this.selectedShip.id);
    writeStorage(STORAGE_KEYS.pilot, this.selectedPilot.id);
    writeStorage(STORAGE_KEYS.env, this.selectedEnvironment.id);
  }
}

class BackgroundSystem {
  group = new THREE.Group();
  private stars?: THREE.Points;
  private starPositions?: Float32Array;
  private bands: THREE.Mesh[] = [];
  private speed = 0.35;

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.group);
  }

  applyEnvironment(environment: EnvironmentConfig, bounds: Bounds): void {
    this.group.clear();
    this.bands.forEach((band) => disposeObject(band));
    this.bands = [];

    const count = 520;
    this.starPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const starColor = new THREE.Color(environment.star);
    const secondary = new THREE.Color(environment.secondary);
    for (let i = 0; i < count; i += 1) {
      const index = i * 3;
      this.starPositions[index] = rand(bounds.left * 1.2, bounds.right * 1.2);
      this.starPositions[index + 1] = rand(bounds.bottom * 1.4, bounds.top * 1.4);
      this.starPositions[index + 2] = rand(-5, -1.5);
      const blend = Math.random() * 0.55;
      const color = starColor.clone().lerp(secondary, blend);
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.starPositions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geometry, material);
    this.group.add(this.stars);

    const primary = new THREE.Color(environment.primary);
    const bandGeometry = new THREE.PlaneGeometry(28, 1);
    for (let i = 0; i < 7; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: primary.clone().lerp(new THREE.Color(environment.secondary), i / 7),
        transparent: true,
        opacity: 0.055 + i * 0.008,
        depthWrite: false,
      });
      const band = new THREE.Mesh(bandGeometry.clone(), material);
      band.position.set(rand(bounds.left, bounds.right), rand(bounds.bottom, bounds.top), -4.5 - i * 0.05);
      band.rotation.z = rand(-0.45, 0.45);
      band.scale.set(rand(0.9, 1.8), rand(0.8, 2.1), 1);
      this.bands.push(band);
      this.group.add(band);
    }

    this.speed = 0.22 + environment.asteroidSpeed * 0.22;
  }

  update(dt: number, bounds: Bounds): void {
    if (this.starPositions && this.stars) {
      for (let i = 0; i < this.starPositions.length; i += 3) {
        this.starPositions[i + 1] -= dt * this.speed * (1 + Math.abs(this.starPositions[i + 2]) * 0.2);
        if (this.starPositions[i + 1] < bounds.bottom * 1.45) {
          this.starPositions[i] = rand(bounds.left * 1.2, bounds.right * 1.2);
          this.starPositions[i + 1] = bounds.top * 1.45;
        }
      }
      this.stars.geometry.attributes.position.needsUpdate = true;
    }

    this.bands.forEach((band, index) => {
      band.position.y -= dt * (0.03 + index * 0.012);
      if (band.position.y < bounds.bottom - 3) {
        band.position.y = bounds.top + 3;
        band.position.x = rand(bounds.left, bounds.right);
      }
    });
  }
}

class ParticleSystem {
  particles: Particle[] = [];
  private sphere = new THREE.SphereGeometry(0.055, 8, 8);

  constructor(private scene: THREE.Scene) {}

  burst(position: THREE.Vector3, color: string, count = 14, force = 2.2): void {
    for (let i = 0; i < count; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sphere.clone(), material);
      mesh.position.copy(position);
      const angle = rand(0, Math.PI * 2);
      const speed = rand(force * 0.35, force);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, rand(-0.2, 0.2)),
        life: rand(0.35, 0.8),
        maxLife: 0.8,
        spin: new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-3, 3)),
      });
      this.scene.add(mesh);
    }
  }

  trail(position: THREE.Vector3, color: string): void {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.sphere.clone(), material);
    mesh.position.copy(position);
    mesh.scale.setScalar(rand(0.7, 1.5));
    this.particles.push({
      mesh,
      velocity: new THREE.Vector3(rand(-0.2, 0.2), rand(-1.1, -0.4), 0),
      life: 0.28,
      maxLife: 0.28,
      spin: new THREE.Vector3(0, 0, rand(-2, 2)),
    });
    this.scene.add(mesh);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += particle.spin.x * dt;
      particle.mesh.rotation.y += particle.spin.y * dt;
      particle.mesh.rotation.z += particle.spin.z * dt;
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = alpha;
      particle.mesh.scale.setScalar(lerp(0.2, 1, alpha));
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.particles.forEach((particle) => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }
}

class ProjectileSystem {
  projectiles: Projectile[] = [];
  private playerGeometry = new THREE.CylinderGeometry(0.035, 0.06, 0.48, 8);
  private enemyGeometry = new THREE.CylinderGeometry(0.055, 0.08, 0.42, 8);

  constructor(
    private scene: THREE.Scene,
    private particles: ParticleSystem,
  ) {}

  spawn(
    x: number,
    y: number,
    owner: ProjectileOwner,
    color: string,
    velocity: THREE.Vector3,
    damage: number,
    radius = 0.12,
    piercing = false,
  ): Projectile {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: owner === "player" ? 0.96 : 0.88,
    });
    const mesh = new THREE.Mesh(owner === "player" ? this.playerGeometry : this.enemyGeometry, material);
    mesh.position.set(x, y, 0.24);
    if (Math.abs(velocity.x) > 0.05) {
      mesh.rotation.z = -Math.atan2(velocity.x, velocity.y);
    }
    const projectile: Projectile = {
      id: nextId++,
      mesh,
      owner,
      radius,
      damage,
      velocity,
      life: 3.2,
      piercing,
    };
    this.projectiles.push(projectile);
    this.scene.add(mesh);
    return projectile;
  }

  update(dt: number, bounds: Bounds): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      if (projectile.owner === "player" && Math.random() < 0.7) {
        this.particles.trail(projectile.mesh.position, "#9fffea");
      }
      const out =
        projectile.life <= 0 ||
        projectile.mesh.position.y > bounds.top + 1.2 ||
        projectile.mesh.position.y < bounds.bottom - 1.2 ||
        projectile.mesh.position.x < bounds.left - 1.2 ||
        projectile.mesh.position.x > bounds.right + 1.2;
      if (out) {
        this.remove(projectile);
      }
    }
  }

  remove(projectile: Projectile): void {
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) {
      this.projectiles.splice(index, 1);
    }
    this.scene.remove(projectile.mesh);
    projectile.mesh.geometry.dispose();
    (projectile.mesh.material as THREE.Material).dispose();
  }

  removeEnemyProjectilesNear(position: THREE.Vector3, radius: number): number {
    let removed = 0;
    [...this.projectiles].forEach((projectile) => {
      if (projectile.owner === "enemy" && worldDistance(projectile.mesh.position, position) <= radius) {
        this.remove(projectile);
        removed += 1;
      }
    });
    return removed;
  }

  clear(): void {
    [...this.projectiles].forEach((projectile) => this.remove(projectile));
  }
}

function createShipModel(ship: ShipConfig): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 4), makeMaterial(ship.color, ship.color, 1.1));
  body.rotation.z = Math.PI / 4;
  body.position.y = 0.12;
  group.add(body);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), makeMaterial(ship.accent, ship.accent, 1.25));
  cockpit.position.set(0, 0.18, 0.18);
  group.add(cockpit);

  const wingMaterial = makeMaterial(ship.accent, ship.accent, 0.8);
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.07), wingMaterial);
  leftWing.position.set(-0.33, -0.14, 0);
  leftWing.rotation.z = -0.72;
  const rightWing = leftWing.clone();
  rightWing.position.x = 0.33;
  rightWing.rotation.z = 0.72;
  group.add(leftWing, rightWing);

  const engineMaterial = new THREE.MeshBasicMaterial({ color: ship.accent, transparent: true, opacity: 0.78 });
  const leftEngine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 12), engineMaterial);
  leftEngine.position.set(-0.16, -0.52, 0);
  leftEngine.rotation.z = Math.PI;
  const rightEngine = leftEngine.clone();
  rightEngine.position.x = 0.16;
  group.add(leftEngine, rightEngine);
  return group;
}

class PlayerSystem {
  entity?: Entity;
  ship = SHIPS[0];
  invulnerable = 0;
  overdrive = 0;
  shield = 0;
  shootCooldown = 0;
  specialCooldown = 0;
  specialMax = 6.8;
  lastFacing = 1;

  constructor(
    private scene: THREE.Scene,
    private input: InputSystem,
    private audio: AudioSystem,
    private particles: ParticleSystem,
  ) {}

  create(ship: ShipConfig): void {
    this.clear();
    this.ship = ship;
    this.specialMax = ship.id === "phantom" ? 4.9 : ship.id === "bulwark" ? 7.2 : 6.4;
    const group = createShipModel(ship);
    group.position.set(0, -5.3, 0.2);
    this.entity = {
      id: nextId++,
      group,
      radius: 0.42,
      hp: MAX_ALIEN_HITS,
      maxHp: MAX_ALIEN_HITS,
      velocity: new THREE.Vector3(),
    };
    this.invulnerable = 1.2;
    this.overdrive = 0;
    this.shield = 0;
    this.shootCooldown = 0.15;
    this.specialCooldown = 1.2;
    this.scene.add(group);
  }

  update(dt: number, bounds: Bounds, camera: THREE.OrthographicCamera): void {
    if (!this.entity) {
      return;
    }

    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.overdrive = Math.max(0, this.overdrive - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);

    const player = this.entity;
    const axis = this.input.axis();
    if (axis !== 0) {
      this.lastFacing = axis;
    }

    const target = player.group.position.clone();
    if (this.input.pointerActive) {
      const normalizedX = this.input.pointerX / window.innerWidth;
      target.x = lerp(bounds.left + 0.5, bounds.right - 0.5, normalizedX);
    } else {
      target.x += axis * this.ship.speed * dt;
    }

    player.group.position.x = clamp(target.x, bounds.left + 0.55, bounds.right - 0.55);
    player.group.position.y = lerp(player.group.position.y, bounds.bottom + 1.2, 0.08);
    player.group.rotation.z = lerp(player.group.rotation.z, -axis * 0.22, 0.16);
    player.group.scale.setScalar(this.invulnerable > 0 && Math.sin(performance.now() * 0.025) > 0 ? 0.92 : 1);

    if (this.shield > 0) {
      const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.06;
      player.group.scale.setScalar(pulse);
    }

    camera.position.x = lerp(camera.position.x, player.group.position.x * 0.035, 0.05);
  }

  fire(projectiles: ProjectileSystem): void {
    if (!this.entity || this.shootCooldown > 0) {
      return;
    }

    const rate = this.overdrive > 0 ? this.ship.fireRate * 0.48 : this.ship.fireRate;
    this.shootCooldown = rate;
    const position = this.entity.group.position;
    const spread = this.ship.spread;
    const shots = this.overdrive > 0 && spread === 1 ? 2 : spread;
    const totalWidth = shots === 1 ? 0 : 0.28 * (shots - 1);
    for (let i = 0; i < shots; i += 1) {
      const offset = shots === 1 ? 0 : i * 0.28 - totalWidth / 2;
      const angle = shots === 1 ? 0 : (i - (shots - 1) / 2) * 0.11;
      projectiles.spawn(
        position.x + offset,
        position.y + 0.48,
        "player",
        this.ship.accent,
        new THREE.Vector3(Math.sin(angle) * 2.2, 8.8, 0),
        this.ship.bulletDamage * (this.overdrive > 0 ? 1.1 : 1),
        0.13,
        this.ship.id === "bulwark",
      );
    }
    this.audio.shoot();
  }

  useSpecial(projectiles: ProjectileSystem, asteroids: AsteroidSystem): string | null {
    if (!this.entity || this.specialCooldown > 0) {
      return null;
    }

    this.specialCooldown = this.specialMax;
    const position = this.entity.group.position;
    this.audio.powerUp();
    this.particles.burst(position, this.ship.accent, 24, 3.4);

    if (this.ship.id === "interceptor") {
      this.overdrive = 3.2;
      this.invulnerable = Math.max(this.invulnerable, 0.35);
      return "Overdrive armed. The fire lane is yours.";
    }

    if (this.ship.id === "bulwark") {
      this.shield = 3.6;
      this.invulnerable = Math.max(this.invulnerable, 2);
      this.entity.hp = Math.min(this.entity.maxHp, this.entity.hp + 2);
      const cleared = projectiles.removeEnemyProjectilesNear(position, 5);
      asteroids.deflectNear(position, 3.2);
      return `Aegis pulse cleared ${cleared} shots and reinforced the hull.`;
    }

    if (this.ship.id === "phantom") {
      this.invulnerable = 1.3;
      position.x = clamp(position.x + this.lastFacing * this.ship.dashPower, -8.5, 8.5);
      projectiles.removeEnemyProjectilesNear(position, 2.8);
      return "Phase dash complete. Reality is catching up.";
    }

    const angles = [-0.74, -0.48, -0.24, 0, 0.24, 0.48, 0.74];
    angles.forEach((angle) => {
      projectiles.spawn(
        position.x,
        position.y + 0.4,
        "player",
        this.ship.accent,
        new THREE.Vector3(Math.sin(angle) * 5.2, Math.cos(angle) * 8.4, 0),
        1.6,
        0.16,
        true,
      );
    });
    return "Starburst released. The sky has opinions now.";
  }

  takeDamage(amount: number): boolean {
    if (!this.entity || this.invulnerable > 0 || this.shield > 0) {
      return false;
    }

    this.entity.hp -= amount;
    this.invulnerable = 0.75;
    this.audio.hit();
    this.particles.burst(this.entity.group.position, "#ff4f6d", 16, 2.2);
    return this.entity.hp <= 0;
  }

  specialRatio(): number {
    return 1 - clamp(this.specialCooldown / this.specialMax, 0, 1);
  }

  clear(): void {
    if (this.entity) {
      this.scene.remove(this.entity.group);
      disposeObject(this.entity.group);
      this.entity = undefined;
    }
  }
}

function createEnemyModel(kind: EnemyKind, environment: EnvironmentConfig): THREE.Group {
  const group = new THREE.Group();
  const color = kind === "boss" ? environment.secondary : kind === "miniBoss" ? "#ffe66b" : environment.enemyTint;
  const accent = kind === "charger" ? "#ff4f6d" : environment.primary;
  const scale = kind === "boss" ? 2.6 : kind === "miniBoss" ? 1.45 : 1;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 16, 10), makeMaterial(color, color, 0.9));
  body.scale.y = kind === "boss" ? 0.42 : 0.72;
  group.add(body);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32 * scale, 0.035 * scale, 8, 18),
    makeMaterial(accent, accent, 1.15),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  if (kind === "boss") {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), makeMaterial("#ffffff", environment.primary, 1.4));
    core.position.z = 0.25;
    group.add(core);
    for (let i = 0; i < 4; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.08), makeMaterial(environment.secondary));
      fin.position.x = (i - 1.5) * 0.42;
      fin.position.y = -0.32;
      fin.rotation.z = (i - 1.5) * 0.14;
      group.add(fin);
    }
  } else if (kind === "gunner") {
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), makeMaterial(accent, accent, 1));
    cannon.position.y = -0.32;
    group.add(cannon);
  } else if (kind === "charger") {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 8), makeMaterial("#ff4f6d", "#ff4f6d", 1.2));
    horn.position.y = -0.36;
    horn.rotation.z = Math.PI;
    group.add(horn);
  }

  return group;
}

class EnemySystem {
  enemies: EnemyEntity[] = [];
  private formationTime = 0;
  private drop = 0;

  constructor(
    private scene: THREE.Scene,
    private audio: AudioSystem,
    private particles: ParticleSystem,
  ) {}

  startLevel(level: LevelDefinition, environment: EnvironmentConfig, bounds: Bounds): void {
    this.clear();
    this.formationTime = 0;
    this.drop = 0;
    this.spawnFormation(level, environment, bounds);
  }

  spawnReinforcement(level: LevelDefinition, environment: EnvironmentConfig, bounds: Bounds): void {
    this.drop = 0;
    this.spawnFormation(level, environment, bounds);
  }

  spawnAmbusher(level: LevelDefinition, environment: EnvironmentConfig, bounds: Bounds, playerX: number): void {
    const x = clamp(playerX + rand(-2.4, 2.4), bounds.left + 0.7, bounds.right - 0.7);
    const enemy = this.spawnEnemy("charger", x, bounds.bottom - 0.7, level.enemyHp * 1.35, level, environment);
    enemy.attackMode = "ambush";
    enemy.baseX = x;
    enemy.baseY = bounds.bottom - 0.7;
    enemy.diveTarget = clamp(playerX + rand(-0.8, 0.8), bounds.left + 0.6, bounds.right - 0.6);
    enemy.fireCooldown = rand(0.35, 1.1);
    enemy.amplitude = 0.18;
    enemy.group.rotation.z = Math.PI;
  }

  private spawnFormation(level: LevelDefinition, environment: EnvironmentConfig, bounds: Bounds): void {
    const width = Math.min(bounds.right - bounds.left - 2.2, level.cols * 1.08);
    const startX = -width / 2;
    for (let row = 0; row < level.rows; row += 1) {
      for (let col = 0; col < level.cols; col += 1) {
        const kind: EnemyKind =
          row === 0 && level.index > 2 ? "gunner" : row === level.rows - 1 && level.index > 1 ? "charger" : "scout";
        const x = startX + col * (width / Math.max(1, level.cols - 1));
        const y = 4.35 - row * 0.62;
        this.spawnEnemy(kind, x, y, level.enemyHp, level, environment);
      }
    }

    if (level.miniBoss) {
      this.spawnEnemy("miniBoss", 0, 5.08, level.enemyHp * 7, level, environment);
    }

    if (level.boss) {
      this.spawnEnemy("boss", 0, 5.8, level.enemyHp * 22, level, environment);
    }
  }

  update(
    dt: number,
    player: Entity | undefined,
    projectiles: ProjectileSystem,
    level: LevelDefinition,
    environment: EnvironmentConfig,
    bounds: Bounds,
  ): void {
    this.formationTime += dt * level.enemySpeed * environment.enemySpeedMod;
    this.drop += dt * 0.035 * level.index;
    const playerX = player?.group.position.x ?? 0;

    this.enemies.forEach((enemy) => {
      const speed = level.enemySpeed * environment.enemySpeedMod;
      enemy.fireCooldown -= dt;

      if (enemy.attackMode === "formation") {
        const wave = Math.sin(this.formationTime + enemy.phase) * enemy.amplitude;
        enemy.group.position.x = enemy.baseX + wave;
        enemy.group.position.y = enemy.baseY - this.drop + Math.sin(this.formationTime * 1.7 + enemy.phase) * 0.08;
        enemy.group.rotation.z = Math.sin(this.formationTime + enemy.phase) * 0.12;

        if (
          enemy.kind === "charger" &&
          player &&
          enemy.group.position.y < 4.4 &&
          Math.random() < dt * (0.05 + level.index * 0.018)
        ) {
          enemy.attackMode = "dive";
          enemy.diveTarget = playerX + rand(-0.6, 0.6);
        }
      } else if (enemy.attackMode === "dive") {
        enemy.group.position.x = lerp(enemy.group.position.x, enemy.diveTarget, 0.035 + speed * 0.015);
        enemy.group.position.y -= dt * (2.1 + speed * 0.5);
        enemy.group.rotation.z = Math.sin(this.formationTime * 5) * 0.32;
        if (enemy.group.position.y < bounds.bottom - 0.5) {
          enemy.attackMode = "retreat";
          enemy.group.position.y = bounds.top + 0.4;
        }
      } else if (enemy.attackMode === "ambush") {
        enemy.group.position.x = lerp(enemy.group.position.x, enemy.diveTarget, 0.035 + speed * 0.012);
        enemy.group.position.y += dt * (2.2 + speed * 0.72);
        enemy.group.rotation.z = Math.PI + Math.sin(this.formationTime * 6 + enemy.phase) * 0.2;
        if (enemy.group.position.y > bounds.top + 0.9) {
          this.despawn(enemy);
        }
      } else {
        enemy.group.position.x = lerp(enemy.group.position.x, enemy.baseX, 0.025);
        enemy.group.position.y = lerp(enemy.group.position.y, enemy.baseY - this.drop, 0.025);
        if (Math.abs(enemy.group.position.y - (enemy.baseY - this.drop)) < 0.12) {
          enemy.attackMode = "formation";
        }
      }

      if (!this.enemies.includes(enemy)) {
        return;
      }

      const fireChancePerSecond = level.enemyFireRate * (enemy.kind === "gunner" ? 1.75 : enemy.kind === "boss" ? 3 : 1);
      if (player && enemy.fireCooldown <= 0 && Math.random() < fireChancePerSecond * dt) {
        enemy.fireCooldown = rand(0.65, 1.9) / (level.enemyFireRate + 0.55);
        const dx = clamp(player.group.position.x - enemy.group.position.x, -2.5, 2.5);
        const fromBehind = enemy.attackMode === "ambush";
        const velocity = new THREE.Vector3(dx * 0.65, (fromBehind ? 3.35 : -3.7) + (fromBehind ? 1 : -1) * level.index * 0.2, 0);
        projectiles.spawn(
          enemy.group.position.x,
          enemy.group.position.y + (fromBehind ? 0.28 : -0.28),
          "enemy",
          enemy.kind === "boss" ? environment.secondary : "#ff4f6d",
          velocity,
          1,
          enemy.kind === "boss" ? 0.18 : 0.14,
        );
        this.audio.enemyShoot();

        if (enemy.kind === "boss" && Math.random() < 0.42) {
          projectiles.spawn(enemy.group.position.x - 0.72, enemy.group.position.y - 0.2, "enemy", environment.primary, new THREE.Vector3(-1.3, -4.4, 0), 1, 0.14);
          projectiles.spawn(enemy.group.position.x + 0.72, enemy.group.position.y - 0.2, "enemy", environment.primary, new THREE.Vector3(1.3, -4.4, 0), 1, 0.14);
        }
      }
    });
  }

  damage(enemy: EnemyEntity, amount: number): boolean {
    enemy.hp -= amount;
    enemy.group.scale.setScalar(1.08);
    window.setTimeout(() => {
      if (this.enemies.includes(enemy)) {
        enemy.group.scale.setScalar(1);
      }
    }, 60);

    if (enemy.hp <= 0) {
      this.destroy(enemy);
      return true;
    }
    return false;
  }

  destroy(enemy: EnemyEntity): void {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) {
      this.enemies.splice(index, 1);
    }
    this.scene.remove(enemy.group);
    this.particles.burst(enemy.group.position, enemy.kind === "boss" ? "#ffe66b" : "#42f8c8", enemy.kind === "boss" ? 80 : 18, enemy.kind === "boss" ? 5 : 2.4);
    disposeObject(enemy.group);
    this.audio.explosion();
  }

  despawn(enemy: EnemyEntity): void {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) {
      this.enemies.splice(index, 1);
    }
    this.scene.remove(enemy.group);
    disposeObject(enemy.group);
  }

  isCleared(): boolean {
    return this.enemies.length === 0;
  }

  clear(): void {
    this.enemies.forEach((enemy) => {
      this.scene.remove(enemy.group);
      disposeObject(enemy.group);
    });
    this.enemies = [];
  }

  private spawnEnemy(
    kind: EnemyKind,
    x: number,
    y: number,
    hp: number,
    level: LevelDefinition,
    environment: EnvironmentConfig,
  ): EnemyEntity {
    const group = createEnemyModel(kind, environment);
    group.position.set(x, y, 0.12);
    const multiplier = kind === "boss" ? 1 : kind === "miniBoss" ? 0.72 : 0.24;
    const radius = kind === "boss" ? 1.3 : kind === "miniBoss" ? 0.7 : 0.36;
    const enemy: EnemyEntity = {
      id: nextId++,
      group,
      radius,
      hp,
      maxHp: hp,
      velocity: new THREE.Vector3(),
      kind,
      baseX: x,
      baseY: y,
      phase: rand(0, Math.PI * 2),
      amplitude: kind === "boss" ? 2.2 : rand(0.2, 0.56) + level.index * 0.03,
      fireCooldown: rand(0.85, 2.65),
      attackMode: "formation",
      diveTarget: x,
      scoreValue: Math.round((90 + level.index * 22) * (kind === "boss" ? 20 : kind === "miniBoss" ? 7 : 1 + multiplier)),
    };
    this.enemies.push(enemy);
    this.scene.add(group);
    return enemy;
  }
}

class AsteroidSystem {
  asteroids: Asteroid[] = [];
  private timer = 0;
  private geometry = new THREE.IcosahedronGeometry(0.42, 1);

  constructor(
    private scene: THREE.Scene,
    private particles: ParticleSystem,
  ) {}

  update(dt: number, bounds: Bounds, level: LevelDefinition, environment: EnvironmentConfig): void {
    this.timer -= dt;
    const spawnEvery = 1 / Math.max(0.08, environment.asteroidRate * level.asteroidRateMod);
    if (this.timer <= 0) {
      this.timer = rand(spawnEvery * 0.42, spawnEvery * 1.1);
      this.spawn(bounds, level, environment);
    }

    this.asteroids.forEach((asteroid) => {
      asteroid.velocity.x += Math.sin(performance.now() * 0.001 + asteroid.id) * environment.drift * 0.018 * dt;
      asteroid.mesh.position.addScaledVector(asteroid.velocity, dt);
      asteroid.mesh.rotation.x += asteroid.spin.x * dt;
      asteroid.mesh.rotation.y += asteroid.spin.y * dt;
      asteroid.mesh.rotation.z += asteroid.spin.z * dt;
    });

    for (let i = this.asteroids.length - 1; i >= 0; i -= 1) {
      const asteroid = this.asteroids[i];
      if (
        asteroid.mesh.position.y < bounds.bottom - 1.4 ||
        asteroid.mesh.position.x < bounds.left - 2 ||
        asteroid.mesh.position.x > bounds.right + 2
      ) {
        this.remove(asteroid);
      }
    }
  }

  damage(asteroid: Asteroid, amount: number): boolean {
    asteroid.hp -= amount;
    asteroid.mesh.scale.multiplyScalar(0.96);
    if (asteroid.hp <= 0) {
      this.destroy(asteroid);
      return true;
    }
    return false;
  }

  destroy(asteroid: Asteroid): void {
    this.particles.burst(asteroid.mesh.position, "#d6e2ff", 14, 2);
    this.remove(asteroid);
  }

  deflectNear(position: THREE.Vector3, radius: number): void {
    this.asteroids.forEach((asteroid) => {
      if (worldDistance(position, asteroid.mesh.position) < radius) {
        asteroid.velocity.y = -Math.abs(asteroid.velocity.y) * 0.75;
        asteroid.velocity.x += Math.sign(asteroid.mesh.position.x - position.x || 1) * 2.2;
      }
    });
  }

  clear(): void {
    [...this.asteroids].forEach((asteroid) => this.remove(asteroid));
    this.timer = 0;
  }

  private spawn(bounds: Bounds, level: LevelDefinition, environment: EnvironmentConfig): void {
    const radius = rand(0.24, level.index > 3 ? 0.66 : 0.48);
    const material = makeMaterial("#8f9aaa", environment.secondary, 0.18);
    const mesh = new THREE.Mesh(this.geometry.clone(), material);
    mesh.position.set(rand(bounds.left + 0.4, bounds.right - 0.4), bounds.top + radius + 0.2, 0.05);
    mesh.scale.set(radius * rand(0.8, 1.25), radius * rand(0.75, 1.3), radius * rand(0.8, 1.25));
    const asteroid: Asteroid = {
      id: nextId++,
      mesh,
      radius,
      hp: Math.ceil(radius * 3 + level.index * 0.24),
      velocity: new THREE.Vector3(
        rand(-environment.drift, environment.drift),
        -rand(1.4, 2.45 + level.index * 0.18) * environment.asteroidSpeed,
        0,
      ),
      spin: new THREE.Vector3(rand(-2.2, 2.2), rand(-2.2, 2.2), rand(-2.2, 2.2)),
      scoreValue: Math.round(55 + radius * 120),
    };
    this.asteroids.push(asteroid);
    this.scene.add(mesh);
  }

  private remove(asteroid: Asteroid): void {
    const index = this.asteroids.indexOf(asteroid);
    if (index >= 0) {
      this.asteroids.splice(index, 1);
    }
    this.scene.remove(asteroid.mesh);
    asteroid.mesh.geometry.dispose();
    (asteroid.mesh.material as THREE.Material).dispose();
  }
}

class PowerUpSystem {
  powerUps: PowerUp[] = [];

  constructor(private scene: THREE.Scene) {}

  maybeDrop(position: THREE.Vector3, level: LevelDefinition, environment: EnvironmentConfig): void {
    const chance = level.index > 4 ? 0.14 : 0.1;
    if (Math.random() > chance) {
      return;
    }

    const kinds: PowerUpKind[] = ["repair", "overdrive", "score", "shield"];
    const kind = pick(kinds);
    const color =
      kind === "repair" ? "#42f8c8" : kind === "overdrive" ? environment.secondary : kind === "shield" ? "#7aa8ff" : "#ffe66b";
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), makeMaterial(color, color, 1.2));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.028, 8, 20), makeMaterial("#ffffff", color, 0.8));
    ring.rotation.x = Math.PI / 2;
    group.add(core, ring);
    group.position.copy(position);
    const powerUp: PowerUp = {
      id: nextId++,
      group,
      kind,
      radius: 0.32,
      velocity: new THREE.Vector3(rand(-0.25, 0.25), -1.25, 0),
      life: 8,
    };
    this.powerUps.push(powerUp);
    this.scene.add(group);
  }

  update(dt: number, bounds: Bounds): void {
    for (let i = this.powerUps.length - 1; i >= 0; i -= 1) {
      const powerUp = this.powerUps[i];
      powerUp.life -= dt;
      powerUp.group.position.addScaledVector(powerUp.velocity, dt);
      powerUp.group.rotation.z += dt * 2;
      powerUp.group.rotation.y += dt * 1.6;
      if (powerUp.life <= 0 || powerUp.group.position.y < bounds.bottom - 0.8) {
        this.remove(powerUp);
      }
    }
  }

  remove(powerUp: PowerUp): void {
    const index = this.powerUps.indexOf(powerUp);
    if (index >= 0) {
      this.powerUps.splice(index, 1);
    }
    this.scene.remove(powerUp.group);
    disposeObject(powerUp.group);
  }

  clear(): void {
    [...this.powerUps].forEach((powerUp) => this.remove(powerUp));
  }
}

class StarfallGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private clock = new THREE.Clock();
  private audio = new AudioSystem();
  private input: InputSystem;
  private background: BackgroundSystem;
  private particles: ParticleSystem;
  private projectiles: ProjectileSystem;
  private player: PlayerSystem;
  private enemies: EnemySystem;
  private asteroids: AsteroidSystem;
  private powerUps: PowerUpSystem;
  private phase: GamePhase = "menu";
  private bounds: Bounds = { left: -8, right: 8, top: 7, bottom: -7 };
  private score: ScoreState = {
    score: 0,
    best: readNumberStorage(STORAGE_KEYS.best, 0),
    combo: 1,
    kills: 0,
    level: 1,
  };
  private currentShip = SHIPS[0];
  private currentPilot = PILOTS[0];
  private currentEnvironment = ENVIRONMENTS[0];
  private levelIndex = 0;
  private levelTimer = 0;
  private nextWaveTimer = 0;
  private rearAttackTimer = 0;
  private transitionTimer = 0;
  private comboTimer = 0;
  private quipTimer = 0;
  private alienHits = 0;
  private lastDeathReason = "";
  private currentQuip = "";
  private phaseText = "Choose your loadout.";
  private shake = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private ui: UIOverlay,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor("#05070d", 1);
    this.camera = new THREE.OrthographicCamera(-8, 8, 7, -7, 0.1, 80);
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight("#ffffff", 1.7);
    const key = new THREE.DirectionalLight("#ffffff", 1.2);
    key.position.set(2, 3, 6);
    this.scene.add(ambient, key);

    this.input = new InputSystem(canvas);
    this.background = new BackgroundSystem(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.projectiles = new ProjectileSystem(this.scene, this.particles);
    this.player = new PlayerSystem(this.scene, this.input, this.audio, this.particles);
    this.enemies = new EnemySystem(this.scene, this.audio, this.particles);
    this.asteroids = new AsteroidSystem(this.scene, this.particles);
    this.powerUps = new PowerUpSystem(this.scene);

    this.input.onPause = () => this.togglePause();
    this.ui.onStart = (ship, pilot, environment) => this.startGame(ship, pilot, environment);
    this.ui.onRestart = () => this.startGame(this.currentShip, this.currentPilot, this.currentEnvironment);
    this.ui.onMenu = () => this.showMenu();
    this.ui.onResume = () => this.resume();
    this.ui.onSpecial = () => this.activateSpecial();

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.background.applyEnvironment(this.currentEnvironment, this.bounds);
    this.ui.renderMenu(this.score.best);
    this.loop();
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const viewHeight = 14;
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.bounds = {
      left: this.camera.left,
      right: this.camera.right,
      top: this.camera.top,
      bottom: this.camera.bottom,
    };
    this.background.applyEnvironment(this.currentEnvironment, this.bounds);
  }

  private startGame(ship: ShipConfig, pilot: PilotPersonality, environment: EnvironmentConfig): void {
    this.audio.unlock();
    this.currentShip = ship;
    this.currentPilot = pilot;
    this.currentEnvironment = environment;
    this.phase = "playing";
    this.score = {
      score: 0,
      best: readNumberStorage(STORAGE_KEYS.best, 0),
      combo: 1,
      kills: 0,
      level: 1,
    };
    this.levelIndex = 0;
    this.levelTimer = 0;
    this.nextWaveTimer = 0;
    this.rearAttackTimer = 0;
    this.comboTimer = 0;
    this.alienHits = 0;
    this.lastDeathReason = "";
    this.quipTimer = 3.5;
    this.currentQuip = pick(pilot.introLines);
    this.phaseText = `${environment.name}: ${environment.hazardText}`;
    this.shake = 0;
    this.clearStage();
    this.background.applyEnvironment(environment, this.bounds);
    this.player.create(ship);
    this.startLevel(0);
    const showControlsCoachmark = readStorage(STORAGE_KEYS.controlsSeen, "false") !== "true";
    this.ui.renderPlaying(this.snapshot(), showControlsCoachmark);
    if (showControlsCoachmark) {
      writeStorage(STORAGE_KEYS.controlsSeen, "true");
    }
  }

  private showMenu(): void {
    this.phase = "menu";
    this.clearStage();
    this.ui.renderMenu(this.score.best);
  }

  private togglePause(): void {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.ui.renderPaused(this.snapshot());
    } else if (this.phase === "paused") {
      this.resume();
    }
  }

  private resume(): void {
    if (this.phase !== "paused") {
      return;
    }
    this.phase = "playing";
    this.input.resetTransient();
    this.ui.renderPlaying(this.snapshot());
  }

  private startLevel(index: number): void {
    this.levelIndex = index;
    const level = LEVELS[index];
    this.score.level = level.index;
    this.levelTimer = 0;
    this.nextWaveTimer = level.waveDelay;
    this.rearAttackTimer = Math.max(1, 1 / level.rearAttackRate);
    this.transitionTimer = 0;
    this.projectiles.clear();
    this.asteroids.clear();
    this.powerUps.clear();
    this.enemies.startLevel(level, this.currentEnvironment, this.bounds);
    this.currentQuip = `${pick(this.currentPilot.introLines)} ${level.intro}`;
    this.phaseText = `Level ${level.index}: ${level.name}. Weapons hot.`;
    this.audio.level();
  }

  private update(dt: number): void {
    this.background.update(dt, this.bounds);
    this.particles.update(dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) {
      this.score.combo = 1;
    }

    if (this.phase === "levelClear") {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        const next = this.levelIndex + 1;
        if (next >= LEVELS.length) {
          this.winGame();
        } else {
          this.phase = "playing";
          this.startLevel(next);
          this.ui.renderPlaying(this.snapshot());
        }
      }
      this.ui.updateHUD(this.snapshot());
      return;
    }

    if (this.phase !== "playing") {
      return;
    }

    const level = LEVELS[this.levelIndex];
    this.levelTimer += dt;
    this.quipTimer -= dt;
    if (this.quipTimer <= 0) {
      this.quipTimer = rand(5.5, 9.5);
      this.currentQuip = this.player.entity && this.player.entity.hp <= this.player.entity.maxHp * 0.34
        ? pick(this.currentPilot.lowHealth)
        : pick(this.currentPilot.quips);
    }

    this.player.update(dt, this.bounds, this.camera);
    if (this.input.consumeSpecial()) {
      this.activateSpecial();
    }
    if (this.input.wantsFire()) {
      this.player.fire(this.projectiles);
    }

    this.enemies.update(dt, this.player.entity, this.projectiles, level, this.currentEnvironment, this.bounds);
    this.updateSurvivalPressure(dt, level);
    this.asteroids.update(dt, this.bounds, level, this.currentEnvironment);
    this.powerUps.update(dt, this.bounds);
    this.projectiles.update(dt, this.bounds);
    this.handleCollisions(level);
    this.checkLevelClear(level);
    this.ui.updateHUD(this.snapshot());
  }

  private updateSurvivalPressure(dt: number, level: LevelDefinition): void {
    if (this.levelTimer >= level.duration) {
      return;
    }

    this.nextWaveTimer -= dt;
    if (this.enemies.isCleared() && this.nextWaveTimer <= 0) {
      this.enemies.spawnReinforcement(level, this.currentEnvironment, this.bounds);
      this.nextWaveTimer = level.waveDelay;
      this.phaseText = "Reinforcement wave inbound. Keep the lane clean.";
    }

    this.rearAttackTimer -= dt;
    if (this.player.entity && this.rearAttackTimer <= 0) {
      this.enemies.spawnAmbusher(level, this.currentEnvironment, this.bounds, this.player.entity.group.position.x);
      const nextAmbush = 1 / Math.max(0.02, level.rearAttackRate * this.currentEnvironment.enemySpeedMod);
      this.rearAttackTimer = rand(nextAmbush * 0.55, nextAmbush * 1.15);
      this.phaseText = "Rear contact. Alien attacker coming from behind.";
    }
  }

  private activateSpecial(): void {
    if (this.phase !== "playing") {
      return;
    }
    const message = this.player.useSpecial(this.projectiles, this.asteroids);
    if (message) {
      this.currentQuip = pick(this.currentPilot.specialLines);
      this.phaseText = message;
      this.shake = Math.max(this.shake, 0.22);
    }
  }

  private handleCollisions(level: LevelDefinition): void {
    const player = this.player.entity;

    [...this.projectiles.projectiles].forEach((projectile) => {
      if (projectile.owner === "player") {
        for (const enemy of [...this.enemies.enemies]) {
          if (worldDistance(projectile.mesh.position, enemy.group.position) < projectile.radius + enemy.radius) {
            const killed = this.enemies.damage(enemy, projectile.damage);
            this.particles.burst(projectile.mesh.position, this.currentEnvironment.primary, 6, 1.2);
            if (!projectile.piercing) {
              this.projectiles.remove(projectile);
            }
            if (killed) {
              this.addScore(enemy.scoreValue);
              this.powerUps.maybeDrop(enemy.group.position, level, this.currentEnvironment);
              this.shake = Math.max(this.shake, enemy.kind === "boss" ? 0.65 : 0.2);
            }
            break;
          }
        }

        for (const asteroid of [...this.asteroids.asteroids]) {
          if (!this.projectiles.projectiles.includes(projectile)) {
            break;
          }
          if (worldDistance(projectile.mesh.position, asteroid.mesh.position) < projectile.radius + asteroid.radius) {
            const destroyed = this.asteroids.damage(asteroid, projectile.damage);
            if (!projectile.piercing) {
              this.projectiles.remove(projectile);
            }
            if (destroyed) {
              this.addScore(asteroid.scoreValue);
              this.shake = Math.max(this.shake, 0.12);
            }
            break;
          }
        }
      } else if (player && worldDistance(projectile.mesh.position, player.group.position) < projectile.radius + player.radius) {
        this.projectiles.remove(projectile);
        this.damagePlayer(projectile.damage, "alienShot");
      }
    });

    if (!player) {
      return;
    }

    [...this.asteroids.asteroids].forEach((asteroid) => {
      if (worldDistance(asteroid.mesh.position, player.group.position) < asteroid.radius + player.radius) {
        this.asteroids.destroy(asteroid);
        this.damagePlayer(MAX_ALIEN_HITS, "asteroid");
      }
    });

    [...this.enemies.enemies].forEach((enemy) => {
      if (worldDistance(enemy.group.position, player.group.position) < enemy.radius + player.radius) {
        this.enemies.destroy(enemy);
        this.damagePlayer(1, "alienCollision");
      }
      if (enemy.group.position.y < this.bounds.bottom + 0.4) {
        this.damagePlayer(1, "sectorBreach");
        this.enemies.destroy(enemy);
      }
    });

    [...this.powerUps.powerUps].forEach((powerUp) => {
      if (worldDistance(powerUp.group.position, player.group.position) < powerUp.radius + player.radius) {
        this.collectPowerUp(powerUp);
      }
    });
  }

  private collectPowerUp(powerUp: PowerUp): void {
    const player = this.player.entity;
    if (!player) {
      return;
    }

    if (powerUp.kind === "repair") {
      player.hp = Math.min(player.maxHp, player.hp + 2);
      this.alienHits = Math.max(0, this.alienHits - 2);
      this.phaseText = "Repair cell absorbed. Two alien hits scrubbed from the hull log.";
    } else if (powerUp.kind === "overdrive") {
      this.player.overdrive = Math.max(this.player.overdrive, 2.2);
      this.phaseText = "Overdrive cell active. Fire rate climbing.";
    } else if (powerUp.kind === "shield") {
      this.player.shield = Math.max(this.player.shield, 2.6);
      this.player.invulnerable = Math.max(this.player.invulnerable, 1.8);
      this.phaseText = "Shield cell online.";
    } else {
      this.addScore(700);
      this.phaseText = "Score cache recovered.";
    }
    this.audio.powerUp();
    this.particles.burst(powerUp.group.position, this.currentEnvironment.secondary, 18, 2.8);
    this.powerUps.remove(powerUp);
  }

  private damagePlayer(amount: number, cause: DamageCause): void {
    if (cause === "asteroid") {
      this.lastDeathReason = "Impact blackout. The next launch is ready.";
      this.shake = Math.max(this.shake, 0.8);
      this.loseGame();
      return;
    }

    const before = this.player.entity?.hp ?? 0;
    const died = this.player.takeDamage(amount);
    const after = this.player.entity?.hp ?? 0;
    const hitApplied = after < before || died;
    if (!hitApplied) {
      return;
    }

    this.alienHits = Math.min(MAX_ALIEN_HITS, this.alienHits + 1);
    this.shake = Math.max(this.shake, 0.35);
    this.score.combo = 1;
    this.comboTimer = 0;

    if (this.alienHits >= MAX_ALIEN_HITS || died) {
      this.lastDeathReason =
        cause === "alienShot"
          ? "Alien fire overwhelmed the hull."
          : cause === "alienCollision"
            ? "Alien hull contact shattered the flight path."
            : "A hostile slipped through the sector line.";
      this.loseGame();
    } else if (this.player.entity) {
      this.currentQuip =
        this.alienHits >= MAX_ALIEN_HITS - 3 ? pick(this.currentPilot.lowHealth) : "Hull breach. Recover the lane.";
    }
  }

  private addScore(amount: number): void {
    this.score.combo = clamp(this.score.combo + 1, 1, 9);
    this.comboTimer = 2.8;
    const gained = Math.round(amount * this.score.combo);
    this.score.score += gained;
    this.score.kills += 1;
    if (this.score.score > this.score.best) {
      this.score.best = this.score.score;
      writeStorage(STORAGE_KEYS.best, this.score.best);
    }
  }

  private checkLevelClear(level: LevelDefinition): void {
    if (this.levelTimer < level.duration) {
      return;
    }

    this.score.score += level.reward;
    if (this.score.score > this.score.best) {
      this.score.best = this.score.score;
      writeStorage(STORAGE_KEYS.best, this.score.best);
    }
    this.phase = "levelClear";
    this.transitionTimer = 2.15;
    this.phaseText = `${level.name} cleared. Bonus ${level.reward.toLocaleString()}.`;
    this.currentQuip = pick(this.currentPilot.levelClear);
    this.audio.level();
    this.ui.renderPlaying(this.snapshot());
  }

  private loseGame(): void {
    this.phase = "gameOver";
    this.phaseText = "Run complete.";
    this.currentQuip = this.lastDeathReason || pick(this.currentPilot.death);
    this.particles.burst(this.player.entity?.group.position ?? new THREE.Vector3(), "#ff4f6d", 50, 4.2);
    this.audio.explosion();
    this.player.clear();
    this.ui.renderSummary(this.snapshot(), false);
  }

  private winGame(): void {
    this.phase = "victory";
    this.phaseText = "Victory.";
    this.currentQuip = "Final wave defeated. Vibe Jam telemetry says: very submit-able.";
    this.audio.level();
    this.ui.renderSummary(this.snapshot(), true);
  }

  private snapshot(): HudSnapshot {
    const level = LEVELS[this.levelIndex] ?? LEVELS[LEVELS.length - 1];
    const player = this.player.entity;
    const timeLeft = Math.max(0, level.duration - this.levelTimer);
    return {
      score: this.score.score,
      best: this.score.best,
      combo: this.score.combo,
      kills: this.score.kills,
      level: level.index,
      levelName: level.name,
      timeLeft,
      progressPct: clamp(this.levelTimer / level.duration, 0, 1),
      environment: this.currentEnvironment.name,
      shipName: this.currentShip.name,
      health: player?.hp ?? 0,
      maxHealth: player?.maxHp ?? MAX_ALIEN_HITS,
      hitsTaken: this.alienHits,
      maxAlienHits: MAX_ALIEN_HITS,
      specialPct: this.player.specialRatio(),
      quip: this.currentQuip,
      phaseText: this.phaseText,
    };
  }

  private clearStage(): void {
    this.player.clear();
    this.enemies.clear();
    this.asteroids.clear();
    this.projectiles.clear();
    this.powerUps.clear();
    this.particles.clear();
  }

  private render(): void {
    const shake = this.shake;
    this.shake = Math.max(0, this.shake - 0.018);
    const jitter = shake > 0 ? shake * 0.16 : 0;
    const originalX = this.camera.position.x;
    const originalY = this.camera.position.y;
    this.camera.position.x += rand(-jitter, jitter);
    this.camera.position.y += rand(-jitter, jitter);
    this.renderer.render(this.scene, this.camera);
    this.camera.position.x = originalX;
    this.camera.position.y = originalY;
  }

  private loop = (): void => {
    const dt = Math.min(0.033, this.clock.getDelta());
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };
}

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const uiRoot = document.querySelector<HTMLElement>("#ui-root");

if (!canvas || !uiRoot) {
  throw new Error("Starfall Armada could not find the canvas or UI root.");
}

new StarfallGame(canvas, new UIOverlay(uiRoot));
