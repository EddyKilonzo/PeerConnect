export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export interface UploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
  created_at: string;
  tags?: string[];
  context?: Record<string, string>;
}

export interface UploadOptions {
  folder?: string;
  transformation?: any;
  public_id?: string;
  overwrite?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  tags?: string[];
  context?: Record<string, string>;
}

export interface DeleteResponse {
  result: string;
  deleted?: Record<string, string>;
}

export interface ResourceInfo {
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  created_at: string;
  bytes: number;
  url: string;
  secure_url: string;
  tags: string[];
  context: Record<string, string>;
}

export interface UploadSignature {
  timestamp: number;
  signature: string;
  api_key: string;
  cloud_name: string;
}

export interface ImageTransformation {
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  quality?: string;
  format?: string;
  radius?: number;
  effect?: string;
  overlay?: string;
  underlay?: string;
}
