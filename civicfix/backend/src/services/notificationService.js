import { db } from "../config/firebase.js";

const MESSAGES = {
  received: (c) => `Your report ${c.id} has been received.`,
  assigned: (c) => `Your report has been classified as ${c.category} and assigned to ${c.department}.`,
  linked: (c) => `Your report has been linked to an existing incident (${c.duplicateOf}) already being worked on.`,
  investigating: (c) => `An officer is investigating your report.`,
  resolved: (c) => `Repair/action has been completed. Please confirm whether the issue is fixed.`,
  closed: (c) => `Thanks for confirming — your report has been closed.`,
  reopened: (c) => `You indicated the issue isn't fixed. Your report has been reopened.`,
};

/**
 * Records a notification against the complaint. This is a stub: swap the
 * console.log for a real Twilio/SendGrid/Firebase Cloud Messaging call when
 * you have credentials for one of those.
 */
export async function notify(complaintId, stage, complaintData) {
  const buildMessage = MESSAGES[stage];
  const message = buildMessage ? buildMessage({ id: complaintId, ...complaintData }) : stage;

  await db
    .collection("complaints")
    .doc(complaintId)
    .collection("notifications")
    .add({
      stage,
      message,
      createdAt: Date.now(),
    });

  let emailSent = false;
  let emailError = null;
  const mailerUrl = process.env.PHP_MAILER_URL;
  if (complaintData.reporterEmail && mailerUrl && process.env.MAILER_SHARED_SECRET) {
    try {
      const response = await fetch(mailerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mailer-Secret": process.env.MAILER_SHARED_SECRET,
        },
        body: JSON.stringify({
          to: complaintData.reporterEmail,
          subject: stage === "received" ? `E-Complaint System report ${complaintId} received` : `E-Complaint System report ${complaintId} update`,
          text: `${message}\n\nTracking number: ${complaintId}\n\nYou can use this number to follow your report in E-Complaint System.`,
        }),
      });
      if (!response.ok) throw new Error(`PHP mailer returned HTTP ${response.status}`);
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : String(error);
      console.error(`[notify] email delivery failed for ${complaintId}: ${emailError}`);
    }
  }

  console.log(`[notify] ${complaintId}: ${message}${emailSent ? " Email sent." : " Email not sent."}`);
  return { emailSent, emailError };
}
