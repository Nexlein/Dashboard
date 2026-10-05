# Privacy Policy (RGPD / GDPR)

## Data Storage
We store the following user data:
- Email address, optional display name and linked GitHub account ID (for authentication and account display)
- Password hashes (scrypt, through Better Auth; none for GitHub-only accounts)
- OAuth tokens (encrypted at rest, for connected services like GitHub)
- Sessions: creation and expiry dates, IP address and user agent
- Short-lived verification codes (stored hashed, expire after 5 minutes)

Emails (verification and password-reset codes) are sent through the SMTP provider configured by the operator, which processes the recipient address and the message.
- Widget configurations (parameters and layouts)

The session is kept in an httpOnly cookie that page scripts cannot read; its record (creation date, IP address, user agent) is stored in the `Session` table and deleted on sign-out or account deletion. Browser `localStorage` stores dashboard preferences, chatbot histories (removed on logout) and the cookie-banner choice. These are used for application functionality, not tracking.

## Data Usage
- User data is used strictly to provide the dashboard features and widget functionalities.
- OAuth tokens are used solely to fetch data for the connected services as configured by the user.
- We do not sell or share your data with third parties.

## Data Protection Officer (DPO)
For any questions regarding your data privacy, to report a breach, or to exercise your rights manually, please contact our Data Protection Officer at: **privacy@example.com**

## Your Rights (GDPR Compliance)
- **Right to Access**: "Download My Data" exports your profile, preferences, timestamps, readable widget configurations and connected-service metadata. Password hashes, API keys and OAuth access/refresh tokens are excluded.
- **Right to Erasure**: "Delete My Account" removes your account, widgets and stored service credentials from the active database. You are signed out after success; an error is displayed if deletion cannot be confirmed. External provider data and retained backups are not deleted by this action.
- **Consent**: By registering, you accept our CGU and this Privacy Policy.

## Profile changes and registration

You can edit your display name and email, including on GitHub-only accounts.
GitHub login uses a stable account ID independently of your editable email. Older
accounts may need to sign in with GitHub again before changing their email if the
existing connection can no longer be verified.

New registrations require accepting the terms and confirming an age of at least
16. This project rule is checked by the server for both password and GitHub
registration. It is a self-declaration; we do not collect or verify a birth date.
Existing GitHub users do not repeat registration when logging in.

## Deployment note

`privacy@example.com` above is a documentation placeholder. The deployment owner
must replace it with a monitored contact before publishing this policy. See the
README for encryption-key handling, the automatic OAuth data migration and backup
considerations.
