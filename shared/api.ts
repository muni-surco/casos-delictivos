/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type CaseStatus = "Open" | "Investigating" | "Closed";

export interface CaseMedia {
  id: string;
  type: "image" | "video";
  url: string; // public URL under /uploads
  filename: string;
  createdAt: string; // ISO date
}

export interface CrimeCase {
  id: string;
  code: number;
  title: string;
  place: string;
  description: string;
  crimeType: string;
  date: string; // YYYY-MM-DD
  hour: string; // HH:MM
  status: CaseStatus;
  latitude: number;
  longitude: number;
  suspect?: string;
  victim?: string;
  cuadrante?: number;
  sector?: number;
  escapeRoute?: string;
  suspectDescription?: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  media: CaseMedia[];
}

export interface CreateCaseInput {
  code: number;
  title: string;
  place: string;
  description?: string;
  crimeType: string;
  date: string;
  hour: string;
  status: CaseStatus;
  latitude: number;
  longitude: number;
  suspect?: string;
  victim?: string;
  cuadrante?: number;
  sector?: number;
  escapeRoute?: string;
  suspectDescription?: string;
}

export interface UpdateCaseInput extends Partial<CreateCaseInput> {}
