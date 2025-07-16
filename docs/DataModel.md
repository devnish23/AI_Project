# Data Model

## User
- _id: ObjectId
- username: String
- email: String
- password: String (hashed)
- role: String (admin/user)
- preferences: Object

## Application
- _id: ObjectId
- name: String
- vendor: String
- cves: [String]
- eolDate: Date
- patchHistory: [Object]
- ... (other metadata fields)

## VendorPortal
- _id: ObjectId
- name: String
- apiEndpoint: String
- authSettings: Object
- rateLimit: Number
- ... (other config fields)

## Schedule
- _id: ObjectId
- applicationId: ObjectId
- scheduleDate: Date
- status: String 