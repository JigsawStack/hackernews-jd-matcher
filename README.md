# HackerNews JD Matcher (Who Wants to be Hired)

Every month, a new thread is created on HackerNews called [Who Wants to be Hired](https://news.ycombinator.com/item?id=42919500) where people who are looking for a new role can post their details. It's mostly tech talents. It's a good source of amazing candidates if you're hiring tech or tech adjacent roles like we are at [JigsawStack](https://jigsawstack.com/careers)!

On average there are 600+ profiles posted every month, and it's a pain to go through them one by one.

So we wrote a script that uses JigsawStack's AI scraper and Prompt Engine to automatically scrape the profiles, structure the data, fix it then score it using AI by comparing it to our JD. We email the top candidates for an interview :)

We've found amazing candidates who will be joining us at JigsawStack and it's saved us a lot of time!

> Note: This is not a perfect solution, it worked for our hiring process but might not for yours, use at your own risk!

## Stack

- [Bun](https://bun.sh/)
- [JigsawStack](https://jigsawstack.com/)
- [Resend](https://resend.com/)

## Here's how you can use it:

- Clone the repo
- Install dependencies with `bun install`
- Create a `.env` file and add your JigsawStack API key. Use the `.env.example` as a reference.
- All config is in `config` folder in the root. You can replace the `JD.md` with your own JD in markdown format.
- Run the script with `bun run index.ts`

You can view the example of how results look like [here](/example_data/results.json)

## Config

```json
{
  "promptKey": "post_description",
  "hnWhoWantsToBeHiredURL": "https://news.ycombinator.com/item?id=42575535", //replace this to the latest month URL
  "jd_file_name": "config/JD.md",
  "min_rating": 8, //lower or increase the rating of the candidates
  "email": {
    //optional, only if you want to automatically email the candidates
    "email_file_name": "config/email.md",
    "from": "YourName <youremail@company.com>",
    "subject": "Saw your post on HN for a new role",
    "replyTo": "youremail@company.com"
  }
}
```

You can replace `hnWhoWantsToBeHiredURL` with the latest month URL. Find all `who wants to be hired` threads [here](https://hn.algolia.com/?dateRange=all&page=0&prefix=true&query=Ask%20HN:%20Who%20wants%20to%20be%20hired&sort=byDate&type=ask_hn).

Replace the `JD.md` with your own JD in markdown format.

## Data

After running the script, you can find the data in the `data` folder.

- `hn_profile_scrape.json` - the raw data scraped from the HackerNews thread
- `hn_profile_clean.json` - the cleaned data with the structured profiles
- `hn_profile_fixed_with_scores.json` - the data with the scores and formatting fixes
- `results.json` - the file results with the scores and the email

Since the data is cache, scraping the initial data is only done once. To re-scrape the latest data, you can run `bun run clean_data` to remove all files in the `data` folder. Then run the script again.

## Email

After running the script, you can email the candidates using Resend by running `bun run email.ts`.

You can edit the `email.md` file to change the email content and the `email` object in `config/config.json` to change the email settings.

## Future

This is an example of how we used JigsawStack to help with hiring. This script can be transformed to work for other forums like job portals, like reddit. You could even reverse it to find job opportunities in [Who is hiring?](https://hn.algolia.com/?dateRange=all&page=0&prefix=true&query=Ask%20HN:%20Who%20is%20hiring&sort=byDate&type=ask_hn)

## Hiring

We're still hiring! Check out our [careers page](https://jigsawstack.com/careers) for open roles.
