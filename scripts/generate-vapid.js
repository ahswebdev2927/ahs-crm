// Script to generate Web Push VAPID keys
const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("=========================================");
console.log("Web Push VAPID Keys Generated:");
console.log("=========================================");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("VAPID_SUBJECT=mailto:support@ahscrm.internal");
console.log("=========================================");
console.log("Add the above values to your .env file.");
