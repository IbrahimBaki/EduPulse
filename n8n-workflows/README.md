# EduPulse n8n Workflows

Ready-to-import n8n workflow JSON files covering all 20 automation cycles in EduPulse.

---

## Setup

### 1. Configure the Config node in each workflow

Every workflow has a **"⚙️ Config"** Set node at the top. Open it and set:

| Variable | Example Value | Description |
|---|---|---|
| `APP_URL` | `https://edupulse.localhost` | EduPulse base URL (no trailing slash) |
| `TENANT_CODE` | `demo` | Your tenant code |
| `N8N_INCOMING_SECRET` | `edupulse_n8n_secret_2026` | Must match `N8N_INCOMING_SECRET` in `.env` |

### 2. Set n8n Webhook base URL in EduPulse `.env`

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_INCOMING_SECRET=edupulse_n8n_secret_2026
```

Laravel sends webhooks to: `{N8N_WEBHOOK_URL}/{webhook_type}`  
e.g. `https://your-n8n-instance.com/webhook/student_registered`

### 3. Import each JSON file

n8n Dashboard → **Workflows** → **Add Workflow** → **Import from File**

### 4. Activate workflows

Toggle each workflow to **Active** after verifying configuration.

---

## Workflow Files

| File | Events Covered | Trigger |
|---|---|---|
| `01-session-reminders.json` | Upcoming session reminders | Cron every 30 min |
| `02-iam-events.json` | student_registered, student_deactivated, teacher_welcome, parent_registered, enrollment_approved, enrollment_rejected | Webhook (Laravel → n8n) |
| `03-academic-events.json` | schedule_created, session_live, schedule_cancelled, lesson_published, announcement_published | Webhook (Laravel → n8n) |
| `04-assessment-alerts.json` | exam_published, exam_scheduled, score_alert, exam_score_alert | Webhook (Laravel → n8n) |
| `05-commerce-events.json` | fees_assigned, fee_paid, fee_overdue | Webhook (Laravel → n8n) |
| `06-weekly-parent-report.json` | weekly_parent_report | Webhook (Laravel → n8n) |

---

## All 20 Cycles Reference

| # | Webhook Type | Module | Payload Fields | Notifies |
|---|---|---|---|---|
| 1 | `student_registered` | IAM | student_id, name, student_code | Student (welcome) |
| 2 | `student_deactivated` | IAM | student_id, name | Student (account disabled) |
| 3 | `teacher_welcome` | IAM | teacher_id, name, email | Teacher (welcome) |
| 4 | `parent_registered` | IAM | parent_id, name, email | Parent (welcome) |
| 5 | `enrollment_approved` | IAM | enrollment_request_id, student_id, course_id | Student (approved) |
| 6 | `enrollment_rejected` | IAM | enrollment_request_id, student_id, course_id | Student (rejected) |
| 7 | `schedule_created` | Academic | schedule_id, course_id, starts_at | Teacher (reminder set) |
| 8 | `session_live` | Academic | schedule_id, course_id | Teacher (session live) |
| 9 | `schedule_cancelled` | Academic | schedule_id, course_id | Teacher (session cancelled) |
| 10 | `lesson_published` | Academic | lesson_id, course_id, title | Teacher (confirmation) |
| 11 | `announcement_published` | Communication | announcement_id, title, audience | — (logged) |
| 12 | `exam_published` | Assessment | exam_title, course_name, teacher_name, tenant_code | — (logged) |
| 13 | `exam_scheduled` | Assessment | exam_title, course_name, scheduled_at, duration, tenant_code | — (logged) |
| 14 | `score_alert` | AI | student_id, student_name, topic, score, lesson_id, tenant_code | Student (low score alert) |
| 15 | `exam_score_alert` | Assessment | student_name, exam_title, course_name, score, percentage, teacher_email, tenant_code | Student (low score alert) |
| 16 | `fees_assigned` | Commerce | fee_structure_id, target, target_id, created_count | — (logged) |
| 17 | `fee_paid` | Commerce | fee_id, student_id, amount | Student (payment confirmed) |
| 18 | `fee_overdue` | Commerce | fee_id, student_id, amount | Student (overdue alert) |
| 19 | `weekly_parent_report` | AI | parent_id, parent_name, tenant_code, children[] | Parent (weekly summary) |
| 20 | *(cron)* Session reminders | Communication | — (polls internal endpoint) | Teacher (starts in 30 min) |

---

## Internal EduPulse Endpoints Used by n8n

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/{tenant_code}/internal/upcoming-sessions` | `X-N8n-Secret` header | Get sessions starting in next 35 min |
| POST | `/api/v1/{tenant_code}/webhooks/n8n/notify` | `secret` in body | Create in-app notifications for users |

### Notification Payload (POST to `/webhooks/n8n/notify`)
```json
{
  "secret": "edupulse_n8n_secret_2026",
  "type": "notification_type",
  "user_ids": [123, 456],
  "title": "Notification Title",
  "body": "Notification body text",
  "data": {}
}
```
