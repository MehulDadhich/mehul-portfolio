/**
 * Where each station of the continuous shot sits, shared by the 3D engine and the page's section anchors.
 *
 * The camera path is authored in "path" units (0–1 along the flight). Scroll maps onto it non-linearly:
 * the opening lift-off from the RoadGuard road is short (the full RoadGuard chapter plays just before),
 * and the rest of the scroll is spent on the new stations.
 */

/** Scroll fraction spent lifting off the road before the flight reaches the foundry. */
export const LIFT = 0.05;
/** Where the foundry begins on the path; the lift-off covers path 0 → this. */
const LIFT_PATH = 0.15;

export const pathAt = (scroll: number) =>
  scroll < LIFT ? (scroll / LIFT) * LIFT_PATH : LIFT_PATH + ((scroll - LIFT) / (1 - LIFT)) * (1 - LIFT_PATH);

export const scrollAt = (path: number) =>
  path <= LIFT_PATH ? (path / LIFT_PATH) * LIFT : LIFT + ((path - LIFT_PATH) / (1 - LIFT_PATH)) * (1 - LIFT);

/** Stations: path position where each begins, its name, the camera's z there, and the page anchor it owns. */
export const STATIONS = [
  { at: 0, name: "Lift-off", z: 0, id: null },
  { at: 0.15, name: "Work", z: -40, id: "work" },
  { at: 0.41, name: "Experience", z: -70, id: "experience" },
  { at: 0.59, name: "Skills", z: -125, id: "skills" },
  { at: 0.77, name: "Journey", z: -175, id: "journey" },
  { at: 0.92, name: "Contact", z: -214.5, id: "contact" },
] as const;

/** Inside the journey stretch, where the certifications sign is (the `achievements` anchor). */
export const CERTS_AT = 0.835;

/** Total scroll length of the shot, in viewport heights. */
export const SHOT_VH = 1150;
