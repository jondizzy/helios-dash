import { pool } from "../config/database";
import type {
  MeasurementState,
  SaveMeasurementInput,
  SaveMeasurement,
} from "../types/plc";

interface SaveMeasurementRow {
  id: string;
  tag_id: string;
  value_number: number;
  fetched_at: Date;
  created_at: Date;
}

interface LatestMeasurementRow {
  tag_id: string;
  value_number: number;
  fetched_at: Date;
}

export async function insertMeasurement(
  input: SaveMeasurementInput,
): Promise<SaveMeasurement> {
  const result = await pool.query<SaveMeasurementRow>(
    `
            INSERT INTO measurement (
            tag_id,
            value_number,
            fetched_at
            ) VALUES ($1, $2, $3)
            RETURNING id, tag_id, value_number, fetched_at, created_at
        `,
    [input.tagId, input.value_number, input.fetchedAt],
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    tagId: Number(row.tag_id),
    value_number: row.value_number,
    fetchedAt: new Date(row.fetched_at),
    createdAt: new Date(row.created_at),
  };
}

export async function getLatestMeasurementStates(): Promise<
  Map<number, MeasurementState>
> {
  const result = await pool.query<LatestMeasurementRow>(`
        SELECT DISTINCT ON (tag_id)
            tag_id,
            value_number,
            fetched_at
            
            FROM measurement
            
            ORDER BY tag_id, fetched_at DESC,
            id DESC
    `);

  const states = new Map<number, MeasurementState>();
  for (const row of result.rows) {
    states.set(Number(row.tag_id), {
      lastSavedValue: row.value_number,
      lastSavedAt: new Date(row.fetched_at),
    });
  }
  return states;
}

export async function getLatestMeasurementForTag(
  tagId: number,
): Promise<MeasurementState | null> {
  const result = await pool.query<LatestMeasurementRow>(
    `
        SELECT
            tag_id,
            value_number,
            fetched_at
            
            FROM measurement
            
            WHERE tag_id = $1
            ORDER BY fetched_at DESC,
            id DESC
            LIMIT 1
    `,
    [tagId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    lastSavedValue: row.value_number,
    lastSavedAt: new Date(row.fetched_at),
  };
}

export interface MeasurementListItem {
  id: number;
  tagId: number;
  tagName: string;
  plcId: number;
  plcName: string;
  value_number: number;
  unit: string;
  fetchedAt: Date;
}

interface MeasurementListRow {
  id: number;
  tag_id: number;
  tag_name: string;
  plc_id: number;
  plc_name: string;
  value_number: number;
  unit: string;
  fetched_at: Date;
}

export async function getMeasurements(options: {
  tagId?: number;
  plcId?: number;
  limit: number;
}): Promise<MeasurementListItem[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.tagId !== undefined) {
    values.push(options.tagId);
    conditions.push(`m.tag_id = $${values.length}`);
  }

  if (options.plcId !== undefined) {
    values.push(options.plcId);
    conditions.push(`p.id = $${values.length}`);
  }

  values.push(options.limit);

  const whereclase =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limitParameter = `$${values.length}`;

  const result = await pool.query<MeasurementListRow>(
    `
    SELECT
        m.id,
        m.tag_id,
        m.tag_name,
        
        p.id AS plc_id,
        p.name AS plc_name,
        
        m.value_number,
        m.fetched_at,

        t.unit,
        
        FROM measurement m

        INNER JOIN plc_tag t ON m.tag_id = t.id
        INNER JOIN plc p ON t.plc_id = p.id
        ${whereclase}
        ORDER BY m.fetched_at DESC, m.id DESC
        LIMIT ${limitParameter}
        `,
    values,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    tagId: Number(row.tag_id),
    tagName: row.tag_name,
    plcId: Number(row.plc_id),
    plcName: row.plc_name,
    value_number: row.value_number,
    unit: row.unit,
    fetchedAt: new Date(row.fetched_at),
  }));
}
