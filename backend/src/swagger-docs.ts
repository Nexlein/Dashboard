/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Better Auth (https://www.better-auth.com/docs). The main endpoints are listed; all of them live under /api/auth.
 *   - name: Account
 *     description: The signed-in user's own data
 *   - name: Chatbot
 *     description: Chatbot operations
 *   - name: Services
 *     description: External services integration
 *   - name: Widgets
 *     description: User widgets configuration
 *
 * /api/auth/sign-up/email:
 *   post:
 *     summary: Register with an email and a password
 *     description: cguAccepted and is16OrOlder are required by the project (checked before Better Auth runs). Emails a 6-digit code; the account signs in once the code is entered (/api/auth/email-otp/verify-email). The answer is the same when the email is already registered.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, cguAccepted, is16OrOlder]
 *             properties:
 *               email: { type: string, format: email, maxLength: 254 }
 *               password: { type: string, minLength: 8, maxLength: 128 }
 *               name: { type: string, maxLength: 50 }
 *               cguAccepted: { type: boolean, enum: [true] }
 *               is16OrOlder: { type: boolean, enum: [true] }
 *     responses:
 *       200:
 *         description: Code emailed (no session yet)
 *       400:
 *         description: Invalid input or missing declaration
 * /api/auth/sign-in/email:
 *   post:
 *     summary: Sign in with an email and a password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Signed in (session cookie set)
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: EMAIL_NOT_VERIFIED (a new code is emailed) or banned account
 *       429:
 *         description: Too many attempts
 * /api/auth/email-otp/verify-email:
 *   post:
 *     summary: Verify the email with its code, and sign in
 *     description: Codes have 6 digits, expire after 5 minutes and allow 3 attempts.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: Verified and signed in (session cookie set)
 *       400:
 *         description: Invalid or expired code
 * /api/auth/email-otp/send-verification-otp:
 *   post:
 *     summary: Email a new verification code
 *     description: type must be email-verification (sign-in by code is not offered).
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Sent if the address has an account
 * /api/auth/email-otp/request-password-reset:
 *   post:
 *     summary: Forgotten password, step 1 - email a reset code
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Same answer whether or not the address has an account
 * /api/auth/email-otp/reset-password:
 *   post:
 *     summary: Forgotten password, step 2 - set a new password with the code
 *     description: Signs every session out, and verifies the email.
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Invalid code or password
 * /api/auth/email-otp/request-email-change:
 *   post:
 *     summary: Email change, step 1 - send a code to the new address
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sent unless the address is already used (same answer)
 * /api/auth/email-otp/change-email:
 *   post:
 *     summary: Email change, step 2 - apply the new address with its code
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Email changed and verified
 * /api/auth/update-user:
 *   post:
 *     summary: Update the display name
 *     description: name is trimmed and limited to 50 characters. The email changes through the codes above.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid name
 * /api/auth/sign-in/social:
 *   post:
 *     summary: Start GitHub sign-in
 *     description: Only creates an account with requestSignUp and additionalData { cguAccepted, is16OrOlder } set to true. Returns the GitHub authorization URL.
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: "{ url, redirect }"
 * /api/auth/link-social:
 *   post:
 *     summary: Connect a GitHub account to the GitHub service (provider github-service; repeat for several)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: "{ url, redirect }"
 * /api/auth/get-session:
 *   get:
 *     summary: The signed-in user and session (without the session token)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: "{ user, session }, or null when signed out"
 * /api/auth/sign-out:
 *   post:
 *     summary: Sign out and revoke the session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Signed out
 * /api/auth/delete-user:
 *   post:
 *     summary: Delete the account and everything stored about it
 *     description: Needs a session created less than a day ago, or the password.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Account deleted
 *       400:
 *         description: SESSION_EXPIRED (sign in again) or invalid password
 * /api/auth/admin/list-users:
 *   get:
 *     summary: List users (administrators only, admin plugin)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: "{ users, total }"
 *       403:
 *         description: Not an administrator
 *
 * /account/export:
 *   get:
 *     summary: Export profile, readable widgets, sign-in methods, sessions and connected-service metadata
 *     description: Excludes passwords, tokens and API keys. Fails if widget parameters cannot be decrypted.
 *     tags: [Account]
 *     responses:
 *       200:
 *         description: JSON export with Cache-Control no-store
 *       404:
 *         description: User not found
 *       500:
 *         description: Export failed
 *
 * /chatbot/models:
 *   get:
 *     summary: Get available AI models
 *     tags: [Chatbot]
 *     responses:
 *       200:
 *         description: List of models
 * /chatbot/pull:
 *   post:
 *     summary: Pull a new AI model
 *     tags: [Chatbot]
 *     responses:
 *       200:
 *         description: Model pulling started
 *
 * /services:
 *   get:
 *     summary: Get all connected services
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: List of connected services
 * /services/{serviceName}/connection:
 *   put:
 *     summary: Connect a service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service connected
 *   delete:
 *     summary: Disconnect a service (for GitHub, every connected account)
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Service disconnected
 * /services/{serviceName}/accounts/{accountId}:
 *   delete:
 *     summary: Disconnect one account of an OAuth service (e.g. one GitHub account)
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Account disconnected
 *       404:
 *         description: Not an account of this user and service
 *
 * /widgets:
 *   get:
 *     summary: Get user widgets
 *     tags: [Widgets]
 *     responses:
 *       200:
 *         description: List of user widgets
 *   post:
 *     summary: Create a widget
 *     tags: [Widgets]
 *     responses:
 *       201:
 *         description: Widget created
 * /widgets/layout:
 *   put:
 *     summary: Update widgets layout
 *     tags: [Widgets]
 *     responses:
 *       204:
 *         description: Layout updated
 * /widgets/{id}:
 *   put:
 *     summary: Update a widget
 *     tags: [Widgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget updated
 *   delete:
 *     summary: Delete a widget
 *     tags: [Widgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Widget deleted
 * /widgets/{id}/data:
 *   get:
 *     summary: Get widget data
 *     tags: [Widgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget data
 * /widgets/{id}/chat:
 *   post:
 *     summary: Chat with a widget (chatbot specific)
 *     tags: [Widgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat response
 *
 * /about.json:
 *   get:
 *     summary: Get server about.json
 *     description: Returns client host and server services/widgets.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server info
 *
 * /health:
 *   get:
 *     summary: API Health Check
 *     description: Checks if the API is running and connected to the database.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *       503:
 *         description: Database connection failed
 */

// Only OpenAPI annotations, read by swagger-jsdoc; nothing to export.
export {};
