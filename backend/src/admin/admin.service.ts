import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class ListenerApplicationDto {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
  };
  bio: string;
  experience: string;
  topics: string[];
  motivation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateApplicationStatusDto {
  status: 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
}

export class UserManagementDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'LISTENER' | 'USER';
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AVAILABLE';
  isEmailVerified: boolean;
  isApproved: boolean;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateUserRoleDto {
  role: 'ADMIN' | 'LISTENER' | 'USER';
}

export class UpdateUserApprovalDto {
  isApproved: boolean;
  adminNotes: string | null;
}

export class PlatformStatsDto {
  totalUsers: number;
  totalListeners: number;
  totalAdmins: number;
  pendingApplications: number;
  pendingResources: number;
  activeGroups: number;
  totalSessions: number;
  totalResources: number;
}

// New DTOs for Group Management
export class AdminGroupDto {
  id: string;
  name: string;
  description: string | null;
  topicId: string;
  topic: {
    name: string;
    description: string | null;
  };
  leaderId: string | null;
  leader: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  isActive: boolean;
  maxMembers: number;
  meetingSchedule: string | null;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateGroupStatusDto {
  isActive: boolean;
  adminNotes: string | null;
}

// New DTOs for Session Management
export class AdminSessionDto {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  listenerId: string;
  listener: {
    firstName: string;
    lastName: string;
    email: string;
  };
  topicId: string;
  topic: {
    name: string;
    description: string | null;
  };
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startTime: Date;
  endTime: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// New DTOs for Summary Management
export class AdminSessionSummaryDto {
  id: string;
  sessionId: string;
  session: {
    userId: string;
    listenerId: string;
    topicId: string;
    status: string;
  };
  keyPoints: string[];
  emotionalTone: string;
  actionItems: string[];
  suggestedResources: string[];
  aiGenerated: boolean;
  pdfUrl: string | null;
  createdAt: Date;
}

export class AdminGroupSummaryDto {
  id: string;
  groupId: string;
  group: {
    name: string;
    topicId: string;
  };
  topicsCovered: string[];
  groupSentiment: string;
  recommendedResources: string[];
  aiGenerated: boolean;
  pdfUrl: string | null;
  createdAt: Date;
}

// New DTOs for Resource Management
export class AdminResourceDto {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO';
  fileUrl: string;
  topicId: string;
  topic: {
    name: string;
    description: string | null;
  };
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isApproved: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateResourceStatusDto {
  isApproved: boolean;
}

export class ResourceStatsDto {
  totalResources: number;
  approvedResources: number;
  pendingResources: number;
  topDownloadedResources: number;
}

// New DTOs for Group Leadership Assignment
export class AssignGroupLeaderDto {
  listenerId: string;
  adminNotes: string | null;
}

export class SuitableLeaderDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string | null;
  bio: string | null;
  experience: string;
  topics: string[];
  motivation: string;
  topicMatchScore: number;
  isApproved: boolean;
  currentGroups: number;
  createdAt: Date;
}

export class ReviewListenerApplicationDto {
  status: 'APPROVED' | 'REJECTED';
  adminNotes?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Listener Application Management
  async getPendingListenerApplications(): Promise<ListenerApplicationDto[]> {
    try {
      const applications = await this.prisma.listenerApplication.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return applications.map((app) => this.mapToListenerApplicationDto(app));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get pending listener applications: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getAllListenerApplications(): Promise<ListenerApplicationDto[]> {
    try {
      const applications = await this.prisma.listenerApplication.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return applications.map((app) => this.mapToListenerApplicationDto(app));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get all listener applications: ${errorMessage}`,
      );
      throw error;
    }
  }

  async updateListenerApplicationStatus(
    adminUserId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<ListenerApplicationDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException(
          'Only admins can update application status',
        );
      }

      const application = await this.prisma.listenerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });

      if (!application) {
        throw new NotFoundException('Listener application not found');
      }

      if (application.status !== 'PENDING') {
        throw new BadRequestException('Application has already been reviewed');
      }

      // Update application status
      const updatedApplication = await this.prisma.listenerApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          adminNotes: dto.adminNotes,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      // If approved, update user role and approval status
      if (dto.status === 'APPROVED') {
        await this.prisma.user.update({
          where: { id: application.userId },
          data: {
            role: 'LISTENER',
            isApproved: true,
          },
        });

        this.logger.log(
          `Listener application ${applicationId} approved by admin ${adminUserId}`,
        );
      } else {
        this.logger.log(
          `Listener application ${applicationId} rejected by admin ${adminUserId}`,
        );
      }

      return this.mapToListenerApplicationDto(updatedApplication);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update application status ${applicationId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async reviewListenerApplication(
    applicationId: string,
    adminId: string,
    dto: ReviewListenerApplicationDto,
  ): Promise<void> {
    try {
      // Get the application
      const application = await this.prisma.listenerApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new NotFoundException('Listener application not found');
      }

      if (application.status !== 'PENDING') {
        throw new BadRequestException('Application has already been reviewed');
      }

      // Update application status
      await this.prisma.listenerApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          adminNotes: dto.adminNotes,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // If approved, update user role to LISTENER
      if (dto.status === 'APPROVED') {
        await this.prisma.user.update({
          where: { id: application.userId },
          data: {
            role: 'LISTENER',
            isApproved: true,
          },
        });

        this.logger.log(
          `User ${application.userId} approved as listener by admin ${adminId}`,
        );
      } else {
        this.logger.log(
          `User ${application.userId} rejected as listener by admin ${adminId}`,
        );
      }

      this.logger.log(
        `Listener application ${applicationId} reviewed by admin ${adminId} with status: ${dto.status}`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to review listener application ${applicationId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getListenerApplicationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const [total, pending, approved, rejected] = await Promise.all([
        this.prisma.listenerApplication.count(),
        this.prisma.listenerApplication.count({ where: { status: 'PENDING' } }),
        this.prisma.listenerApplication.count({
          where: { status: 'APPROVED' },
        }),
        this.prisma.listenerApplication.count({
          where: { status: 'REJECTED' },
        }),
      ]);

      return { total, pending, approved, rejected };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to get listener application stats:',
        errorMessage,
      );
      throw error;
    }
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalListeners: number;
    totalGroups: number;
    totalSessions: number;
    totalResources: number;
    listenerApplications: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  }> {
    try {
      const [
        totalUsers,
        totalListeners,
        totalGroups,
        totalSessions,
        totalResources,
        listenerApplications,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'LISTENER' } }),
        this.prisma.group.count(),
        this.prisma.session.count(),
        this.prisma.resource.count(),
        this.getListenerApplicationStats(),
      ]);

      return {
        totalUsers,
        totalListeners,
        totalGroups,
        totalSessions,
        totalResources,
        listenerApplications,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get system stats:', errorMessage);
      throw error;
    }
  }

  // User Management
  async getAllUsers(): Promise<UserManagementDto[]> {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map((user) => this.mapToUserManagementDto(user));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all users: ${errorMessage}`);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserManagementDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return this.mapToUserManagementDto(user);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user ${userId}: ${errorMessage}`);
      throw error;
    }
  }

  async updateUserRole(
    adminUserId: string,
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<UserManagementDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can update user roles');
      }

      // Prevent admin from changing their own role
      if (adminUserId === userId) {
        throw new BadRequestException('Cannot change your own role');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: dto.role,
          // Reset approval status when changing to listener
          isApproved: dto.role === 'LISTENER' ? false : user.isApproved,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `User ${userId} role updated to ${dto.role} by admin ${adminUserId}`,
      );

      return this.mapToUserManagementDto(updatedUser);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update user role ${userId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async updateUserApproval(
    adminUserId: string,
    userId: string,
    dto: UpdateUserApprovalDto,
  ): Promise<UserManagementDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException(
          'Only admins can update user approval status',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Only listeners can have approval status
      if (user.role !== 'LISTENER') {
        throw new BadRequestException(
          'Only listeners can have approval status',
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          isApproved: dto.isApproved,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isApproved: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `User ${userId} approval status updated to ${dto.isApproved} by admin ${adminUserId}`,
      );

      return this.mapToUserManagementDto(updatedUser);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update user approval ${userId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async deleteUser(adminUserId: string, userId: string): Promise<void> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can delete users');
      }

      // Prevent admin from deleting themselves
      if (adminUserId === userId) {
        throw new BadRequestException('Cannot delete your own account');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete user and related data
      await this.prisma.user.delete({
        where: { id: userId },
      });

      this.logger.log(`User ${userId} deleted by admin ${adminUserId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete user ${userId}: ${errorMessage}`);
      throw error;
    }
  }

  // Platform Statistics
  async getPlatformStats(): Promise<PlatformStatsDto> {
    try {
      const [
        totalUsers,
        totalListeners,
        totalAdmins,
        pendingApplications,
        pendingResources,
        activeGroups,
        totalSessions,
        totalResources,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'LISTENER' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.listenerApplication.count({ where: { status: 'PENDING' } }),
        this.prisma.resource.count({ where: { isApproved: false } }),
        this.prisma.group.count({ where: { isActive: true } }),
        this.prisma.session.count(),
        this.prisma.resource.count(),
      ]);

      return {
        totalUsers,
        totalListeners,
        totalAdmins,
        pendingApplications,
        pendingResources,
        activeGroups,
        totalSessions,
        totalResources,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get platform stats: ${errorMessage}`);
      throw error;
    }
  }

  // Group Management
  async getAllGroups(): Promise<AdminGroupDto[]> {
    try {
      const groups = await this.prisma.group.findMany({
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          leader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return groups.map((group) => this.mapToAdminGroupDto(group));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all groups: ${errorMessage}`);
      throw error;
    }
  }

  async getGroupById(groupId: string): Promise<AdminGroupDto> {
    try {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          leader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      return this.mapToAdminGroupDto(group);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get group ${groupId}: ${errorMessage}`);
      throw error;
    }
  }

  async updateGroupStatus(
    adminUserId: string,
    groupId: string,
    dto: UpdateGroupStatusDto,
  ): Promise<AdminGroupDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can update group status');
      }

      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          leader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const updatedGroup = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          isActive: dto.isActive,
        },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          leader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      this.logger.log(
        `Group ${groupId} status updated to ${dto.isActive} by admin ${adminUserId}`,
      );

