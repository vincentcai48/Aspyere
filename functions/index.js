const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { user } = require("firebase-functions/lib/providers/auth");
admin.initializeApp();

const db = admin.firestore();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest(async (request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  await db
    .collection("users")
    .doc("jWC5XTCceKeU9fiCMdfMqq7YbCH3")
    .update({
      platform: "platformId",
      recentPlatforms: admin.firestore.FieldValue.arrayUnion({
        platform: "platformId",
        time: admin.firestore.FieldValue.serverTimestamp(),
      }),
    });
  response.send("Hello from Firebase!");
});

//data: Object {platformId: , tryAccessCode:  }
// exports.joinPlatform = functions.https.onCall((data,context)=>{
//     db.collection("platforms").doc(data.plaformId).get().then((doc)=>{
//         doc.data()
//     })
// })

//data: Object {platformId: , groupId: , accessCodeTry}
exports.joinGroup = functions.https.onCall(async (data, context) => {
  var groupData = await db
    .collection("platforms")
    .doc(data.platformId)
    .collection("groups")
    .doc(data.groupId)
    .get();
  if (groupData.data().isPublic) {
    await joinGroupInDB(context.auth.uid, data.platformId, data.groupId);
    return true;
  } else {
    var privateSettings = await db
      .collection("platforms")
      .doc(data.platformId)
      .collection("privateSettings")
      .doc(data.groupId)
      .get();
    if (privateSettings.data().joinCode == data.accessCodeTry) {
      await joinGroupInDB(context.auth.uid, data.platformId, data.groupId);
      return true;
    } else {
      return false;
    }
  }
});

//creates the records, as well as switches the group
async function joinGroupInDB(userId, platformId, groupId) {
  await userPlatformRecord(userId, platformId);
  var doc = await db
    .collection("platforms")
    .doc(platformId)
    .collection("users")
    .doc(userId)
    .get();
  if (!doc.exists) {
    db.collection("platforms")
      .doc(platformId)
      .collection("users")
      .doc(userId)
      .set({
        currentGroup: groupId,
        records: {
          [groupId]: [],
        },
      });
  } else {
    var newRecords = { ...doc.data().records };
    if (!newRecords[groupId]) newRecords[groupId] = [];
    db.collection("platforms")
      .doc(platformId)
      .collection("users")
      .doc(userId)
      .update({
        currentGroup: groupId,
        records: newRecords,
      });
  }
}

//Switches the User's platform in the "users" collection
//also records the platform joined in the users recent platforms for quick access
async function userPlatformRecord(userId, platformId) {
  await db
    .collection("users")
    .doc(userId)
    .update({
      platform: platformId,
      allPlatforms: admin.firestore.FieldValue.arrayUnion(platformId),
    });
}

//data: Object {platformId: , updates: Object(), privateSettingsUpdates: Object() or null if none}
exports.updatePlatformSettings = functions.https.onCall(
  async (data, context) => {
    console.log(data, context.auth.uid);
    await db
      .collection("platforms")
      .doc(data.platformId)
      .get()
      .then((doc) => {
        console.log(doc.data());
        console.log(doc.data().admins);
        console.log(context.auth.uid, data.platformId, data.updates);
        if (doc.data().admins && doc.data().admins.includes(context.auth.uid)) {
          //Update public settings if there are settings to update
          if (data.updates && Object.keys(data.updates).length > 0) {
            db.collection("platforms")
              .doc(data.platformId)
              .update(data.updates)
              .catch((e) => console.log(e));
          }

          //Update private settings only if you need to.
          if (
            data.privateSettingsUpdates &&
            Object.keys(data.privateSettingsUpdates).length > 0
          ) {
            db.collection("platforms")
              .doc(data.platformId)
              .collection("privateSettings")
              .doc("privateSettings")
              .update(data.privateSettingsUpdates)
              .catch((e) => console.log(e));
          }
        } else {
          console.log("not an admin");
        }
      });
  }
);

