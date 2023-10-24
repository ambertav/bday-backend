# Backend API Documentation

## Overview
This document outlines the available API endpoints in our backend service. All routes return an HTTPError with relevant status and a json body containing `message` on error.

---

## Authentication

### Signup - Create a new user

- **Endpoint**: `POST /api/users`
- **Request Body**: JSON object containing:
  - `email` (required)
  - `password` (required)
  - `firstName` (required)
  - `lastName` (required)
  - `tel` (optional)
- **Response**: JSON object containing:
  - `accessToken`
- **Side Effect**: Creates an empty UserProfile

### Login - Authenticate an existing user

- **Endpoint**: `POST /api/users/login`
- **Request Body**: JSON object containing:
  - `email` (required)
  - `password` (required)
- **Response**: JSON object containing:
  - `accessToken`

---

## Protected Routes
**Note**: All the routes below expect an `Authorization` header with a Bearer token.

### Update Password

- **Endpoint**: `PUT /api/users/password`
- **Request Body**: JSON object containing:
  - `oldPassword` (required)
  - `newPassword` (required)

### Update User Information

- **Endpoint**: `PUT /api/users`
- **Request Body**: JSON object containing:
  - `firstName` (optional)
  - `lastName` (optional)
  - `tel` (optional)

### Delete User

- **Endpoint**: `DELETE /api/users`
- **Response**: JSON object containing:
  - `confirmationToken`

### Confirm User Deletion

- **Endpoint**: `POST /api/confirm-delete`
- **Request Body**: JSON object containing:
  - `confirmationToken` (required)
- **Side Effect**: Deletes associated UserProfile

## User Profile
## Protected Routes
**Note**: All the routes below expect an `Authorization` header with a Bearer token.

### Update Profile Details

- **Endpoint**: `PUT /api/users/profile`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing (any of):
  - `dob` (optional, Date of Birth)
  - `bio` (optional, Biography)
- **Response**: JSON object containing:
  - `message: "User profile updated"`
  - `profile`

### Get User Profile

- **Endpoint**: `GET /api/users/profile`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `profile`

### Upload User Photo

- **Endpoint**: `POST /api/users/profile/upload`
- **Authorization**: Bearer Token
- **Request Body**: Form-data containing:
  - `photo` (required, File)
- **Response**: JSON object containing:
  - `message: "Photo uploaded successfully"`

Note: The photo upload utilizes AWS S3 for storage.