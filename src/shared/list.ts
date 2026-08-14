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

/**
 * True when the list carries per-item detail the picker cannot express. The
 * editor shows a read-only note instead of a picker in that case, so opening
 * the editor can never silently flatten a hand-tuned config.
 */
export function hasItemDetail(list: EntityListConfig): boolean {
  return normalizeEntityList(list).some(
    (item) => item.name !== undefined || item.icon !== undefined || item.color !== undefined
  );
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
