# Google login verification codes

Google OAuth and email/password login now require a one-time code sent to the account email before creating an authenticated app session. Codes expire after 10 minutes, allow five attempts, and can be resent once per minute.

Configure these environment variables on the backend (for example, in Koyeb):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-sending-account@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM=your-sending-account@gmail.com
```

Create a Google App Password for the sending Gmail account after enabling 2-Step Verification. Use that App Password as `SMTP_PASSWORD`, not the normal Google account password. Keep it private and store it only as a backend secret. `SMTP_FROM` should use the same Gmail address as `SMTP_USERNAME`.

If SMTP is not configured or email delivery fails, the app does not create a logged-in session. Existing Google OAuth client credentials and redirect URI configuration are still required.
