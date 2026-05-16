import { invoke } from '@tauri-apps/api/core';

export interface ValidationIssue {
  severity: string;
  field: string;
  message: string;
}

export interface QualityIssue {
  category: string;
  severity: string;
  message: string;
}

export interface QualityReport {
  issues: QualityIssue[];
  score: number;
}

export async function migrateProjectV3(json: unknown): Promise<unknown> {
  return invoke('migrate_project_v3', { json });
}

export async function validateProjectSchema(json: unknown): Promise<ValidationIssue[]> {
  return invoke('validate_project_schema', { json });
}

export async function generateQualityReport(json: unknown): Promise<QualityReport> {
  return invoke('generate_quality_report', { json });
}
