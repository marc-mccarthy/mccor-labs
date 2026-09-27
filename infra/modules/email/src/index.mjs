// Forwards mail that SES received on your domain to a real inbox.
//
// SES has already stored the raw message in S3 by the time this runs. We can't
// re-send it untouched: SES only sends as a domain it has verified, so a
// message still claiming "From: stranger@gmail.com" would be rejected. Instead
// we swap From for our own address and put the original sender in Reply-To, so
// replying from your inbox reaches the person who wrote to you.

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

const s3 = new S3Client({});
const ses = new SESClient({});

const { MAIL_BUCKET, MAIL_FROM, FORWARD_TO } = process.env;

// Headers that describe the original delivery. Left in place they contradict
// the message we are about to send, and receivers treat that as forgery.
const STRIP = new Set([
  "return-path",
  "sender",
  "dkim-signature",
  "domainkey-signature",
  "authentication-results",
  "received-spf",
  "arc-authentication-results",
  "arc-message-signature",
  "arc-seal",
]);

// A header can be wrapped over several lines, with continuations indented.
// Join them back up so each entry is one complete header.
function splitMessage(raw) {
  const blank = raw.search(/\r?\n\r?\n/);
  if (blank === -1) return { headers: [], body: raw };

  const headerBlock = raw.slice(0, blank);
  const body = raw.slice(blank).replace(/^\r?\n\r?\n/, "");

  const headers = [];
  for (const line of headerBlock.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && headers.length > 0) {
      headers[headers.length - 1] += "\r\n" + line;
    } else {
      headers.push(line);
    }
  }
  return { headers, body };
}

function valueOf(headers, name) {
  const prefix = name.toLowerCase() + ":";
  const found = headers.find((h) => h.toLowerCase().startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : null;
}

function rewrite(raw) {
  const { headers, body } = splitMessage(raw);
  const originalFrom = valueOf(headers, "from");

  const kept = headers.filter((h) => {
    const name = h.slice(0, h.indexOf(":")).toLowerCase();
    return !STRIP.has(name) && name !== "from" && name !== "reply-to";
  });

  kept.unshift(`From: ${MAIL_FROM}`);
  if (originalFrom) kept.push(`Reply-To: ${originalFrom}`);

  return kept.join("\r\n") + "\r\n\r\n" + body;
}

export const handler = async (event) => {
  const record = event.Records?.[0]?.ses;
  if (!record) throw new Error("not an SES event");

  // SES names the object after the message id, and refuses the message itself
  // if its own spam or virus scan failed.
  const key = record.mail.messageId;
  const verdicts = record.receipt ?? {};
  const failed = ["spamVerdict", "virusVerdict"].filter(
    (v) => verdicts[v]?.status === "FAIL"
  );
  if (failed.length > 0) {
    console.log(`dropped ${key}: ${failed.join(", ")}`);
    return;
  }

  const stored = await s3.send(
    new GetObjectCommand({ Bucket: MAIL_BUCKET, Key: key })
  );
  const raw = await stored.Body.transformToString();

  await ses.send(
    new SendRawEmailCommand({
      Source: MAIL_FROM,
      Destinations: [FORWARD_TO],
      RawMessage: { Data: Buffer.from(rewrite(raw)) },
    })
  );

  console.log(`forwarded ${key} to ${FORWARD_TO}`);
};
