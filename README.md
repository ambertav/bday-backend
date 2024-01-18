# Backend API Documentation

## Getting Started

Run `npm i` to install dependencies

Setup a .env file according to the .env.sample file

Run `npm start` to start development server

## Overview

This document outlines the available API endpoints in our backend service. All routes return an HTTPError with relevant status and a json body containing `message` on error.

Server runs on PORT 3010 by default.

---

## Authentication

### Signup - Create a new user

- **Endpoint**: `POST /api/users`
- **Request Body**: JSON object containing:
  - `email` (required, string)
  - `password` (required, string)
  - `name` (required, string)
  - `dob` (required, Date - yyyy-mm-dd)
  - `gender` (required, sring - one of "female", "male", "other")
  - `tel` (optional, number)
  - `timezone` (optional, string)
- **Response**: JSON object containing:
  - `message: 'User successfully created and verification email sent sucessfully'`

Note: Signup endpoint also sends and email with a link for email verification

### Login - Authenticate an existing user (WEB)

- **Endpoint**: `POST /api/users/login`
- **Request Body**: JSON object containing:
  - `email` (required, string)
  - `password` (required, string)
- **Response**: JSON object containing:
  - `accessToken`
- **Cookies**
  - `refreshToken` (httpOnly)

### Login - Authenticate an existing user (MOBILE)

- **Endpoint**: `POST /api/users/mobile/login`
- **Request Body**: JSON object containing:
  - `email` (required, string)
  - `password` (required, string)
- **Response**: JSON object containing:
  - `accessToken`
  - `refreshToken`

### Verify Email

- **Endpoint**: `POST /api/users/verify-email`
- **Request Body**: JSON object containing:
  - `token` (required, string)
- **Response**: JSON object containing:
  - `message: 'User\'s email was verified successfully'`

### Resend Email Verification Link

- **Endpoint**: `POST /api/users/resend-email`
- **Request Body**: JSON object containing:
  - `token` (optional, string)
  - `email` (optional, string)
- **Response**: JSON object containing:
  - `message: 'Email resent successfully'`

Note: Endpoint accepts token or email

### Send Forgot Password Link

- **Endpoint**: `POST /api/users/forgot-password`
- **Request Body**: JSON object containing:
  - `email` (required, string)
- **Response**: JSON object containing:
  - `message: 'Password reset email sent successfully'`

### Reset Password

- **Endpoint**: `POST /api/users/reset-password`
- **Request Body**: JSON object containing:
  - `token` (required, string)
  - `newPassword` (required, string)
  - `confirmNewPassword` (required, string)
- **Response**: JSON object containing:
  - `message: 'User\'s password reset successfully'`

---

## Protected Routes

**Note**: All the routes below expect an `Authorization` header with a Bearer token.

### Refresh

- **Endpoint**: `POST /api/users/refresh`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `device` (required, string)
  - `refresh` (optional, string)
- **Response**:
  - For mobile: JSON object containing:
    - `accessToken`
    - `refreshToken`
  - For web:
    - **Cookies**
      - `refreshToken` (httpOnly)
    - JSON object containing:
      - `accessToken`

### Logout

- **Endpoint**: `GET /api/users/logout`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `message: 'Cookie cleared'`

### Update Password

- **Endpoint**: `PUT /api/users/password`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `oldPassword` (required, string)
  - `newPassword` (required, string)

### Delete User

- **Endpoint**: `DELETE /api/users`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `confirmationToken`

### Confirm User Deletion

- **Endpoint**: `POST /api/confirm-delete`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `confirmationToken` (required, string)
- **Side Effect**: Deletes associated UserProfile

## User Profile

### Get Current User Profile

- **Endpoint**: `GET /api/users/profile`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `profile`

### Update Profile Details

- **Endpoint**: `PUT /api/users/profile`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing (any of):
  - `interests` (optional, string[])
  - `bio` (optional, string)
  - `timezone` (optional, string)
  - `name` (optional, string)
  - `tel` (optional, number)
  - `gender` (optional, string)
  - `dob` (optional, string)
  - `timezone` (optional, string)
  - `emailNotifications` (optional, boolean)
  - `pushNotifications` (optional, boolean)
- **Response**: JSON object containing:
  - `message: "User profile updated"`
  - `profile`

### Upload User Photo

- **Endpoint**: `POST /api/users/profile/upload`
- **Authorization**: Bearer Token
- **Request Body**: Form-data containing:
  - `photo` (required, File)
- **Response**: JSON object containing:
  - `message: "Photo uploaded successfully"`
  - `photoUrl`

Note: The photo upload utilizes AWS S3 for storage.

## Friends

### Get All Friends

- **Endpoint**: `GET /api/friends`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `today: friend[], thisWeek: friend[], thisMonth: friend[], laterOn: friend[]`

### Add Friend

- **Endpoint**: `POST /api/friends/create`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `name` (required, string)
  - `dob` (required, Date - yyyy-mm-dd)
  - `gender` (required, string - one of "female", "male", "other")
  - `location` (optional, string)
  - `bio` (optional, string)
  - `interests` (optional, string[])
  - `tags` (optional, string[] - objectIds)
  - `giftPreferences` (optional, string[])
