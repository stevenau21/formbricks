# SMTP Setup Guide (Docker Compose)

This guide configures SMTP for a self-hosted Formbricks instance using Docker Compose.
It is written to be LLM-friendly and step-by-step.

## What this enables
- Email follow-ups
- Team invite emails
- Password reset and email verification (if enabled)

## Step-by-step
1. Identify the compose file you actually run.
   - If you start with `docker compose up -d`, edit `C:\dev\projects\formbricks\docker-compose.yml`.
   - If you start with `docker compose -f docker-compose.dev.yml up -d`, edit `docker-compose.dev.yml`.
   - If you start from a different folder, edit the compose file in that folder.

2. Open the compose file and find the section:
   `OPTIONAL (EMAIL CONFIGURATION)` under `x-environment`.

3. Uncomment and set these values (required):
   - `MAIL_FROM`
   - `MAIL_FROM_NAME`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_AUTHENTICATED` (usually `1`)

4. If your SMTP uses port 465 (TLS), set:
   - `SMTP_SECURE_ENABLED: 1`
   If you use port 587, leave it `0` or unset.

5. If your SMTP uses a self-signed cert and TLS fails, you can set:
   - `SMTP_REJECT_UNAUTHORIZED_TLS: 0`
   Use this only if you must; prefer valid certs.

6. Optional: enable email verification and password reset:
   - `EMAIL_VERIFICATION_DISABLED: 0`
   - `PASSWORD_RESET_DISABLED: 0`

7. Save the file.

8. Restart the stack (no rebuild needed):
   - `docker compose up -d`
   - or `docker compose restart formbricks`

## Example (generic SMTP)
Paste this under the email configuration section and replace values:

```yaml
# Email Configuration
MAIL_FROM: noreply@yourdomain.com
MAIL_FROM_NAME: Formbricks
SMTP_HOST: smtp.yourprovider.com
SMTP_PORT: 587
SMTP_USER: your_username
SMTP_PASSWORD: your_password
SMTP_AUTHENTICATED: 1
# SMTP_SECURE_ENABLED: 0
# SMTP_REJECT_UNAUTHORIZED_TLS: 1

# Enable these if you want email verification and password reset
EMAIL_VERIFICATION_DISABLED: 0
PASSWORD_RESET_DISABLED: 0
```

## Example (SendGrid)

```yaml
MAIL_FROM: noreply@yourdomain.com
MAIL_FROM_NAME: Formbricks
SMTP_HOST: smtp.sendgrid.net
SMTP_PORT: 587
SMTP_USER: apikey
SMTP_PASSWORD: your_sendgrid_api_key
SMTP_AUTHENTICATED: 1
```

## Verify it works
- In the Formbricks UI, create a follow-up and save it.
- Or invite a team member (this sends an email).
- If the save still fails, check the server logs for SMTP errors.

## Troubleshooting checklist
- SMTP host, port, user, and password are correct.
- MAIL_FROM is allowed by your provider (some providers require verified sender domains).
- TLS settings match the port (465 => SMTP_SECURE_ENABLED: 1, 587 => 0).
- Containers were restarted after changes.

## Notes
- No rebuild is required after changing SMTP values; a container restart is enough.
- Avoid committing real SMTP secrets to git.