      return this.mapToAdminGroupDto(updatedGroup);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update group status ${groupId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async deleteGroup(adminUserId: string, groupId: string): Promise<void> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can delete groups');
      }

      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Delete group and related data
      await this.prisma.group.delete({
        where: { id: groupId },
      });

      this.logger.log(`Group ${groupId} deleted by admin ${adminUserId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete group ${groupId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async assignGroupLeader(
    adminUserId: string,
    groupId: string,
    dto: AssignGroupLeaderDto,
  ): Promise<AdminGroupDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can assign group leaders');
      }

      // Verify the group exists
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          leader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Verify the listener exists and is approved
      const listener = await this.prisma.user.findUnique({
        where: { id: dto.listenerId },
        select: { role: true, isApproved: true },
      });

      if (!listener) {
        throw new NotFoundException('Listener not found');
      }

      if (listener.role !== 'LISTENER') {
        throw new BadRequestException(
          'User must be a listener to be assigned as group leader',
        );
      }

      if (!listener.isApproved) {
        throw new BadRequestException(
          'Listener must be approved to be assigned as group leader',
        );
      }

      // Update the group with the new leader
      const updatedGroup = await this.prisma.group.update({
        where: { id: groupId },
        data: {
          leaderId: dto.listenerId,
        },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          leader: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      this.logger.log(
        `Group ${groupId} leader assigned to ${dto.listenerId} by admin ${adminUserId}`,
      );

      return this.mapToAdminGroupDto(updatedGroup);
    } catch (error) {
      this.logger.error(
        `Failed to assign group leader for group ${groupId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getSuitableLeaders(groupId: string): Promise<SuitableLeaderDto[]> {
    try {
      // Get the group and its topic
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          topic: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Get all approved listeners with their applications
      const listeners = await this.prisma.user.findMany({
        where: {
          role: 'LISTENER',
          isApproved: true,
        },
        include: {
          listenerApplication: {
            select: {
              topics: true,
              experience: true,
              motivation: true,
            },
          },
          _count: {
            select: {
              groupLeadership: true,
            },
          },
        },
      });

      // Calculate topic match scores and filter suitable leaders
      const suitableLeaders = listeners
        .map((listener) => {
          if (!listener.listenerApplication) {
            return null;
          }

          const topicMatchScore = this.calculateTopicMatchScore(
            group.topic.name,
            listener.listenerApplication.topics,
          );

          // Only include listeners with some topic relevance
          if (topicMatchScore === 0) {
            return null;
          }

          return {
            id: listener.id,
            firstName: listener.firstName,
            lastName: listener.lastName,
            email: listener.email,
            profilePicture: listener.profilePicture,
            bio: listener.bio,
            experience: listener.listenerApplication.experience,
            topics: listener.listenerApplication.topics,
            motivation: listener.listenerApplication.motivation,
            topicMatchScore,
            isApproved: listener.isApproved,
            currentGroups: listener._count.groupLeadership,
            createdAt: listener.createdAt,
          };
        })
        .filter(
          (leader): leader is NonNullable<typeof leader> => leader !== null,
        )
        .sort((a, b) => b.topicMatchScore - a.topicMatchScore);

      return suitableLeaders;
    } catch (error) {
      this.logger.error(
        `Failed to get suitable leaders for group ${groupId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Session Management
  async getAllSessions(): Promise<AdminSessionDto[]> {
    try {
      const sessions = await this.prisma.session.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          listener: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return sessions.map((session) => this.mapToAdminSessionDto(session));
    } catch (error) {
      this.logger.error(
        `Failed to get all sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getSessionById(sessionId: string): Promise<AdminSessionDto> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          listener: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      return this.mapToAdminSessionDto(session);
    } catch (error) {
      this.logger.error(
        `Failed to get session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteSession(adminUserId: string, sessionId: string): Promise<void> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can delete sessions');
      }

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Delete session and related data
      await this.prisma.session.delete({
        where: { id: sessionId },
      });

      this.logger.log(`Session ${sessionId} deleted by admin ${adminUserId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Summary Management
  async getAllSessionSummaries(): Promise<AdminSessionSummaryDto[]> {
    try {
      const summaries = await this.prisma.sessionSummary.findMany({
        include: {
          session: {
            select: {
              userId: true,
              listenerId: true,
              topicId: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return summaries.map((summary) =>
        this.mapToAdminSessionSummaryDto(summary),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get all session summaries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAllGroupSummaries(): Promise<AdminGroupSummaryDto[]> {
    try {
      const summaries = await this.prisma.groupSummary.findMany({
        include: {
          group: {
            select: {
              name: true,
              topicId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return summaries.map((summary) =>
        this.mapToAdminGroupSummaryDto(summary),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get all group summaries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteSessionSummary(
    adminUserId: string,
    summaryId: string,
  ): Promise<void> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException(
          'Only admins can delete session summaries',
        );
      }

      const summary = await this.prisma.sessionSummary.findUnique({
        where: { id: summaryId },
      });

      if (!summary) {
        throw new NotFoundException('Session summary not found');
      }

      // Delete session summary
      await this.prisma.sessionSummary.delete({
        where: { id: summaryId },
      });

      this.logger.log(
        `Session summary ${summaryId} deleted by admin ${adminUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete session summary ${summaryId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteGroupSummary(
    adminUserId: string,
    summaryId: string,
  ): Promise<void> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can delete group summaries');
      }

      const summary = await this.prisma.groupSummary.findUnique({
        where: { id: summaryId },
      });

      if (!summary) {
        throw new NotFoundException('Group summary not found');
      }

      // Delete group summary
      await this.prisma.groupSummary.delete({
        where: { id: summaryId },
      });

      this.logger.log(
        `Group summary ${summaryId} deleted by admin ${adminUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete group summary ${summaryId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Resource Management
  async getAllResources(): Promise<AdminResourceDto[]> {
    try {
      const resources = await this.prisma.resource.findMany({
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return resources.map((resource) => this.mapToAdminResourceDto(resource));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all resources: ${errorMessage}`);
      throw error;
    }
  }

  async getResourceById(resourceId: string): Promise<AdminResourceDto> {
    try {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      return this.mapToAdminResourceDto(resource);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get resource ${resourceId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async updateResourceStatus(
    adminUserId: string,
    resourceId: string,
    dto: UpdateResourceStatusDto,
  ): Promise<AdminResourceDto> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can update resource status');
      }

      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Prevent approving a resource that is already approved or rejected
      if (resource.isApproved) {
        throw new BadRequestException('Resource has already been reviewed');
      }

      // Update resource status
      await this.prisma.resource.update({
        where: { id: resourceId },
        data: {
          isApproved: dto.isApproved,
        },
      });

      this.logger.log(
        `Resource ${resourceId} status updated to ${dto.isApproved} by admin ${adminUserId}`,
      );

      // Fetch updated resource with topic information
      const updatedResource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          topic: {
            select: {
              name: true,
              description: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!updatedResource) {
        throw new NotFoundException('Resource not found after update');
      }

      return this.mapToAdminResourceDto(updatedResource);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update resource status ${resourceId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async deleteResource(adminUserId: string, resourceId: string): Promise<void> {
    try {
      // Verify admin user
      const adminUser = await this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });

      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can delete resources');
      }

      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Delete resource and related data
      await this.prisma.resource.delete({
        where: { id: resourceId },
      });

      this.logger.log(`Resource ${resourceId} deleted by admin ${adminUserId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete resource ${resourceId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getResourceStats(): Promise<ResourceStatsDto> {
    try {
      const [
        totalResources,
        approvedResources,
        pendingResources,
        topDownloadedResources,
      ] = await Promise.all([
        this.prisma.resource.count(),
        this.prisma.resource.count({ where: { isApproved: true } }),
        this.prisma.resource.count({ where: { isApproved: false } }),
        this.prisma.resource.findMany({
          orderBy: { downloadCount: 'desc' },
          take: 10,
        }),
      ]);

      return {
        totalResources,
        approvedResources,
        pendingResources,
        topDownloadedResources: topDownloadedResources.length,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get resource stats: ${errorMessage}`);
      throw error;
    }
  }

  // Helper methods
  private mapToListenerApplicationDto(application: {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      profilePicture: string | null;
    };
    bio: string;
    experience: string;
    topics: string[];
    motivation: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminNotes: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ListenerApplicationDto {
    return {
      id: application.id,
      userId: application.userId,
      user: {
        firstName: application.user.firstName,
        lastName: application.user.lastName,
        email: application.user.email,
        profilePicture: application.user.profilePicture,
      },
      bio: application.bio,
      experience: application.experience,
      topics: application.topics,
      motivation: application.motivation,
      status: application.status,
      adminNotes: application.adminNotes,
      reviewedBy: application.reviewedBy,
      reviewedAt: application.reviewedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private mapToUserManagementDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'LISTENER' | 'USER';
    status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AVAILABLE';
    isEmailVerified: boolean;
    isApproved: boolean;
    profileCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserManagementDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isApproved: user.isApproved,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToAdminGroupDto(group: {
    id: string;
    name: string;
    description: string | null;
    topicId: string;
    topic: {
      name: string;
      description: string | null;
    };
    leaderId: string | null;
    leader: {
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    isActive: boolean;
    maxMembers: number;
    meetingSchedule: string | null;
    _count: {
      members: number;
    };
    createdAt: Date;
    updatedAt: Date;
  }): AdminGroupDto {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      topicId: group.topicId,
      topic: {
        name: group.topic.name,
        description: group.topic.description,
      },
      leaderId: group.leaderId,
      leader: group.leader
        ? {
            firstName: group.leader.firstName,
            lastName: group.leader.lastName,
            email: group.leader.email,
          }
        : null,
      isActive: group.isActive,
      maxMembers: group.maxMembers,
      meetingSchedule: group.meetingSchedule,
      memberCount: group._count.members,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private mapToAdminSessionDto(session: {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    listenerId: string;
    listener: {
      firstName: string;
      lastName: string;
      email: string;
    };
    topicId: string;
    topic: {
      name: string;
      description: string | null;
    };
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    startTime: Date;
    endTime: Date | null;
    _count: {
      messages: number;
    };
    createdAt: Date;
    updatedAt: Date;
  }): AdminSessionDto {
    return {
      id: session.id,
      userId: session.userId,
      user: {
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
      },
      listenerId: session.listenerId,
      listener: {
        firstName: session.listener.firstName,
        lastName: session.listener.lastName,
        email: session.listener.email,
      },
      topicId: session.topicId,
      topic: {
        name: session.topic.name,
        description: session.topic.description,
      },
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      messageCount: session._count.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private mapToAdminSessionSummaryDto(summary: {
    id: string;
    sessionId: string;
    session: {
      userId: string;
      listenerId: string;
      topicId: string;
      status: string;
    };
    keyPoints: string[];
    emotionalTone: string;
    actionItems: string[];
    suggestedResources: string[];
    aiGenerated: boolean;
    pdfUrl: string | null;
    createdAt: Date;
  }): AdminSessionSummaryDto {
    return {
      id: summary.id,
      sessionId: summary.sessionId,
      session: {
        userId: summary.session.userId,
        listenerId: summary.session.listenerId,
        topicId: summary.session.topicId,
        status: summary.session.status,
      },
      keyPoints: summary.keyPoints,
      emotionalTone: summary.emotionalTone,
      actionItems: summary.actionItems,
      suggestedResources: summary.suggestedResources,
      aiGenerated: summary.aiGenerated,
      pdfUrl: summary.pdfUrl,
      createdAt: summary.createdAt,
    };
  }

  private mapToAdminGroupSummaryDto(summary: {
    id: string;
    groupId: string;
    group: {
      name: string;
      topicId: string;
    };
    topicsCovered: string[];
    groupSentiment: string;
    recommendedResources: string[];
    aiGenerated: boolean;
    pdfUrl: string | null;
    createdAt: Date;
  }): AdminGroupSummaryDto {
    return {
      id: summary.id,
      groupId: summary.groupId,
      group: {
        name: summary.group.name,
        topicId: summary.group.topicId,
      },
      topicsCovered: summary.topicsCovered,
      groupSentiment: summary.groupSentiment,
      recommendedResources: summary.recommendedResources,
      aiGenerated: summary.aiGenerated,
      pdfUrl: summary.pdfUrl,
      createdAt: summary.createdAt,
    };
  }

  private mapToAdminResourceDto(resource: {
    id: string;
    title: string;
    description: string;
    type: 'PDF' | 'VIDEO' | 'ARTICLE' | 'AUDIO';
    fileUrl: string;
    topicId: string;
    topic: {
      name: string;
      description: string | null;
    };
    uploadedBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    isApproved: boolean;
    downloadCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): AdminResourceDto {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      fileUrl: resource.fileUrl,
      topicId: resource.topicId,
      topic: {
        name: resource.topic.name,
        description: resource.topic.description,
      },
      submittedBy: {
        id: resource.uploadedBy.id,
        firstName: resource.uploadedBy.firstName,
        lastName: resource.uploadedBy.lastName,
        email: resource.uploadedBy.email,
      },
      isApproved: resource.isApproved,
      downloadCount: resource.downloadCount,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }

  private calculateTopicMatchScore(
    groupTopicName: string,
    listenerApplicationTopics: string[],
  ): number {
    const lowerCaseGroupTopic = groupTopicName.toLowerCase();
    const lowerCaseListenerTopics = listenerApplicationTopics.map((topic) =>
      topic.toLowerCase(),
    );

    let score = 0;
    for (const listenerTopic of lowerCaseListenerTopics) {
      if (lowerCaseGroupTopic.includes(listenerTopic)) {
        score += 1;
      }
    }
    return score;
  }
}
