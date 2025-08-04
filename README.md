# 🎨## ✨ Features

- 📁 **File Upload**: Drag & drop or click to upload files
- 📋 **File Management**: View, download, and delete files
- 📧 **Email File Sharing**: Request files via email (perfect for tablet users)
- 🎯 **Origin Filtering**: Classify and filter files by their source headset (H1, H2, H3, H4)
- 🎛️ **Dual Mode Interface**: Upload mode for headsets, Tablet mode for email requests
- 🏷️ **Smart File Naming**: Files are automatically prefixed with headset identifiers
- 🎨 **Modern UI**: Beautiful gradient design with responsive layout
- 🐳 **Containerized**: Full Docker support for easy deployment
- 🔒 **Secure**: CORS protection and file validation
- ⚡ **Fast**: Built with Vite for lightning-fast development

## 🏗️ Architecture

The application works in a local network environment where:
- **Headsets** upload files via the upload interface (automatically assigned aliases H1, H2, H3, H4)
- **Tablets** request files via email using the tablet interface
- **Origin Tracking** automatically identifies and categorizes files by their source
- **Email Server** automatically sends files as attachments when requested

## 🎯 Origin Classification

Files are automatically classified by their upload source:
- Each headset IP address gets a simple alias (H1, H2, H3, H4)
- Files are prefixed with the headset identifier (e.g., `H1_file-12345.jpg`)
- Filter interface allows viewing files from specific headsets or all headsets
- Origin statistics show file count and total size per headseterver

A modern, containerized file server application built with React TypeScript frontend and Node.js Express backend.

## ✨ Features

- 📁 **File Upload**: Drag & drop or click to upload files
- 📋 **File Management**: View, download, and delete files
- 📧 **Email File Sharing**: Request files via email (perfect for tablet users)
- �️ **Dual Mode Interface**: Upload mode for headsets, Tablet mode for email requests
- �🎨 **Modern UI**: Beautiful gradient design with responsive layout
- 🐳 **Containerized**: Full Docker support for easy deployment
- 🔒 **Secure**: CORS protection and file validation
- ⚡ **Fast**: Built with Vite for lightning-fast development

## 🏗️ Architecture

The application works in a local network environment where:
- **Headsets** upload files via the upload interface
- **Tablets** request files via email using the tablet interface
- **Email Server** automatically sends files as attachments when requested

```
NeonBrushFileServer/
├── src/                    # React TypeScript frontend
├── backend/               # Node.js Express API
│   └── src/
├── .github/               # GitHub configurations
├── docker-compose.yml     # Production containers
├── docker-compose.dev.yml # Development containers
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Production Deployment
```bash
# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Development Mode
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
```

### Local Development (without Docker)
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Start backend (in backend directory)
npm run dev

# Start frontend (in root directory)
npm run dev
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with registered origins |
| GET | `/api/files` | List all uploaded files (supports `?origin=H1` filter) |
| GET | `/api/origins` | Get origin statistics and registered headsets |
| POST | `/api/upload` | Upload a file (automatically tagged with origin) |
| GET | `/api/files/:filename` | Download a specific file |
| DELETE | `/api/files/:filename` | Delete a specific file |
| POST | `/api/email/send` | Queue email with file attachment |
| GET | `/api/email/status/:jobId` | Check email job status |
| GET | `/api/email/queue` | Get email queue statistics |

## 📧 Email Configuration

The application supports sending files via email. Configure your SMTP settings in the backend `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note**: If email credentials are not configured, the system will simulate email sending for development purposes.

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Modern CSS** with gradients and animations

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Multer** for file uploads
- **Nodemailer** for email functionality
- **CORS** and **Helmet** for security

## 🎛️ Application Modes

### 📁 Upload Mode (Headsets)
- Drag & drop file upload interface
- File management (view, download, delete)
- Perfect for devices with file access

### 📧 Tablet Mode (Email Requests)
- Browse uploaded files
- Request files via email
- Simple interface optimized for tablets
- Email queue with status tracking

## 🐳 Docker Commands

```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up

# Build
docker-compose build

# Stop
docker-compose down
```

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
