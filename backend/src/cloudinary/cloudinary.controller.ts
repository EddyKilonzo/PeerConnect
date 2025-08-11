import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CloudinaryService, UploadResponse } from './cloudinary.service';

@ApiTags('Cloudinary')
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload/single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Folder to upload to (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadSingle(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|gif|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.cloudinaryService.uploadFile(file.buffer, { folder });
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        folder: {
          type: 'string',
          description: 'Folder to upload to (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadMultiple(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|gif|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ): Promise<UploadResponse[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const fileBuffers = files.map((file) => file.buffer);
    return this.cloudinaryService.uploadMultiple(fileBuffers, { folder });
  }

  @Post('upload/base64')
  @ApiOperation({ summary: 'Upload a file from base64 string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        base64String: {
          type: 'string',
          description: 'Base64 encoded file string',
        },
        folder: {
          type: 'string',
          description: 'Folder to upload to (optional)',
        },
      },
      required: ['base64String'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadBase64(
    @Body('base64String') base64String: string,
    @Body('folder') folder?: string,
  ): Promise<UploadResponse> {
    if (!base64String) {
      throw new BadRequestException('Base64 string is required');
    }

    return this.cloudinaryService.uploadBase64(base64String, { folder });
  }

  @Delete('delete/:publicId')
  @ApiOperation({ summary: 'Delete a file from Cloudinary' })
  @ApiParam({
    name: 'publicId',
    description: 'Public ID of the file to delete',
  })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(
    @Param('publicId') publicId: string,
    @Body('resourceType') resourceType: string = 'image',
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.cloudinaryService.deleteFile(
      publicId,
      resourceType,
    );
    return {
      success,
      message: success ? 'File deleted successfully' : 'Failed to delete file',
    };
  }

  @Get('info/:publicId')
  @ApiOperation({ summary: 'Get file information' })
  @ApiParam({ name: 'publicId', description: 'Public ID of the file' })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
  })
  async getFileInfo(@Param('publicId') publicId: string): Promise<any> {
    return this.cloudinaryService.getFileInfo(publicId);
  }

  @Post('signature')
  @ApiOperation({
    summary: 'Generate upload signature for client-side uploads',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        params: {
          type: 'object',
          description: 'Additional parameters for signature',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Signature generated successfully' })
  async generateSignature(@Body('params') params: any = {}): Promise<any> {
    return this.cloudinaryService.generateUploadSignature(params);
  }

  @Post('transform/:publicId')
  @ApiOperation({ summary: 'Transform an image URL' })
  @ApiParam({ name: 'publicId', description: 'Public ID of the image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transformation: {
          type: 'object',
          description: 'Transformation parameters',
        },
      },
      required: ['transformation'],
    },
  })
  @ApiResponse({ status: 200, description: 'Image transformed successfully' })
  async transformImage(
    @Param('publicId') publicId: string,
    @Body('transformation') transformation: any,
  ): Promise<{ transformedUrl: string }> {
    const transformedUrl = this.cloudinaryService.transformImage(
      publicId,
      transformation,
    );
    return { transformedUrl };
  }
}
