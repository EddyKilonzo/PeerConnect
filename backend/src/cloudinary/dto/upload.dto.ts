import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class UploadSingleDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({ description: 'Folder to upload to' })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class UploadMultipleDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Files to upload',
  })
  @IsArray()
  files: Express.Multer.File[];

  @ApiPropertyOptional({ description: 'Folder to upload to' })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class UploadBase64Dto {
  @ApiProperty({ description: 'Base64 encoded file string' })
  @IsString()
  base64String: string;

  @ApiPropertyOptional({ description: 'Folder to upload to' })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class DeleteFileDto {
  @ApiPropertyOptional({
    description: 'Resource type (image, video, raw)',
    default: 'image',
  })
  @IsOptional()
  @IsEnum(['image', 'video', 'raw'])
  resourceType?: 'image' | 'video' | 'raw';
}

export class TransformImageDto {
  @ApiProperty({ description: 'Transformation parameters object' })
  transformation: any;
}

export class GenerateSignatureDto {
  @ApiPropertyOptional({ description: 'Additional parameters for signature' })
  @IsOptional()
  params?: any;
}
