// Auto-generated TypeScript definitions from Pydantic models
// DO NOT EDIT MANUALLY - regenerate with export_schemas.py

export interface Resource {
  id: number;
  program: string;
  description: string;
  organization: string;
  contact: any;
  metadata: any;
}

export interface Contact {
  address?: string | any;
  email?: string | any;
  website?: string | any;
  phone?: string | any;
}

export interface Metadata {
  category?: string | any;
  tags?: string[];
  status?: string;
  source_file?: string | any;
}

export interface Dataset {
  name: string;
  source_file: string;
  resource_count?: number;
}

// Helper types for validation
export type SchemaValidationResult<T> = {
  valid: boolean;
  data?: T;
  errors?: string[];
};

// Schema definitions for runtime validation
export const SCHEMAS = {
  Resource: require("./schemas/resource.schema.json"),
  Contact: require("./schemas/contact.schema.json"),
  Metadata: require("./schemas/metadata.schema.json"),
  Dataset: require("./schemas/dataset.schema.json"),
};