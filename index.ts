import fs from "node:fs";
import { JigsawStack } from "jigsawstack";
import { hnWhoWantsToBeHiredURL, jd_file_name, min_rating, promptKey } from "./config/config.json";

const jigsaw = JigsawStack({
  apiKey: process.env.JIGSAW_API_KEY,
  disableRequestLogging: true,
});

const JD = fs.readFileSync(jd_file_name, "utf-8");

const dataDir = "data";

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const run = async () => {
  try {
    let hnData: Awaited<ReturnType<typeof jigsaw.web.ai_scrape>>;

    if (!fs.existsSync(`${dataDir}/hn_profile_scrape.json`)) {
      console.log("scraping...", hnWhoWantsToBeHiredURL, promptKey);
      hnData = await jigsaw.web.ai_scrape({
        url: hnWhoWantsToBeHiredURL,
        element_prompts: [promptKey],
      });

      fs.writeFileSync(`${dataDir}/hn_profile_scrape.json`, JSON.stringify(hnData, null, 2));
    } else {
      console.log("reading scraped data from cache...");
      hnData = JSON.parse(fs.readFileSync(`${dataDir}/hn_profile_scrape.json`, "utf-8"));
    }

    let posts = hnData.context[promptKey];
    console.log("Profiles found: ", posts?.length);

    posts = posts.filter((post) => {
      const pLower = post.toLowerCase();
      return pLower.includes("email:") && pLower.includes("technologies:");
    });

    console.log("Profiles with minimum required info: ", posts.length);

    const allHTML = hnData.data.map((d) => d.results.map((r) => r.html)).flat();

    let postStructure = posts.map((post) => {
      const structure: any = {
        Location: "",
        Remote: "",
        "Willing to relocate": "",
        Technologies: "",
        "Résumé/CV": "",
        Email: "",
      };

      for (const [key] of Object.entries(structure)) {
        // Use case-insensitive regex and look for key followed by colon
        // Match until next key or end of string or newline
        const nextKeys = Object.keys(structure).filter((k) => k !== key);
        const nextKeysPattern = nextKeys.length > 0 ? `(?=${nextKeys.join(":|")}:|\\n|$)` : "$";
        const regex = new RegExp(`${key}:?\\s*(.+?)${nextKeysPattern}`, "is");
        const match = post.match(regex);

        let value = match?.[1]?.trim() || null;

        if (key === "Email" && value) {
          value = value.replace("[at]", "@").replace("[dot]", ".").replace(" at ", "@").replace(" dot ", ".");
          if (value.includes("@")) {
            value = value.replaceAll(" ", "");
          }
        }

        if (key === "Résumé/CV" && value && value.includes("...")) {
          const html = allHTML.find((html) => html.includes(value || ""));
          const partialURL = value.replace("...", "");
          if (html) {
            const urls = html.match(/https?:\/\/[^\s]+/g) || [];
            const fullURLFound = urls.find((url) => url.includes(partialURL));
            if (fullURLFound) {
              value = fullURLFound.replace(/[">].*$/, "");
            }
          }
        }

        structure[key] = value;
      }

      let otherURLs = (post.match(/https?:\/\/[^\s]+/g) || []) as string[];
      otherURLs = otherURLs?.filter((u) => !u.includes("..."));
      structure.OtherURLs = Array.from(new Set(otherURLs?.map((url) => url.trim()) || []));

      const emailIndex = post.split("\n").findIndex((p) => p.toLowerCase().includes("email:"));
      const otherDetails = post.split("\n")[emailIndex + 1]?.trim();
      structure.OtherDetails = otherDetails || null;

      structure.FullPost = post;

      return structure;
    });

    fs.writeFileSync(`${dataDir}/hn_profile_clean.json`, JSON.stringify(postStructure, null, 2));
    console.log("mapped scraped data to structure");

    console.log("scoring profiles...");
    const scoreResults = await Promise.all(
      postStructure.map((p) =>
        jigsaw.prompt_engine.run_prompt_direct({
          prompt:
            "You are a job recruiter. You are given data of a job seekers and a job posting. You are to review their profile and determine if they are a good fit for the job. Rank profiles higher if they have more modern technology stacks like Supabase, Transformers, NextJS etc. Rank profiles lower if they don't have any links to their work or socials. Job Posting: {job_posting}. Job Seeker Profiler: {job_seeker_data}",
          inputs: [
            {
              key: "job_posting",
            },
            {
              key: "job_seeker_data",
            },
          ],
          input_values: {
            job_posting: JD,
            job_seeker_data: JSON.stringify(p),
          },
          return_prompt: {
            rating:
              "Rating from 1 to 10 inclusive where 1 is the lowest and 10 is the highest. You can't give 7 as a rating, for 7 rating decide between 6 and 8.",
            reasoning: "A 2 sentence reasoning for the rating",
            email_fixed: "Email of the job seeker fixed to be used for contacting them. If no email is found, return a string 'none'",
          },
        })
      )
    );

    const fullResults = scoreResults
      .map((r, index) => ({
        ...postStructure[index],
        ...r.result,
        rating: Number.parseInt(r.result.rating),
      }))
      .sort((a: any, b: any) => b.rating - a.rating);

    fs.writeFileSync(`${dataDir}/hn_profile_fixed_with_scores.json`, JSON.stringify(fullResults, null, 2));
    console.log("scoring completed");

    const filteredResults = fullResults.filter((r: any) => r?.email_fixed && r?.email_fixed !== "none" && r.OtherURLs.length > 0);
    console.log("Results with email and at least one URL: ", filteredResults.length);

    fs.writeFileSync(`${dataDir}/results.json`, JSON.stringify(filteredResults, null, 2));

    console.log(filteredResults.filter((r: any) => r.rating >= min_rating).length, `with scores more than or equal to ${min_rating}`);
    console.log(filteredResults.filter((r: any) => r.rating > 5).length, "with scores more than 5");
    console.log(filteredResults.filter((r: any) => r.rating <= 5).length, "with scores less than or equal to 5");
    console.log("done");
  } catch (error) {
    console.error(error);
  }
};

run();