//data: Object {platformId: , eventId: , updates: Object()}
//NOTE: Dates in updates.startTime and updates.endTime are just a number of milliseconds
exports.updateEvent = functions.https.onCall(async (data, context) => {
  var isAdmin = await checkIfAdmin(data.platformId, context.auth.uid);
  if (isAdmin) {
    var updates = { ...data.updates };
    updates.startTime = admin.firestore.Timestamp.fromDate(
      new Date(Number(updates.startTime))
    );
    // console.log(updates);
    updates.endTime = admin.firestore.Timestamp.fromDate(
      new Date(Number(updates.endTime))
    );
    // console.log(updates);
    if (data.eventId) {
      //edit an existing event
      await db
        .collection("platforms")
        .doc(data.platformId)
        .collection("events")
        .doc(data.eventId)
        .update(updates);
    } else {
      //create a new event
      await db
        .collection("platforms")
        .doc(data.platformId)
        .collection("events")
        .add(updates);
    }
  }
});

async function checkIfAdmin(platformId, userId) {
  var platformData = await db.collection("platforms").doc(platformId).get();
  return Boolean(
    platformData.data().admins && platformData.data().admins.includes(userId)
  );
}

//data: {platformId: , eventId: }
exports.getLiveQuestions = functions.https.onCall(async (data, context) => {
  //Step 1: check if the platform and event IDs are even valid
  var doc = await db
    .collection("platforms")
    .doc(data.platformId)
    .collection("events")
    .doc(data.eventId)
    .get();
  if (!doc.exists) return { isError: true, errorType: 2 };
  if (new Date().getTime() < doc.data().startTime.toDate().getTime())
    return { isError: true, errorType: 3 };
  if (new Date().getTime() > doc.data().endTime.toDate().getTime())
    return { isError: true, errorType: 4 };

  //Step 2: get the user records, to check for double-doing and get the group id.
  var userRecords = await getUserRecords(
    data.platformId,
    context.auth.uid,
    data.eventId
  );
  if (!userRecords.isFirstTime) return { isError: true, errorType: 1 };

  //Step 3: Get the difficulty:
  //if no group id, and working individually, auto set it to 100.
  var difficulty = 0;
  if (!userRecords.groupId) difficulty = 100;
  else {
    //else use the group ID to get the group's difficulty;
    var groupDoc = await db
      .collection("events")
      .doc(data.eventId)
      .collection("groups")
      .doc(userRecords.groupId)
      .get();
    if (groupDoc.exists) difficulty = Number(groupDoc.data().difficulty);
  }

  //Step 4: Now, with all the data fetched, get the questions data, and generate questions
  var questions = doc.data().questions;
  var questionsAsync = questions.map((q) =>
    generateQuestionFromDB(q, context.auth.uid, data.platformId, difficulty)
  ); //See this method (generateQuestionFromDB) for further Steps.
  var finalQuestions = [];
  for await (finalQuestion of questionsAsync) {
    if (finalQuestion) {
      var questionToPush = { ...finalQuestion };
      questionToPush.answers = null;
      (questionToPush.isError = false), finalQuestions.push(questionToPush);
    } else {
      //sometimes, there's an error with generating questions (no connected db, no questions meet criteria, etc). the above method will return null, and return an object with isErro: true;
      finalQuestions.push({
        isError: true,
      });
    }
  }
  return {
    isError: false,
    finalQuestions: finalQuestions,
    totalQs: questions.length,
  };
});
/*Returns:
An object with properties:
-isError: true if error, false otherwise
-errorType: only if error, 1 for already done this question, 2 for cannot find the event, 3 for not started yet, 4 for already finished.
-final questions: the data object from each of the questions generated.
*/

//check to prevent double doing the rounds, and get the groupId
//true: OK, is first time; false: already did this event;
async function getUserRecords(platformId, userId, eventId) {
  var userData = await db
    .collection("platforms")
    .doc(platformId)
    .collection("users")
    .doc(userId)
    .get();
  var currentGroup = userData.data().currentGroup;
  var records = userData
    .data()
    .records[currentGroup].filter((r) => r.eventId == eventId); //records of THIS event being done
  if (records.length == 0) return { isFirstTime: true, groupId: currentGroup };
  return { isFirstTime: true, groupId: currentGroup };
}
//returns {isFirstTime: , groupId: }

