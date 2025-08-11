import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cloudinary from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: cloudinary.TransformationOptions;
  public_id?: string;
  overwrite?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

interface CloudinaryError {
  message: string;
}

interface CloudinaryResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

interface DeleteResult {
  result: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Configure Cloudinary with proper type assertions
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Missing Cloudinary configuration');
      return;
    }

    cloudinary.v2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  /**
   * Upload a file from buffer
   */
  async uploadFile(
    fileBuffer: Buffer,
    options: UploadOptions = {},
  ): Promise<UploadResponse> {
    try {
      this.logger.log(
        `Uploading file to Cloudinary with options: ${JSON.stringify(options)}`,
      );

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder: options.folder || 'peerconnect',
            transformation: options.transformation,
            public_id: options.public_id,
            overwrite: options.overwrite || false,
            resource_type: options.resource_type || 'auto',
          },
          (
            error: CloudinaryError | undefined,
            result: CloudinaryResult | undefined,
          ) => {
            if (error) {
              this.logger.error(
                `Cloudinary upload error: ${error.message || 'Unknown error'}`,
              );
              reject(
                new BadRequestException(
                  `Upload failed: ${error.message || 'Unknown error'}`,
                ),
              );
            } else if (result) {
              this.logger.log(
                `File uploaded successfully: ${result.public_id}`,
              );
              resolve(result as UploadResponse);
            } else {
              reject(
                new BadRequestException('Upload failed: No result received'),
              );
            }
          },
        );

        // Convert buffer to stream and pipe to upload stream
        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error in uploadFile: ${errorMessage}`);
      throw new BadRequestException(`Upload failed: ${errorMessage}`);
    }
  }

  /**
   * Upload a file from base64 string
   */
  async uploadBase64(
    base64String: string,
    options: UploadOptions = {},
  ): Promise<UploadResponse> {
    try {
      this.logger.log(`Uploading base64 file to Cloudinary`);

      // Remove data URL prefix if present
      const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');

      const result = await cloudinary.v2.uploader.upload(
        `data:image/jpeg;base64,${base64Data}`,
        {
          folder: options.folder || 'peerconnect',
          transformation: options.transformation,
          public_id: options.public_id,
          overwrite: options.overwrite || false,
          resource_type: options.resource_type || 'auto',
        },
      );

      this.logger.log(`Base64 file uploaded successfully: ${result.public_id}`);
      return result as UploadResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error in uploadBase64: ${errorMessage}`);
      throw new BadRequestException(`Upload failed: ${errorMessage}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Buffer[],
    options: UploadOptions = {},
  ): Promise<UploadResponse[]> {
    try {
      this.logger.log(`Uploading ${files.length} files to Cloudinary`);

      const uploadPromises = files.map((file, index) => {
        const fileOptions = {
          ...options,
          public_id: options.public_id
            ? `${options.public_id}_${index}`
            : undefined,
        };
        return this.uploadFile(file, fileOptions);
      });

      return await Promise.all(uploadPromises);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error in uploadMultiple: ${errorMessage}`);
      throw new BadRequestException(`Multiple upload failed: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async deleteFile(
    publicId: string,
    resourceType: string = 'image',
  ): Promise<boolean> {
    try {
      this.logger.log(`Deleting file from Cloudinary: ${publicId}`);

      const result = (await cloudinary.v2.uploader.destroy(publicId, {
        resource_type: resourceType,
      })) as DeleteResult;

      this.logger.log(`File deleted successfully: ${publicId}`);
      return result.result === 'ok';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error in deleteFile: ${errorMessage}`);
      throw new BadRequestException(`Delete failed: ${errorMessage}`);
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(publicId: string): Promise<unknown> {
    try {
      this.logger.log(`Getting file info from Cloudinary: ${publicId}`);

      const result = (await cloudinary.v2.api.resource(publicId)) as Record<
        string,
        unknown
      >;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error in getFileInfo: ${errorMessage}`);
      throw new BadRequestException(`Get info failed: ${errorMessage}`);
    }
  }

  /**
   * Generate a signed upload URL for client-side uploads
   */
  generateUploadSignature(params: cloudinary.SignApiOptions = {}): any {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
      const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
      const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');

      if (!apiSecret || !apiKey || !cloudName) {
        throw new BadRequestException(
          'Missing required Cloudinary configuration',
        );
      }

      const signature = cloudinary.v2.utils.api_sign_request(
        {
          timestamp,
          ...params,
        },
        apiSecret,
      );

      return {
        timestamp,
        signature,
        api_key: apiKey,
        cloud_name: cloudName,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error generating upload signature: ${errorMessage}`);
      throw new BadRequestException(
        `Signature generation failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Transform an image URL
   */
  transformImage(
    publicId: string,
    transformation: cloudinary.TransformationOptions,
  ): string {
    try {
      return cloudinary.v2.url(publicId, { transformation });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error transforming image: ${errorMessage}`);
      throw new BadRequestException(
        `Image transformation failed: ${errorMessage}`,
      );
    }
  }
}