- **Response**: JSON object containing:
  - `newFriend`

### Upload Friend Photo

- **Endpoint**: `POST /api/friends/:id/upload`
- **Authorization**: Bearer Token
- **Request Body**: Form-data containing:
  - `photo` (required, File)
- **Response**: JSON object containing:
  - `message: "Photo uploaded successfully"`
  - `photoUrl`

### Show Friend

- **Endpoint**: `POST /api/friends/:id`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `friend`

### Delete Friend

- **Endpoint**: `DELETE /api/friends/:id/delete`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `message: 'Friend deleted successfully'`

### Update Friend

- **Endpoint**: `PUT /api/friends/:id/update`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `name` (optional, string)
  - `dob` (optional, Date - yyyy-mm-dd)
  - `location` (optional, string)
  - `bio` (optional, string)
  - `interests` (optional, string[])
  - `tags` (optional, string[] - objectIds)
  - `giftPreferences` (optional, string[])
  - `gender` (optional, string - one of "female", "male", "other")
- **Response**: JSON object containing:
  - `message: 'Friend updated'`

Note: tags and giftPreferences are not checked for duplicate entries at this endpoint.

### Get Friends Birthdays

- **Endpoint**: `GET /api/friends/birthdays`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `mm-dd` (represents friend dob)` : friend[]`

### Update Tags

- **Endpoint**: `POST /api/friends/:id/tags`
- **Authorization**: Bearer Token
- **Request Body**: JSON array containing:
  - JSON object containing:
    - `_id` (required, string - ID of existing tag)
    - `title` (required, string - title of existing tag)
    - `type` (required, string - type of existing tag)
  - OR:
    - `title` (required, string - title of new tag)
- **Response**: JSON object containing:
  - `message: 'Tags updated successfully'`

Note: This endpoint associates an existing tag with the friend, or creates a new tag and associates with the friend

### Generate 3 Gift Recommendations

- **Endpoint**: `POST /api/friends/:id/generate-gift`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `giftTypes` (required, string[] - must be known to the backend. Currently "present", "donation" and "experience" are accepted)
  - `tags` (required, string[] - names of tags to be sent with the query)
  - `budget` (optional, number - recommendations will try to be below this amount)
- **Response**: JSON object containing:
  - `recommendations`
  - `message: 'Gift recommendations generated'`

### Favorite a Gift Recommendation

- **Endpoint**: `POST /api/friends/:id/favorites`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `title` (required, string)
  - `reason` (required, string)
  - `imgSrc` (required, string - link of thumbnail image)
  - `giftType` (required, string - one of 'present', 'experience' or 'donation')
  - `imageSearchQuery` (required, string - query used to find thumbnail image)
    **Response**: JSON object containing:
  - `recommendation` (with ObjectId)

### List All Favorite Gift Recommendations

- **Endpoint**: `GET /api/friends/:id/favorites`
- **Authorization**: Bearer Token
  **Response**: JSON object containing:
  - `favorites`

### Delete a Favorite Gift Recommendation

- **Endpoint**: `DELETE /api/friends/:id/favorites/:favoriteId`
- **Authorization**: Bearer Token
  **Response**: JSON object containing:
  - `message: "Favorite gift removed"`

### Enable or Disable Notification for Friend

- **Endpoint**: `PUT /api/friends/update-notification-inclusion`
- **Authorization**: Bearer Token
  **Request Body**: JSON object containing:
  - `friendIds` (required, string[])
- **Response**: JSON object containing:
  - `message: 'Updated friend notification preference successfully'`

## Tags

### Get Default Tags

- **Endpoint**: `GET /api/tags`
- **Response**: JSON object containing:
  - `tag[]`

Note: Only returns tags that do not have the type designation of "custom" at this endpoint for the purpose of rendering options to user

### Get Tag Suggestions

- **Endpoint**: `GET /api/tags/suggestions`
- **Query Parameter**:
  - `search` (required, string - search term for matching tag title suggestion)
- **Response**: JSON object containing:
  - `tag[]`

## Reminders

### Get All Reminders

- **Endpoint**: `GET /api/reminders`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `reminder[]`

### Mark as Read

- **Endpoint**: `PUT /api/reminders/read`
  **Request Body**: JSON object containing:
  - `reminderIds` (required, string[])
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `message: 'Reminders marked as read successfully'`

### Delete Reminder

- **Endpoint**: `DELETE /api/reminders/:id/delete`
- **Authorization**: Bearer Token
- **Response**: JSON object containing:
  - `message: 'Reminder deleted successfully'`

## Device Info

### Post Device Info

- **Endpoint**: `POST /api/device`
- **Authorization**: Bearer Token
- **Request Body**: JSON object containing:
  - `token` (required, string)
- **Response**: JSON object containing:
  - `message: "Device token added"`
    _Note: Will hold one record per device token. If the same token is sent by another user, overwrites the record_
