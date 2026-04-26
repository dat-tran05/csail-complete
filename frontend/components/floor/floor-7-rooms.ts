export type Poly = [number, number][];

export type AmenityKind = "bathroom" | "elevator" | "stair" | "kitchen" | "lounge" | "service";

export interface RoomDef {
  id: string;
  number: string;
  polygon: Poly;
  type?: "office" | "lab" | "common" | "conference" | "service" | "corridor";
  label?: string;
  /** Reserved for hand-curated PI surnames (overrides KG-derived label). */
  pi?: string;
  /** Hand-curated named space (e.g., "Gates Tower Atrium"). */
  namedSpace?: string;
  /** Amenity classification — drives icon rendering in Phase H. */
  amenityKind?: AmenityKind;
}

// Floor 7 (Gates) — hand-traced approximation of the MIT facilities plan.
// Coordinate space is normalized 0–100, north up. Polygons are CCW.
// Real room numbers from the PDF; some additional virtual rooms (G743,
// G748, G750, G755) are kept to align with the existing data layer's
// group→room mapping.
export const FLOOR_7_ROOMS: RoomDef[] = [
  // Northern row (Vassar Street side) — small offices
  { id: "32-G730", number: "730", polygon: [[8,28],[20,28],[20,42],[10,42]], type: "office" },
  { id: "32-G732", number: "732", polygon: [[20,18],[28,18],[28,30],[20,30]], type: "office" },
  { id: "32-G734", number: "734", polygon: [[28,16],[36,16],[36,28],[28,28]], type: "office" },
  { id: "32-G736", number: "736", polygon: [[36,14],[44,14],[44,26],[36,26]], type: "office" },
  { id: "32-G738", number: "738", polygon: [[44,12],[52,12],[52,24],[44,24]], type: "office" },
  { id: "32-G740", number: "740", polygon: [[52,12],[60,12],[60,24],[52,24]], type: "office" },
  { id: "32-G742", number: "742", polygon: [[60,12],[68,12],[68,24],[60,24]], type: "office" },
  { id: "32-G744", number: "744", polygon: [[68,14],[76,14],[76,26],[68,26]], type: "office" },
  { id: "32-G746", number: "746", polygon: [[76,16],[83,16],[83,28],[76,28]], type: "office" },
  { id: "32-G746A", number: "746A", polygon: [[83,18],[88,20],[88,30],[83,30]], type: "service" },

  // Northwest corner
  { id: "32-G728", number: "728", polygon: [[8,42],[20,42],[20,56],[8,56]], type: "office" },
  { id: "32-G726", number: "726", polygon: [[8,56],[20,56],[20,68],[10,70]], type: "office" },
  { id: "32-G724", number: "724", polygon: [[10,70],[20,68],[22,80],[14,82]], type: "office" },

  // Central spine — main corridor
  { id: "32-G7-corridor", number: "G7", polygon: [[20,42],[80,42],[82,50],[20,50]], type: "corridor", label: "main corridor" },

  // Big shared rooms north of corridor
  { id: "32-G735", number: "735", polygon: [[28,30],[44,28],[44,42],[28,42]], type: "lab", label: "open work area" },
  { id: "32-G745", number: "745", polygon: [[44,28],[60,26],[60,42],[44,42]], type: "lab" },
  { id: "32-G755", number: "755", polygon: [[60,26],[78,28],[78,42],[60,42]], type: "lab", label: "Theory of Computation" },

  // Conference / common
  { id: "32-G725", number: "725", polygon: [[22,52],[34,52],[34,64],[22,64]], type: "conference", label: "conference" },
  { id: "32-G726A", number: "726A", polygon: [[22,64],[34,64],[34,76],[22,76]], type: "service" },

  // Group rooms south of corridor (data-backed: HCI/PL/Vision)
  { id: "32-G743", number: "743", polygon: [[34,52],[54,52],[54,72],[34,72]], type: "common", label: "HCI Lab common" },
  { id: "32-G748", number: "748", polygon: [[54,52],[66,52],[66,62],[54,62]], type: "office", label: "PL office" },
  { id: "32-G750", number: "750", polygon: [[54,62],[66,62],[66,72],[54,72]], type: "office", label: "PL office" },
  { id: "32-G768", number: "768", polygon: [[66,52],[82,50],[82,66],[66,66]], type: "lab" },
  { id: "32-G770", number: "770", polygon: [[82,50],[90,50],[90,64],[82,64]], type: "lab" },

  // East side
  { id: "32-G775", number: "775", polygon: [[66,66],[82,66],[82,78],[68,80]], type: "lab" },
  { id: "32-G778", number: "778", polygon: [[82,64],[90,64],[88,76],[82,78]], type: "office" },
  { id: "32-G780", number: "780", polygon: [[80,80],[88,76],[86,86],[78,86]], type: "office" },

  // South — Vision lab + tower base
  { id: "32-G718", number: "718", polygon: [[34,72],[60,72],[60,86],[36,86]], type: "lab", label: "Vision Lab" },
  { id: "32-G720", number: "720", polygon: [[22,76],[34,76],[34,86],[22,86]], type: "office" },

  // Far south — Gates Tower lobby + amphitheater
  { id: "32-G785", number: "785", polygon: [[60,72],[68,72],[68,82],[60,82]], type: "office" },
  { id: "32-G786", number: "786", polygon: [[60,82],[72,82],[72,90],[60,90]], type: "office" },
  { id: "32-G788", number: "788", polygon: [[68,72],[78,72],[78,82],[68,82]], type: "office" },
  { id: "32-G790", number: "790", polygon: [[72,86],[80,84],[80,92],[68,92]], type: "lab", label: "Gates Tower lounge" },
  { id: "32-G714", number: "714", polygon: [[22,86],[34,86],[34,94],[22,94]], type: "office" },
  { id: "32-G716", number: "716", polygon: [[34,86],[46,86],[46,94],[36,94]], type: "office" },
];

// Stata-shaped Floor 7 outline traced from the MIT facilities plan.
export const STATA_OUTLINE: Poly = [
  [10, 14],
  [44, 10],
  [70, 12],
  [82, 22],
  [88, 18],
  [92, 36],
  [86, 44],
  [94, 60],
  [82, 64],
  [86, 80],
  [72, 88],
  [56, 84],
  [46, 96],
  [28, 92],
  [22, 78],
  [10, 80],
  [4, 60],
  [12, 50],
  [6, 36],
  [16, 26],
];

export const TYPE_FILL: Record<NonNullable<RoomDef["type"]>, string> = {
  office: "#1d2538",
  lab: "#1f2940",
  common: "#212c44",
  conference: "#1a2236",
  service: "#161c2c",
  corridor: "#0f1424",
};

export function pointsAttr(poly: Poly): string {
  return poly.map(([x, y]) => `${x},${y}`).join(" ");
}

export function centroid(poly: Poly): [number, number] {
  const cx = poly.reduce((a, [x]) => a + x, 0) / poly.length;
  const cy = poly.reduce((a, [, y]) => a + y, 0) / poly.length;
  return [cx, cy];
}
