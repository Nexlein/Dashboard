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
