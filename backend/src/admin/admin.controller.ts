import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  AdminService,
  ListenerApplicationDto,
  UpdateApplicationStatusDto,
  UserManagementDto,
  UpdateUserRoleDto,
  UpdateUserApprovalDto,
  PlatformStatsDto,
  AdminGroupDto,
  UpdateGroupStatusDto,
  AdminSessionDto,
  AdminSessionSummaryDto,
  AdminGroupSummaryDto,
  AssignGroupLeaderDto,
  SuitableLeaderDto,
  AdminResourceDto,
  UpdateResourceStatusDto,
  ResourceStatsDto,
  ReviewListenerApplicationDto,
} from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleBasedGuard, ADMIN_ONLY } from '../auth/guards/role-based.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RoleBasedGuard)
@ADMIN_ONLY()
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  // Platform Statistics
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Platform statistics retrieved successfully',
    type: PlatformStatsDto,
  })
  async getPlatformStats(): Promise<PlatformStatsDto> {
    this.logger.log('Getting platform statistics');
    return this.adminService.getPlatformStats();
  }

  // Listener Application Management
  @Get('applications/pending')
  @ApiOperation({ summary: 'Get pending listener applications (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Pending applications retrieved successfully',
    type: [ListenerApplicationDto],
  })
  async getPendingListenerApplications(): Promise<ListenerApplicationDto[]> {
    this.logger.log('Getting pending listener applications');
    return this.adminService.getPendingListenerApplications();
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all listener applications (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All applications retrieved successfully',
    type: [ListenerApplicationDto],
  })
  async getAllListenerApplications(): Promise<ListenerApplicationDto[]> {
    this.logger.log('Getting all listener applications');
    return this.adminService.getAllListenerApplications();
  }

  @Put('applications/:id/status')
  @ApiOperation({ summary: 'Update listener application status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Application status updated successfully',
    type: ListenerApplicationDto,
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: UpdateApplicationStatusDto })
  async updateListenerApplicationStatus(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<ListenerApplicationDto> {
    const adminUserId = req.user.sub;
    this.logger.log(
      `Admin ${adminUserId} updating application ${applicationId} status to ${dto.status}`,
    );
    return this.adminService.updateListenerApplicationStatus(
      adminUserId,
      applicationId,
      dto,
    );
  }

  @Post('listener-applications/:applicationId/review')
  @ApiOperation({
    summary: 'Review listener application (Admin only)',
    description:
      'Approve or reject a listener application with optional admin notes',
  })
  @ApiResponse({
    status: 200,
    description: 'Listener application reviewed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Listener application not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Application has already been reviewed',
  })
  @ApiParam({
    name: 'applicationId',
    description: 'ID of the listener application to review',
  })
  @ApiBody({ type: ReviewListenerApplicationDto })
  async reviewListenerApplication(
    @Param('applicationId') applicationId: string,
    @Request() req,
    @Body() dto: ReviewListenerApplicationDto,
  ): Promise<{ message: string }> {
    const adminId = req.user.sub;
    this.logger.log(
      `Admin ${adminId} reviewing listener application ${applicationId}`,
    );

    await this.adminService.reviewListenerApplication(
      applicationId,
      adminId,
      dto,
    );

    return {
      message: `Listener application ${dto.status.toLowerCase()} successfully`,
    };
  }

  @Get('stats/listener-applications')
  @ApiOperation({
    summary: 'Get listener application statistics (Admin only)',
    description: 'Retrieve statistics about listener applications',
  })
  @ApiResponse({
    status: 200,
    description: 'Listener application statistics retrieved successfully',
  })
  async getListenerApplicationStats() {
    this.logger.log('Admin retrieving listener application statistics');
    return this.adminService.getListenerApplicationStats();
  }

  @Get('stats/system')
  @ApiOperation({
    summary: 'Get system statistics (Admin only)',
    description:
      'Retrieve overall system statistics including users, groups, sessions, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
  })
  async getSystemStats() {
    this.logger.log('Admin retrieving system statistics');
    return this.adminService.getSystemStats();
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get all platform users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All users retrieved successfully',
    type: [UserManagementDto],
  })
  async getAllUsers(): Promise<UserManagementDto[]> {
    this.logger.log('Getting all platform users');
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserManagementDto,
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserById(@Param('id') userId: string): Promise<UserManagementDto> {
    this.logger.log(`Getting user ${userId}`);
    return this.adminService.getUserById(userId);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: UserManagementDto,
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  async updateUserRole(
    @Request() req,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserManagementDto> {
    const adminUserId = req.user.sub;
    this.logger.log(
      `Admin ${adminUserId} updating user ${userId} role to ${dto.role}`,
    );
    return this.adminService.updateUserRole(adminUserId, userId, dto);
  }

  @Put('users/:id/approval')
  @ApiOperation({ summary: 'Update user approval status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User approval status updated successfully',
    type: UserManagementDto,
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserApprovalDto })
  async updateUserApproval(
    @Request() req,
    @Param('id') userId: string,
    @Body() dto: UpdateUserApprovalDto,
  ): Promise<UserManagementDto> {
    const adminUserId = req.user.sub;
    this.logger.log(
      `Admin ${adminUserId} updating user ${userId} approval to ${dto.isApproved}`,
    );
    return this.adminService.updateUserApproval(adminUserId, userId, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  async deleteUser(
    @Request() req,
    @Param('id') userId: string,
  ): Promise<{ message: string }> {
    const adminUserId = req.user.sub;
    this.logger.log(`Admin ${adminUserId} deleting user ${userId}`);
    await this.adminService.deleteUser(adminUserId, userId);
    return { message: 'User deleted successfully' };
  }

  // Group Management
  @Get('groups')
  @ApiOperation({ summary: 'Get all groups (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All groups retrieved successfully',
    type: [AdminGroupDto],
  })
  async getAllGroups(): Promise<AdminGroupDto[]> {
    this.logger.log('Getting all groups');
    return this.adminService.getAllGroups();
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get group by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
    type: AdminGroupDto,
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async getGroupById(@Param('id') groupId: string): Promise<AdminGroupDto> {
    this.logger.log(`Getting group ${groupId}`);
    return this.adminService.getGroupById(groupId);
  }

  @Put('groups/:id/status')
  @ApiOperation({ summary: 'Update group status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Group status updated successfully',
    type: AdminGroupDto,
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateGroupStatusDto })
  async updateGroupStatus(
    @Request() req,
    @Param('id') groupId: string,
    @Body() dto: UpdateGroupStatusDto,
  ): Promise<AdminGroupDto> {
    this.logger.log(`Updating group ${groupId} status`);
    return this.adminService.updateGroupStatus(req.user.id, groupId, dto);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Delete group (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Group deleted successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async deleteGroup(
    @Request() req,
    @Param('id') groupId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Deleting group ${groupId}`);
    await this.adminService.deleteGroup(req.user.id, groupId);
    return { message: 'Group deleted successfully' };
  }

  @Post('groups/:id/leader')
  @ApiOperation({ summary: 'Assign group leader (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Group leader assigned successfully',
    type: AdminGroupDto,
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: AssignGroupLeaderDto })
  async assignGroupLeader(
    @Request() req,
    @Param('id') groupId: string,
    @Body() dto: AssignGroupLeaderDto,
  ): Promise<AdminGroupDto> {
    this.logger.log(`Assigning leader to group ${groupId}`);
    return this.adminService.assignGroupLeader(req.user.id, groupId, dto);
  }

  @Get('groups/:id/suitable-leaders')
  @ApiOperation({ summary: 'Get suitable leaders for group (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Suitable leaders retrieved successfully',
    type: [SuitableLeaderDto],
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async getSuitableLeaders(
    @Param('id') groupId: string,
  ): Promise<SuitableLeaderDto[]> {
    this.logger.log(`Getting suitable leaders for group ${groupId}`);
    return this.adminService.getSuitableLeaders(groupId);
  }

  // Resource Management
  @Get('resources')
  @ApiOperation({ summary: 'Get all resources (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All resources retrieved successfully',
    type: [AdminResourceDto],
  })
  async getAllResources(): Promise<AdminResourceDto[]> {
    this.logger.log('Getting all resources');
    return this.adminService.getAllResources();
  }

  @Get('resources/:id')
  @ApiOperation({ summary: 'Get resource by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Resource retrieved successfully',
    type: AdminResourceDto,
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async getResourceById(
    @Param('id') resourceId: string,
  ): Promise<AdminResourceDto> {
    this.logger.log(`Getting resource ${resourceId}`);
    return this.adminService.getResourceById(resourceId);
  }

  @Put('resources/:id/status')
  @ApiOperation({ summary: 'Update resource status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Resource status updated successfully',
    type: AdminResourceDto,
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiBody({ type: UpdateResourceStatusDto })
  async updateResourceStatus(
    @Request() req,
    @Param('id') resourceId: string,
    @Body() dto: UpdateResourceStatusDto,
  ): Promise<AdminResourceDto> {
    this.logger.log(`Updating resource ${resourceId} status`);
    return this.adminService.updateResourceStatus(req.user.id, resourceId, dto);
  }

  @Delete('resources/:id')
  @ApiOperation({ summary: 'Delete resource (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async deleteResource(
    @Request() req,
    @Param('id') resourceId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Deleting resource ${resourceId}`);
    await this.adminService.deleteResource(req.user.id, resourceId);
    return { message: 'Resource deleted successfully' };
  }

  @Get('resources/stats')
  @ApiOperation({ summary: 'Get resource statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Resource statistics retrieved successfully',
    type: ResourceStatsDto,
  })
  async getResourceStats(): Promise<ResourceStatsDto> {
    this.logger.log('Getting resource statistics');
    return this.adminService.getResourceStats();
  }

  // Session Management
  @Get('sessions')
  @ApiOperation({ summary: 'Get all sessions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All sessions retrieved successfully',
    type: [AdminSessionDto],
  })
  async getAllSessions(): Promise<AdminSessionDto[]> {
    this.logger.log('Getting all sessions');
    return this.adminService.getAllSessions();
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
    type: AdminSessionDto,
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getSessionById(
    @Param('id') sessionId: string,
  ): Promise<AdminSessionDto> {
    this.logger.log(`Getting session ${sessionId}`);
    return this.adminService.getSessionById(sessionId);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete session (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async deleteSession(
    @Request() req,
    @Param('id') sessionId: string,
  ): Promise<{ message: string }> {
    const adminUserId = req.user.sub;
    this.logger.log(`Admin ${adminUserId} deleting session ${sessionId}`);
    await this.adminService.deleteSession(adminUserId, sessionId);
    return { message: 'Session deleted successfully' };
  }

  // Summary Management
  @Get('summaries/sessions')
  @ApiOperation({ summary: 'Get all session summaries (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All session summaries retrieved successfully',
    type: [AdminSessionSummaryDto],
  })
  async getAllSessionSummaries(): Promise<AdminSessionSummaryDto[]> {
    this.logger.log('Getting all session summaries');
    return this.adminService.getAllSessionSummaries();
  }

  @Get('summaries/groups')
  @ApiOperation({ summary: 'Get all group summaries (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All group summaries retrieved successfully',
    type: [AdminGroupSummaryDto],
  })
  async getAllGroupSummaries(): Promise<AdminGroupSummaryDto[]> {
    this.logger.log('Getting all group summaries');
    return this.adminService.getAllGroupSummaries();
  }

  @Delete('summaries/sessions/:id')
  @ApiOperation({ summary: 'Delete session summary (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Session summary deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Session Summary ID' })
  async deleteSessionSummary(
    @Request() req,
    @Param('id') summaryId: string,
  ): Promise<{ message: string }> {
    const adminUserId = req.user.sub;
    this.logger.log(
      `Admin ${adminUserId} deleting session summary ${summaryId}`,
    );
    await this.adminService.deleteSessionSummary(adminUserId, summaryId);
    return { message: 'Session summary deleted successfully' };
  }

  @Delete('summaries/groups/:id')
  @ApiOperation({ summary: 'Delete group summary (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Group summary deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Group Summary ID' })
  async deleteGroupSummary(
    @Request() req,
    @Param('id') summaryId: string,
  ): Promise<{ message: string }> {
    const adminUserId = req.user.sub;
    this.logger.log(`Admin ${adminUserId} deleting group summary ${summaryId}`);
    await this.adminService.deleteGroupSummary(adminUserId, summaryId);
    return { message: 'Group summary deleted successfully' };
  }
}
