import { pool } from "../config/database";
import type { ActivePlcTag, DeadbandType } from "../types/plc";

interface ActivePlcTagRow {
  tag_id: string;
  tag_name: string;
  address_symbol: string;
  address_actual: string;
  data_type: string;
  unit: string;

  plc_id: string;
  plc_name: string;
  ip_address: string;
  rack: number;
  slot: number;

  poll_interval: number;
  deadband_type: DeadbandType;
  deadband_value: number;
  max_save_interval_seconds: number;
}

export async function getActivePlcTags(): Promise<ActivePlcTag[]> {
  const result = await pool.query<ActivePlcTagRow>(`
        SELECT
            t.id AS tag_id,
            t.tag_name,
            t.address_symbol,
            t.address_actual,
            t.data_type,
            t.unit,
            t.poll_interval,
            t.deadband_type,
            t.deadband_value,
            t.max_save_interval_seconds,
            
            p.id AS plc_id,
            p.name as plc_name,
            host(p.ip_address) as ip_address,
            p.rack,
            p.slot
        FROM plc_tag t
        JOIN plc p ON t.plc_id = p.id
        WHERE t.is_active = true 
        AND p.is_active = true
        ORDER BY p.id, t.id
    `);

  return result.rows.map((row) => ({
    tagId: Number(row.tag_id),
    tagName: row.tag_name,
    symbolicAddress: row.address_symbol,
    absoluteAddress: row.address_actual,
    dataType: row.data_type,
    unit: row.unit,

    plcId: Number(row.plc_id),
    plcName: row.plc_name,
    ipAddress: row.ip_address,
    rack: row.rack,
    slot: row.slot,

    pollInterval: row.poll_interval,
    deadbandType: row.deadband_type,
    deadbandValue: row.deadband_value,
    maxSaveIntervalSeconds: row.max_save_interval_seconds,
  }));
}

export async function getActiveTagById(
  tagId: number,
): Promise<ActivePlcTag | null> {
  const tags = await getActivePlcTags();
  return tags.find((tag) => tag.tagId === tagId) ?? null;
}
