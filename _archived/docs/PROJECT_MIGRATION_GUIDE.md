# Project Migration Guide

This document provides a comprehensive guide for migrating the Flutter Chatbot project to a new GCP account or organization.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Checklist](#migration-checklist)
4. [Detailed Steps](#detailed-steps)
5. [Post-Migration Verification](#post-migration-verification)

---

## Overview

The Flutter Chatbot project uses the following services that need to be migrated:

| Service | Purpose | Migration Complexity |
|---------|---------|---------------------|
| Firebase/GCP Project | Core infrastructure | High |
| Cloud Functions | Backend API | Medium |
| Firestore | Database | High |
| Cloud Storage | Vector embeddings | Medium |
| Cloud Scheduler | Auto-sync scheduling | Low |
| Pinecone | Vector search | Low |
| Vercel | Frontend hosting | Low |

---

## Prerequisites

Before migration, ensure you have:

- [ ] Admin access to the current GCP project
- [ ] Owner access to the target GCP account/organization
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Pinecone account credentials
- [ ] Vercel account access

---

## Migration Checklist

### 1. GCP/Firebase Project

- [ ] Create new Firebase project or transfer existing project
- [ ] Enable required APIs:
  - Cloud Functions API
  - Cloud Build API
  - Cloud Scheduler API
  - Artifact Registry API
  - Vertex AI API
  - Cloud Storage API

### 2. IAM Permissions

Required roles for the service account:

- [ ] `Cloud Functions Admin`
- [ ] `Cloud Scheduler Admin`
- [ ] `Firebase Admin`
- [ ] `Storage Admin`
- [ ] `Firestore Admin`
- [ ] `Vertex AI User`

### 3. Environment Variables

Firebase Functions config:

```bash
firebase functions:config:set \
  pinecone.api_key="YOUR_PINECONE_API_KEY" \
  github.token="YOUR_GITHUB_TOKEN"
```

### 4. Firestore Data

- [ ] Export data from source project
- [ ] Import data to target project

### 5. Cloud Storage

- [ ] Transfer vector embeddings bucket (`hi-project-flutter-chatbot-vectors`)

### 6. Pinecone

- [ ] Update API key in Firebase config (if changing Pinecone account)
- [ ] Index name: `flutter-docs`

### 7. Vercel

- [ ] Update environment variables
- [ ] Reconnect GitHub repository

---

## Detailed Steps

### Step 1: Export Firestore Data

```bash
# Export from source project
gcloud firestore export gs://SOURCE_BUCKET/firestore-backup \
  --project=hi-project-flutter-chatbot

# Import to target project
gcloud firestore import gs://TARGET_BUCKET/firestore-backup \
  --project=NEW_PROJECT_ID
```

### Step 2: Transfer Cloud Storage

```bash
# Copy vector embeddings
gsutil -m cp -r gs://hi-project-flutter-chatbot-vectors/* gs://NEW_BUCKET_NAME/
```

### Step 3: Update Firebase Configuration

1. Create new Firebase project at https://console.firebase.google.com
2. Enable Authentication (Google & Email providers)
3. Create Firestore database
4. Update `.firebaserc`:

```json
{
  "projects": {
    "default": "NEW_PROJECT_ID"
  }
}
```

### Step 4: Update Frontend Environment Variables

Update `frontend/.env`:

```env
REACT_APP_FIREBASE_API_KEY=new_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=new_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=new_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=new_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=new_sender_id
REACT_APP_FIREBASE_APP_ID=new_app_id
REACT_APP_API_BASE_URL=https://us-central1-NEW_PROJECT_ID.cloudfunctions.net/generateAnswer
```

### Step 5: Update Backend Configuration

Update `functions/rag.js`:

```javascript
const PROJECT_ID = "NEW_PROJECT_ID";
const bucket = storage.bucket("NEW_BUCKET_NAME");
```

### Step 6: Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### Step 7: Set IAM Permissions

In GCP Console (https://console.cloud.google.com/iam-admin/iam):

1. Find your service account or user email
2. Click Edit (pencil icon)
3. Add roles:
   - Cloud Scheduler Admin
   - Cloud Functions Admin
   - Storage Admin
4. Save

### Step 8: Update Vercel

1. Go to Vercel Dashboard
2. Select project → Settings → Environment Variables
3. Update all `REACT_APP_*` variables with new values
4. Redeploy

### Step 9: Update Firebase Auth Domains

1. Go to Firebase Console → Authentication → Settings
2. Add new Vercel domain to Authorized domains

---

## Post-Migration Verification

### 1. Test Cloud Functions

```bash
# Test generateAnswer
curl -X POST "https://us-central1-NEW_PROJECT_ID.cloudfunctions.net/generateAnswer" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Flutter?", "conversationId": "test"}'

# Test GitHub sync
curl -X POST "https://us-central1-NEW_PROJECT_ID.cloudfunctions.net/runGitHubSync" \
  -H "Content-Type: application/json" \
  -d '{"testMode": true}'
```

### 2. Verify Scheduled Function

```bash
# Check if scheduler is created
gcloud scheduler jobs list --project=NEW_PROJECT_ID --location=us-central1
```

### 3. Test Frontend

1. Open Vercel deployment URL
2. Test Google login
3. Test chat functionality
4. Verify responses are generated correctly

### 4. Verify Data Integrity

```bash
# Check Firestore collections
firebase firestore:get document_chunks --limit 5

# Check vector embeddings in Cloud Storage
gsutil ls gs://NEW_BUCKET_NAME/
```

---

## Current Project Configuration Reference

For reference, here are the current project settings:

| Setting | Value |
|---------|-------|
| GCP Project ID | `hi-project-flutter-chatbot` |
| Firebase Project | `hi-project-flutter-chatbot` |
| Region | `us-central1` |
| Vector Bucket | `hi-project-flutter-chatbot-vectors` |
| Pinecone Index | `flutter-docs` |
| Scheduled Sync | Every Monday 3AM UTC (12PM KST) |

---

## Troubleshooting

### Cloud Scheduler Permission Error

```
Error: cloudscheduler.jobs.update permission denied
```

**Solution:** Add `Cloud Scheduler Admin` role to your account in IAM.

### Memory Overflow in Cloud Functions

```
Error: Memory limit of 2048 MiB exceeded
```

**Solution:** Ensure `USE_FREE_LOCAL_EMBEDDINGS = false` in `functions/rag.js` to use Google API instead of local model.

### Firebase Auth Domain Error

```
Error: This domain is not authorized
```

**Solution:** Add your domain to Firebase Console → Authentication → Settings → Authorized domains.

---

## Contact

For questions about migration, contact the project maintainers.
