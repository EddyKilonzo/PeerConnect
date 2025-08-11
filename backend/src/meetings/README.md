# Meetings System

The meetings system allows group leaders and admins to schedule, conduct, and summarize group meetings. After each meeting, an AI-generated summary is created and stored as a PDF in Cloudinary.

## Features

- **Meeting Management**: Create, schedule, start, and end meetings within groups
- **AI Summarization**: Automatic generation of meeting summaries using OpenAI
- **PDF Generation**: Create professional PDF summaries of meetings
- **Cloud Storage**: Store PDFs in Cloudinary for easy access
- **Group Integration**: Seamlessly integrated with existing group system
- **Notifications**: Automatic notifications to group members about meetings

## API Endpoints

### Create Meeting
```
POST /meetings
```
Creates a new meeting in a specified group. Only group leaders and admins can create meetings.

**Body:**
```json
{
  "groupId": "group_id_here",
  "title": "Weekly Support Session",
  "description": "Weekly group therapy session focusing on anxiety management",
  "type": "GROUP_THERAPY",
  "scheduledStartTime": "2024-01-20T14:00:00Z",
  "scheduledEndTime": "2024-01-20T15:30:00Z",
  "agenda": ["Check-in", "Topic discussion", "Group sharing"],
  "maxParticipants": "15",
  "notesTemplate": "Custom notes template"
}
```

### Start Meeting
```
POST /meetings/{id}/start
```
Starts a scheduled meeting, changing its status to ACTIVE.

### End Meeting
```
POST /meetings/{id}/end
```
Ends an active meeting and automatically:
1. Generates AI summary from meeting messages
2. Creates PDF summary
3. Uploads PDF to Cloudinary
4. Updates meeting and group summary records

### Get Meeting Details
```
GET /meetings/{id}
```
Retrieves detailed information about a specific meeting.

### Get Group Meetings
```
GET /meetings/group/{groupId}
```
Retrieves all meetings for a specific group.

### Get Meeting Summary
```
GET /meetings/{id}/summary
```
Retrieves the meeting summary PDF URL and group summary data.

## Meeting Types

- `GROUP_THERAPY`: Professional therapy sessions
- `SUPPORT_GROUP`: Peer support meetings
- `WORKSHOP`: Educational workshops
- `DISCUSSION`: General discussion groups

## Meeting Statuses

- `SCHEDULED`: Meeting is scheduled but not yet started
- `ACTIVE`: Meeting is currently in progress
- `COMPLETED`: Meeting has ended and summary generated
- `CANCELLED`: Meeting was cancelled

## Integration with Groups

Meetings are tightly integrated with the existing group system:

- Each meeting belongs to a specific group
- Group leaders and admins can manage meetings
- Meeting messages are linked to both groups and meetings
- Group summaries are updated after each meeting
- Notifications are sent to all group members

## AI Summarization

When a meeting ends, the system:

1. Collects all messages from the meeting
2. Sends them to OpenAI for analysis
3. Generates structured summary with:
   - Topics covered
   - Group sentiment
   - Recommended resources
4. Creates a professional PDF
5. Uploads to Cloudinary
6. Updates database records

## Database Schema

The system adds a new `Meeting` table with relationships to:
- `Group` (belongs to)
- `Message` (has many)
- `GroupSummary` (updates after completion)

## Usage Example

```typescript
// Create a meeting
const meeting = await meetingsService.createMeeting(userId, {
  groupId: 'group_123',
  title: 'Weekly Check-in',
  description: 'Weekly group check-in session',
  type: MeetingType.SUPPORT_GROUP,
  scheduledStartTime: '2024-01-20T14:00:00Z',
  agenda: ['Check-in', 'Topic discussion', 'Closing']
});

// Start the meeting
await meetingsService.startMeeting(meeting.id, userId);

// End the meeting (automatically generates summary)
await meetingsService.endMeeting(meeting.id, userId);

// Get the summary
const summary = await meetingsService.getMeetingSummary(meeting.id);
console.log('PDF URL:', summary.summaryPdfUrl);
```

## Security

- Only group leaders and admins can create/manage meetings
- Users must be authenticated to access meeting endpoints
- Meeting data is scoped to group membership
- PDF access is controlled through the API

## Dependencies

- **PrismaService**: Database operations
- **NotificationsService**: User notifications
- **PdfService**: PDF generation and upload
- **AiService**: AI-powered summarization
- **CloudinaryService**: File storage
