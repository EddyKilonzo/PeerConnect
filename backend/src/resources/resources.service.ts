import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export class CreateResourceDto {
  title: string;
  description: string;
  type: 'PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO';
  fileUrl: string;
  topicId: string;
  tags?: string[];
  thumbnailUrl?: string;
  duration?: number; // For videos/audio (in seconds)
  pageCount?: number; // For PDFs
  isPublic: boolean;
  groupId?: string; // If resource is group-specific
  allowDownload: boolean;
  allowInAppView: boolean;
}

export class UpdateResourceDto {
  title?: string;
  description?: string;
  isApproved?: boolean;
}

export class ResourceDto {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO';
  fileUrl: string;
  topic: {
    id: string;
    name: string;
  };
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  isApproved: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ResourceApprovalDto {
  isApproved: boolean;
  adminNotes?: string;
}

export class ResourceSearchDto {
  query?: string;
  type?: 'PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO';
  topicId?: string;
  tags?: string[];
  isPublic?: boolean;
  groupId?: string;
  allowDownload?: boolean;
  allowInAppView?: boolean;
  sortBy?: 'title' | 'createdAt' | 'downloadCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class ResourceFilterDto {
  types: ('PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO')[];
  topics: string[];
  tags: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileSize?: {
    min: number;
    max: number;
  };
  duration?: {
    min: number;
    max: number;
  };
  pageCount?: {
    min: number;
    max: number;
  };
}

export class ResourceViewDto {
  resourceId: string;
  userId: string;
  viewType: 'DOWNLOAD' | 'IN_APP_VIEW' | 'PREVIEW';
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async uploadResource(
    userId: string,
    dto: CreateResourceDto,
  ): Promise<ResourceDto> {
    try {
      // Verify user is a LISTENER or ADMIN
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isApproved: true },
      });

      if (!user || (user.role !== 'LISTENER' && user.role !== 'ADMIN')) {
        throw new ForbiddenException(
          'Only listeners and admins can upload resources',
        );
      }

      if (user.role === 'LISTENER' && !user.isApproved) {
        throw new ForbiddenException(
          'Listener must be approved to upload resources',
        );
      }

