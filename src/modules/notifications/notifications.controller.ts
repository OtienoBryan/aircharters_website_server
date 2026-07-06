import { Controller, Get, Post, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Notification } from '../../common/entities/notification.entity';

function toDto(n: Notification) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    is_read: n.isRead ? 1 : 0,
    created_at: n.createdAt,
  };
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(@Request() req, @Query('limit') limit: string = '20') {
    const notifications = await this.notificationsService.findForUser(req.user.sub, parseInt(limit) || 20);
    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data: notifications.map(toDto),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async unreadCount(@Request() req) {
    const count = await this.notificationsService.countUnread(req.user.sub);
    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unread_count: count },
    };
  }

  @Post('read/:id')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markRead(@Param('id') id: string, @Request() req) {
    await this.notificationsService.markRead(+id, req.user.sub);
    return { success: true, message: 'Notification marked as read' };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@Request() req) {
    await this.notificationsService.markAllRead(req.user.sub);
    return { success: true, message: 'All notifications marked as read' };
  }
}
