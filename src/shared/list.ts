/**
 * Entity-list config, in two shapes.
 *
 * Cards that take a list of entities accept either form:
 *
 *   entities: ['sensor.a', 'sensor.b']              ← what the visual editor writes
 *   entities: [{ entity: 'sensor.a', name: '거실' }] ← YAML, when you want per-item detail
 *
 * The visual editor uses a multi-entity picker, so a plain string list is what
 * comes back from it. Keeping both shapes means the editor never destroys the
 * detail someone hand-wrote — normalize on read, write back the simple form
 * only when the user actually edits through the picker.
 */

export interface EntityItem {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  [key: string]: unknown;
}

export type EntityListConfig = (string | EntityItem)[] | undefined;

/** Both shapes → objects. Invalid entries are dropped rather than thrown. */
export function normalizeEntityList(list: EntityListConfig): EntityItem[] {
  if (!Array.isArray(list)) return [];
  const out: EntityItem[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      if (item.includes('.')) out.push({ entity: item });
    } else if (item && typeof item === 'object' && typeof item.entity === 'string') {
      out.push(item);
    }
  }
  return out;
}

/** Just the ids — for count/aggregate cards that need nothing else. */
export function entityIds(list: EntityListConfig): string[] {
  return normalizeEntityList(list).map((item) => item.entity);
}

/** True when the list carries per-item detail a bare id list cannot express. */
export function hasItemDetail(list: EntityListConfig): boolean {
  return normalizeEntityList(list).some(
    (item) => item.name !== undefined || item.icon !== undefined || item.color !== undefined
  );
}

/**
 * Fold the picker's answer (a list of ids) back into the previous list,
 * keeping whatever detail each surviving entry already had.
 *
 * This is what lets the picker stay on screen for a hand-written config:
 * removing an entity drops its entry, adding one appends a bare id, and the
 * entries that stay keep their name, icon and color untouched.
 */
export function mergeEntityList(
  previous: EntityListConfig,
  ids: string[]
): (string | EntityItem)[] {
  const byId = new Map(normalizeEntityList(previous).map((item) => [item.entity, item]));
  const merged: (string | EntityItem)[] = ids.map((id) => {
    const item = byId.get(id);
    if (!item) return id;
    const detailed = Object.keys(item).some((key) => key !== 'entity');
    return detailed ? item : id;
  });

  // Entries an entity picker cannot represent — a launcher tile that only
  // navigates, a device row built from separate battery/signal sensors — are
  // invisible to the form. Carry them through instead of letting a click in
  // the picker delete them.
  const orphans = (Array.isArray(previous) ? previous : []).filter(
    (item): item is EntityItem =>
      typeof item === 'object' && item !== null && typeof item.entity !== 'string'
  );
  return [...merged, ...orphans];
}

/** ha-form schema entry for a multi-entity picker. */
export function entityListSelector(
  name: string,
  domains?: string[],
  deviceClass?: string[]
): Record<string, unknown> {
  const entity: Record<string, unknown> = { multiple: true };
  if (domains?.length) entity.domain = domains;
  if (deviceClass?.length) entity.device_class = deviceClass;
  return { name, selector: { entity } };
}
