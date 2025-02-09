import fs from "node:fs";
import { marked } from "marked";
import { Resend } from "resend";
import { email, min_rating } from "./config/config.json";
const { email_file_name, from, subject, replyTo } = email;

export const resend = new Resend(process.env.RESEND_API_KEY);

const emailThem = async () => {
  try {
    const emailsAlreadySent = fs.existsSync(`config/emails_sent.json`) ? JSON.parse(fs.readFileSync(`config/emails_sent.json`, "utf-8")) : [];

    if (!fs.existsSync(`data/results.json`)) {
      throw new Error("Results do not exist, run `bun index.ts` first");
    }

    const jobSeekers = JSON.parse(fs.readFileSync(`data/results.json`, "utf-8"));
    const jobSeekersToEmail = jobSeekers.filter((j: any) => j.rating >= min_rating && !emailsAlreadySent.includes(j.email_fixed));

    console.log("emailing job seekers with scores >= ", min_rating);

    const emailText = fs.readFileSync(email_file_name, "utf-8");

    const emailHTML = await marked(emailText, {
      breaks: true,
    });

    const allSendsResp = await Promise.allSettled(
      jobSeekersToEmail.map(async (j: any) => {
        await resend.emails.send({
          subject: subject,
          from: from,
          to: j.email_fixed,
          html: emailHTML,
          replyTo: replyTo,
        });
        console.log("sent to: ", j.email_fixed);
      })
    );

    const failedEmails = allSendsResp
      .map((r, index) => {
        if (r.status == "fulfilled") {
          emailsAlreadySent.push(jobSeekersToEmail[index].email_fixed);
          return null;
        } else {
          console.log("failed because: ", r.reason);
          return jobSeekersToEmail[index].email_fixed;
        }
      })
      .filter((e) => e !== null);

    console.log("failedEmails: ", failedEmails);

    fs.writeFileSync("config/emails_failed.json", JSON.stringify(failedEmails, null, 2));
    fs.writeFileSync("config/emails_sent.json", JSON.stringify(emailsAlreadySent, null, 2));
  } catch (error: any) {
    console.error(error?.message || error);
  }
};

emailThem();
