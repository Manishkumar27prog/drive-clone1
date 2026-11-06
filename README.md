
# Drive Clone

A full-stack Google Drive-inspired file storage application built using JavaScript, Node.js, Express.js, and PostgreSQL.

The application allows users to create accounts, securely upload and manage files, organize their storage, and access their files through a browser-based interface.

## Features

### Authentication
- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- HTTP-only authentication cookies
- Protected API routes

### File Management
- Upload files
- Download files
- Preview supported files
- Rename files
- Search files
- Star and unstar files
- Move files to trash
- Restore deleted files
- Permanently delete files
- View recent and starred files

### Folder Management
- Backend API support for folder creation
- Retrieve, update, and delete folders

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt |
| File Uploads | Multer |
| Security | Helmet, CORS |
| Development | Nodemon, Git |

## Project Structure

```text
drive-clone/
│
├── index.html
├── styles.css
├── auth.css
├── script.js
│
├── src/
│   ├── api.js
│   └── auth.js
│
├── server/
│   ├── database/
│   │   └── schema.sql
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── files.js
│   │   │   └── folders.js
│   │   └── server.js
│   │
│   ├── uploads/
│   ├── package.json
│   └── .env
│
└── README.md
```

## Getting Started

### 1. Prerequisites

Install the following:

- Node.js
- npm
- PostgreSQL
- Git

### 2. Clone the Repository

```bash
git clone https://github.com/Manishkumar27prog/drive-clone1.git
cd drive-clone1
```

### 3. Set Up PostgreSQL

Create a PostgreSQL user and database.

Open the PostgreSQL terminal:

```bash
sudo -u postgres psql
```

Execute:

```sql
CREATE USER drive_user WITH PASSWORD 'your_password';
CREATE DATABASE drive_clone OWNER drive_user;
```

Exit PostgreSQL:

```sql
\q
```

### 4. Configure Environment Variables

Navigate to the server directory:

```bash
cd server
```

Create a `.env` file:

```bash
nano .env
```

Add the following configuration:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=drive_clone
DB_USER=drive_user
DB_PASSWORD=your_password

JWT_SECRET=replace_with_a_long_random_secret
```

Replace the database password and JWT secret with your own values.

**Never upload your `.env` file or expose your credentials publicly.**

### 5. Install Backend Dependencies

From the `server` directory:

```bash
npm install
```

### 6. Initialize the Database

Run:

```bash
psql -U drive_user -d drive_clone -f database/schema.sql
```

Enter the PostgreSQL password when prompted.

### 7. Start the Backend

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 8. Start the Frontend

Open another terminal and navigate to the project root:

```bash
cd ~/projects/drive-clone
python3 -m http.server 5500
```

Open this URL in your browser:

```text
http://localhost:5500
```

Register an account and start using the application.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Files

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files` | List files |
| GET | `/api/files/:id/download` | Download a file |
| PATCH | `/api/files/:id/rename` | Rename a file |
| PATCH | `/api/files/:id/star` | Star or unstar a file |
| DELETE | `/api/files/:id` | Move file to trash |
| GET | `/api/files/trash` | List trashed files |
| PATCH | `/api/files/:id/restore` | Restore a file |
| DELETE | `/api/files/:id/permanent` | Permanently delete a file |
| GET | `/api/files/starred` | List starred files |
| GET | `/api/files/recent` | List recent files |
| GET | `/api/files/search?q=query` | Search files |

### Folders

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/folders` | Create a folder |
| GET | `/api/folders` | List folders |
| PATCH | `/api/folders/:id` | Update a folder |
| DELETE | `/api/folders/:id` | Delete a folder |

Protected endpoints require authentication.

## Database Design

The application uses PostgreSQL with three primary tables:

- **users** — stores user account information and hashed passwords.
- **folders** — stores folder metadata and parent-folder relationships.
- **files** — stores file metadata, ownership, storage paths, and deletion/star status.

File contents are stored on the server's filesystem, while PostgreSQL stores their metadata.

## Security Considerations

- Passwords are hashed using bcrypt.
- JWT tokens are stored in HTTP-only cookies.
- Protected routes use authentication middleware.
- User-specific file and folder operations are scoped to authenticated users.
- Environment variables are used for sensitive configuration.

## Future Improvements

- Complete folder navigation in the frontend
- Nested folder management
- Moving files between folders
- File sharing and access permissions
- File size and type restrictions
- Automated backend API testing
- Cloud storage integration
- Production deployment

## Author

**Manish Kumar**

Mechanical Engineering, IIT (BHU), Varanasi

GitHub: [Manishkumar27prog](https://github.com/Manishkumar27prog)
