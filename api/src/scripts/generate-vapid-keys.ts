import * as webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

// eslint-disable-next-line no-console
console.log(`
VAPID key pair generated. Add the first two to api/.env (and to the Render
service environment), and the third to the Next.js build environment.

VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
`);
