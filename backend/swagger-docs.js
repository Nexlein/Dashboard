/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin operations
 *   - name: Auth
 *     description: Authentication operations
 *   - name: Chatbot
 *     description: Chatbot operations
 *   - name: Services
 *     description: External services integration
 *   - name: Widgets
 *     description: User widgets configuration
 *
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted
 *
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, cguAccepted, is16OrOlder]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 72 }
 *               displayName: { type: string, maxLength: 50 }
 *               cguAccepted: { type: boolean, enum: [true] }
 *               is16OrOlder: { type: boolean, enum: [true] }
 *     responses:
 *       201:
 *         description: User created
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Login successful
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *   put:
 *     summary: Update current user's display name or email
 *     description: GitHub login uses a stable ID; old accounts may need to reconnect GitHub before an email change.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName: { type: string, maxLength: 50 }
 *               email: { type: string, format: email, maxLength: 254 }
 *     responses:
 *       200:
 *         description: Updated public profile
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Duplicate email or GitHub reconnection required
 * /auth/download-data:
 *   get:
 *     summary: Export profile, readable widgets and connected-service metadata
 *     description: Excludes password hashes, API keys and OAuth token values. Fails if widget parameters cannot be decrypted.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: JSON export with Cache-Control no-store
 *       404:
 *         description: User not found
 *       500:
 *         description: Export failed
 * /auth/delete-account:
 *   delete:
 *     summary: Delete the authenticated account and cascade its stored data
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deletion completed
 *       404:
 *         description: User not found
 *       500:
 *         description: Deletion failed
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub connection
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       302:
 *         description: Redirect to GitHub
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: OAuth handled
 * /auth/github/login:
 *   get:
 *     summary: Login via GitHub
 *     tags: [Auth]
 *     security: []
 *     description: New accounts require both declarations in the initiating request. Existing accounts do not repeat registration.
 *     parameters:
 *       - in: query
 *         name: cguAccepted
 *         schema: { type: boolean }
 *       - in: query
 *         name: is16OrOlder
 *         schema: { type: boolean }
 *     responses:
 *       302:
 *         description: Redirect to GitHub
 *
 * /chatbot/models:
 *   get:
 *     summary: Get available AI models
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of models
 * /chatbot/pull:
 *   post:
 *     summary: Pull a new AI model
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Model pulling started
 *
 * /services:
 *   get:
 *     summary: Get all connected services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of connected services
 * /services/{serviceName}/connection:
 *   put:
 *     summary: Connect a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Disconnect a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Service disconnected
 *
 * /widgets:
 *   get:
 *     summary: Get user widgets
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user widgets
 *   post:
 *     summary: Create a widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Widget created
 * /widgets/layout:
 *   put:
 *     summary: Update widgets layout
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Layout updated
 * /widgets/{id}:
 *   put:
 *     summary: Update a widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