      // Verify topic exists
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
      });

      if (!topic) {
        throw new NotFoundException('Topic not found');
      }

      // Auto-approve resources from admins
      const isApproved = user.role === 'ADMIN';

      const resource = await this.prisma.resource.create({
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          fileUrl: dto.fileUrl,
          topicId: dto.topicId,
          uploadedById: userId,
          isApproved,
        },
        include: {
          topic: true,
          uploadedBy: true,
        },
      });

      this.logger.log(
        `Resource "${dto.title}" uploaded by user ${userId} (approved: ${isApproved})`,
      );

      return this.mapToResourceDto(resource);
    } catch (error) {
      this.logger.error(
        `Failed to upload resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async updateResource(
    userId: string,
    resourceId: string,
    dto: UpdateResourceDto,
  ): Promise<ResourceDto> {
    try {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: { topic: true, uploadedBy: true },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Check if user can update this resource
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const canUpdate =
        user?.role === 'ADMIN' ||
        (user?.role === 'LISTENER' && resource.uploadedById === userId);

      if (!canUpdate) {
        throw new ForbiddenException(
          'You can only update your own resources or must be an admin',
        );
      }

      const updatedResource = await this.prisma.resource.update({
        where: { id: resourceId },
        data: dto,
        include: {
          topic: true,
          uploadedBy: true,
        },
      });

      this.logger.log(`Resource ${resourceId} updated by user ${userId}`);

      return this.mapToResourceDto(updatedResource);
    } catch (error) {
      this.logger.error(
        `Failed to update resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async approveResource(
    adminUserId: string,
    resourceId: string,
    dto: ResourceApprovalDto,
  ): Promise<ResourceDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can approve resources');
      }

      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: { topic: true, uploadedBy: true },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      const updatedResource = await this.prisma.resource.update({
        where: { id: resourceId },
        data: {
          isApproved: dto.isApproved,
        },
        include: {
          topic: true,
          uploadedBy: true,
        },
      });

      this.logger.log(
        `Resource ${resourceId} ${dto.isApproved ? 'approved' : 'rejected'} by admin ${adminUserId}`,
      );

      // Send notifications if resource is approved
      if (dto.isApproved) {
        try {
          // Get all users interested in this topic
          const usersWithTopic = await this.prisma.user.findMany({
            where: {
              topics: {
                some: {
                  id: resource.topicId,
                },
              },
            },
            select: { id: true },
          });

          const userIds = usersWithTopic.map((user) => user.id);

          if (userIds.length > 0) {
            await this.notificationsService.notifyNewResource({
              resourceId: resource.id,
              resourceTitle: resource.title,
              topicName: resource.topic.name,
              uploadedByName: `${resource.uploadedBy.firstName} ${resource.uploadedBy.lastName}`,
              userIds,
            });
          }
        } catch (notificationError) {
          this.logger.error(
            `Failed to send new resource notifications: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`,
          );
          // Don't fail the resource approval if notifications fail
        }
      }

      return this.mapToResourceDto(updatedResource);
    } catch (error) {
      this.logger.error(
        `Failed to approve resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteResource(userId: string, resourceId: string): Promise<void> {
    try {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        select: { uploadedById: true },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Check if user can delete this resource
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const canDelete =
        user?.role === 'ADMIN' ||
        (user?.role === 'LISTENER' && resource.uploadedById === userId);

      if (!canDelete) {
        throw new ForbiddenException(
          'You can only delete your own resources or must be an admin',
        );
      }

      await this.prisma.resource.delete({
        where: { id: resourceId },
      });

      this.logger.log(`Resource ${resourceId} deleted by user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getResource(resourceId: string): Promise<ResourceDto> {
    try {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          topic: true,
          uploadedBy: true,
        },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Only return approved resources to regular users
      if (!resource.isApproved) {
        throw new NotFoundException('Resource not found');
      }

      return this.mapToResourceDto(resource);
    } catch (error) {
      this.logger.error(
        `Failed to get resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getResourcesByTopic(
    topicId: string,
    includeUnapproved: boolean = false,
  ): Promise<ResourceDto[]> {
    try {
      const whereClause: {
        topicId: string;
        isApproved?: boolean;
      } = {
        topicId,
      };

      if (!includeUnapproved) {
        whereClause.isApproved = true;
      }

      const resources = await this.prisma.resource.findMany({
        where: whereClause,
        include: {
          topic: true,
          uploadedBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return resources.map((resource) => this.mapToResourceDto(resource));
    } catch (error) {
      this.logger.error(
        `Failed to get resources by topic ${topicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAllResources(
    includeUnapproved: boolean = false,
  ): Promise<ResourceDto[]> {
    try {
      const whereClause: {
        isApproved?: boolean;
      } = {};

      if (!includeUnapproved) {
        whereClause.isApproved = true;
      }

      const resources = await this.prisma.resource.findMany({
        where: whereClause,
        include: {
          topic: true,
          uploadedBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return resources.map((resource) => this.mapToResourceDto(resource));
    } catch (error) {
      this.logger.error(
        `Failed to get all resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getPendingApprovalResources(): Promise<ResourceDto[]> {
    try {
      const resources = await this.prisma.resource.findMany({
        where: {
          isApproved: false,
        },
        include: {
          topic: true,
          uploadedBy: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return resources.map((resource) => this.mapToResourceDto(resource));
    } catch (error) {
      this.logger.error(
        `Failed to get pending approval resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async incrementDownloadCount(resourceId: string): Promise<void> {
    try {
      await this.prisma.resource.update({
        where: { id: resourceId },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

      this.logger.log(`Download count incremented for resource ${resourceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to increment download count for resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw error for download count tracking
    }
  }

  // Download resource and track usage
  async downloadResource(
    resourceId: string,
    userId: string,
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }> {
    try {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          topic: true,
        },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      if (!resource.isApproved) {
        throw new ForbiddenException('Resource is not approved for download');
      }

      // Track the download
      this.trackResourceView({
        resourceId,
        userId,
        viewType: 'DOWNLOAD',
        timestamp: new Date(),
      });

      // Increment download count
      await this.incrementDownloadCount(resourceId);

      // Generate filename from title
      const fileName = this.generateFileName(resource.title, resource.type);

      // Determine content type based on resource type
      const contentType = this.getContentType(resource.type);

      return {
        downloadUrl: resource.fileUrl,
        fileName,
        contentType,
        fileSize: 0, // You can implement file size detection if needed
      };
    } catch (error) {
      this.logger.error(
        `Failed to download resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Stream resource for in-app viewing
  async streamResource(
    resourceId: string,
    userId: string,
  ): Promise<{
    streamUrl: string;
    contentType: string;
    fileName: string;
  }> {
    try {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      if (!resource.isApproved) {
        throw new ForbiddenException('Resource is not approved for viewing');
      }

      // Track the view
      this.trackResourceView({
        resourceId,
        userId,
        viewType: 'IN_APP_VIEW',
        timestamp: new Date(),
      });

      return {
        streamUrl: resource.fileUrl,
        contentType: this.getContentType(resource.type),
        fileName: this.generateFileName(resource.title, resource.type),
      };
    } catch (error) {
      this.logger.error(
        `Failed to stream resource ${resourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Helper method to generate filename
  private generateFileName(title: string, type: string): string {
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    const extension = this.getFileExtension(type);
    return `${sanitizedTitle}.${extension}`;
  }

  // Helper method to get file extension
  private getFileExtension(type: string): string {
    switch (type) {
      case 'PDF':
        return 'pdf';
      case 'VIDEO':
        return 'mp4';
      case 'AUDIO':
        return 'mp3';
      case 'ARTICLE':
        return 'html';
      default:
        return 'txt';
    }
  }

  // Helper method to get content type
  private getContentType(type: string): string {
    switch (type) {
      case 'PDF':
        return 'application/pdf';
      case 'VIDEO':
        return 'video/mp4';
      case 'AUDIO':
        return 'audio/mpeg';
      case 'ARTICLE':
        return 'text/html';
      default:
        return 'application/octet-stream';
    }
  }

  // Track resource view/download
  trackResourceView(viewDto: ResourceViewDto): void {
    try {
      // For now, we'll just log the view
      // In production, you might want to store this in a database
      this.logger.log(
        `Resource view tracked: ${viewDto.resourceId} by user ${viewDto.userId} - ${viewDto.viewType}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track resource view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw error for tracking
    }
  }

  async searchResources(
    query: string,
    topicId?: string,
  ): Promise<ResourceDto[]> {
    try {
      const whereClause: {
        isApproved: boolean;
        OR: Array<{
          title?: { contains: string; mode: 'insensitive' };
          description?: { contains: string; mode: 'insensitive' };
        }>;
        topicId?: string;
      } = {
        isApproved: true,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      };

      if (topicId) {
        whereClause.topicId = topicId;
      }

      const resources = await this.prisma.resource.findMany({
        where: whereClause,
        include: {
          topic: true,
          uploadedBy: true,
        },
        orderBy: {
          downloadCount: 'desc',
        },
      });

      return resources.map((resource) => this.mapToResourceDto(resource));
    } catch (error) {
      this.logger.error(
        `Failed to search resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private mapToResourceDto(resource: {
    id: string;
    title: string;
    description: string;
    type: 'PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO';
    fileUrl: string;
    topic: {
      id: string;
      name: string;
    };
    uploadedBy: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    isApproved: boolean;
    downloadCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): ResourceDto {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      fileUrl: resource.fileUrl,
      topic: {
        id: resource.topic.id,
        name: resource.topic.name,
      },
      uploadedBy: {
        id: resource.uploadedBy.id,
        firstName: resource.uploadedBy.firstName,
        lastName: resource.uploadedBy.lastName,
        role: resource.uploadedBy.role,
      },
      isApproved: resource.isApproved,
      downloadCount: resource.downloadCount,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}