async function generateQuestionFromDB(
  question,
  userId,
  platformId,
  difficulty
) {
  //Step 5: Get the database id, generate if random.
  var dbId = question.databaseId;
  if (!dbId) dbId = await getRandomDB(platformId, userId); //here this is if the inputed db is undefined, then get a random DB
  if (question.dbRandomize) dbId = await getRandomDB(platformId, userId);
  if (!dbId) return null; //Here, if it is STILL nonexistent after any db was selected, this means there is no dbs connected to the platform, and thus an error.

  //Step 5.5: Only if there is a specific question ID, get the question and return. If the Question ID is nonexistent, fallback to generating random question.
  if (!question.questionRandomize && question.questionId) {
    var qr = await db
      .collection("databases")
      .doc(dbId)
      .collection("questions")
      .doc(question.questionId)
      .get();
    if (qr.exists) return qr.data(); //COME BACK, make sure you remove the answers from here, or somewhere in the code.
  }

  //Step 6: Get the possible question options
  difficulty = Number(difficulty);
  difficulty += Number(question.difficultyRange);
  var diffLower = difficulty - Math.abs(Number(question.difficultyOffset));
  var diffUpper = difficulty + Math.abs(Number(question.difficultyOffset));
  var questionOptions;
  //Step 6.1: First pass through. Strictly in the range, and containing the tags, if any
  if (question.tags && question.tags.length < 1) {
    //if No tags, query only within range.
    questionOptions = await db
      .collection("databases")
      .doc(dbId)
      .collection("questions")
      .where("difficulty", ">=", diffLower)
      .where("difficulty", "<=", diffUpper)
      .get();
  } else {
    //if there are tags, query with tags. Firestore only allows array-contains-any queries of 10 elements max.
    var tags = question.tags.slice(0, 10);
    questionOptions = await db
      .collection("databases")
      .doc(dbId)
      .collection("questions")
      .where("difficulty", ">=", diffLower)
      .where("difficulty", "<=", diffUpper)
      .where("tags", "array-contains-any", tags)
      .get();
  }
  if (questionOptions.docs.length > 0) {
    return {
      ...questionOptions.docs[
        hashToNumber(userId) % questionOptions.docs.length
      ].data(),
      points: question.points,
      stage: 1,
    };
  } else {
    //Step 6.2: Second pass through, if array is empty. Query without tags, and double the range.
    diffLower -= Math.abs(Number(question.difficultyOffset));
    diffUpper += Math.abs(Number(question.difficultyOffset));
    questionOptions = await db
      .collection("databases")
      .doc(dbId)
      .collection("questions")
      .where("difficulty", ">=", diffLower)
      .where("difficulty", "<=", diffUpper)
      .get();
    //then check again if the array is empty or not
    if (questionOptions.docs.length > 0) {
      return {
        ...questionOptions.docs[
          hashToNumber(userId) % questionOptions.docs.length
        ].data(),
        points: question.points,
        stage: 2,
      };
    } else {
      //Step 6.3: Third Pass through, no restrictions, any question in the database is fair game.
      questionOptions = await db
        .collection("databases")
        .doc(dbId)
        .collection("questions")
        .limit(10) //Change this if needed, but limit to 10 for now.
        .get();
      if (questionOptions.docs.length > 0) {
        return {
          ...questionOptions.docs[
            hashToNumber(userId) % questionOptions.docs.length
          ].data(),
          points: question.points,
          stage: 3,
        };
      } else {
        //Step 6.4: If nothing in that database, then return null, signalling failure.
        return null;
      }
    }
  }
}

async function getRandomDB(platformId, userId) {
  var platform = await db.collection("platforms").doc(platformId).get();
  var databases = platform.data().databases;
  if (databases.length == 0) return null;
  return databases[hashToNumber(userId) % databases.length];
}

function hashToNumber(string) {
  var num = 0;
  for (var i = 0; i < string.length; i++) {
    num += String(string).charCodeAt(i);
  }
  return num;
}

//data: {platformId: , eventId: }
exports.deleteEvent = functions.https.onCall(async (data, context) => {
  await db
    .collection("platforms")
    .doc(data.platformId)
    .collection("events")
    .doc(data.eventId)
    .delete();
});
