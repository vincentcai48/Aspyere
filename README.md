# Aspyere

An online platform for live quiz rounds. 

## Usage

Available online at https://aspyere.com/. Sign in with Google or an email. Join a platform and start competing in live quiz rounds right away

## Development and Data

Aspyere is built with React and Firebase. Services used include Firebase Auth, Firebase Storage, Firebase Cloud Functions, and the Firebase Cloud Firestore database. This repository is an initialized Firebase project, and has all the config files for Firebase. Functions are included in the `/functions/index.js file`, and security rules for the Firestore database are in the `firebase.rules` file. 

The database is structured as a NoSQL document database that is sorted into collections and documents. Each collection is a group of documents, and each document contains data and may contain nested subcollections. At the root of the database, the `/databases` collection stores AspyereBase Databases, and each document in this collection has a `/questions` collection, with each document inside this collection containing data for that question. `/dbPrivateSettings` contains private information like access codes, stored in doucments with matching IDs to the `/databases` collection

The `/platforms` collection at the root, contains documents with root data about each platform. The `/users` subcollection within a platform document stores data about the user with ID correponding to the document ID, within the platform. This does not include any personal identification information, only information about the rounds completed, classes joined, last update seen, etc... (relating to that platform). Each subcollection inside a user document here has an ID of the corresponding group the user has joined within the platform, and has the document `userData` to store the user's statistics, shown on the "My Stats" page. The `/groups` subcollection of a platform document, contains public information about each group. The `/events` collection has documents with blueprints for how to generate event questions. The `/eventRecords` collection contains a copy of the questions generated for each user from the connected database. The `/privateSettings` collection has a document `privateSettings` with private settings about the platform, while other documents in this collection, whose IDs that correspond to the group IDs, contain private settings for each group.

## License

Aspyere is MIT Licensed
