# API Documentation

## System

### `GET /about.json`

Returns the application's supported services and widgets in the format required by Epitech grading.

**Response (200 OK):**

```json
{
  "client": { "host": "127.0.0.1" },
  "server": {
    "current_time": 1690000000,
    "services": [
      {
        "name": "weather",
        "widgets": [ ... ]
      }
    ]
  }
}
```

## Authentication

### `POST /auth/register`

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

### `POST /auth/login`

Authenticate an existing user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

## Widgets

All `/widgets` endpoints require the `Authorization: Bearer <token>` header.

### `GET /widgets`

Returns all widgets belonging to the authenticated user.

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "serviceName": "weather",
    "widgetName": "current_weather",
    "params": { "city": "Paris" },
    "refreshRate": 60,
    "layout": { "x": 0, "y": 0, "w": 2, "h": 2 }
  }
]
```

### `POST /widgets`

Create a new widget for the dashboard.

**Request Body:**

```json
{
  "serviceName": "weather",
  "widgetName": "current_weather",
  "params": { "city": "Paris" },
  "refreshRate": 60,
  "layout": { "x": 0, "y": 0, "w": 2, "h": 2 }
}
```

**Response (201 Created):** Returns the created widget object.

### `PUT /widgets/:id`

Update an existing widget's parameters, refresh rate, or layout.

**Request Body (Partial updates allowed):**

```json
{
  "layout": { "x": 2, "y": 0, "w": 2, "h": 2 }
}
```

**Response (200 OK):** Returns the updated widget object.

### `DELETE /widgets/:id`

Delete a widget.

**Response (204 No Content)**
**Response (200 OK):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```
