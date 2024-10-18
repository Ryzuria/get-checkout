import simpleGit, {
  SimpleGit,
  LogResult,
  DefaultLogFields,
  PullResult,
} from "simple-git";
import * as path from "path";
import { format, subDays } from "date-fns";
import * as fs from "fs";

// Put your repo path here
const dirPath = "";
const repo = [
  dirPath + "",
]

// Put your email here
const myEmail = "";

async function checkoutAndPull(git: SimpleGit): Promise<boolean> {
  try {
    await git.checkout("develop");
    await git.fetch();

    const pullResult: PullResult = await git.pull("origin", "develop");
    return pullResult.summary.changes >= 0;
  } catch (err) {
    console.error("Error during pull:", err);
    return false;
  }
}

async function getCommits(currentDate: Date, repo: string): Promise<string> {
  try {
    console.log('Pulling on "' + repo + '"');
    const git: SimpleGit = simpleGit(repo);
    // Checkout to the branch and pull updates
    const pullSuccessful = await checkoutAndPull(git);

    if (!pullSuccessful) {
      console.log("Pull failed or no changes were pulled.");
      return "";
    }

    const currentDateStr = format(currentDate, "yyyy-MM-dd");

    const log: LogResult<DefaultLogFields> = await git.log();

    const yesterdayCommits = log.all.filter((commit) => {
      const commitDate = format(new Date(commit.date), "yyyy-MM-dd");
      const commitAuthorEmail = commit.author_email;
      return (
        commitDate === currentDateStr &&
        commitAuthorEmail === myEmail &&
        !commit.message.startsWith("Merge")
      );
    });

    const fileContent = yesterdayCommits
      .map((commit) => `- ${commit.message}.`)
      .join("\n");

    const repoName = path.basename(repo);

    if (fileContent.length === 0) {
      return "";
    }

    console.log("Successfully wrote commits to file");
    return `${repoName}:\n${fileContent}\n`;
  } catch (err) {
    console.error("Error:", err);
    return "";
  }
}

async function getYesterdayCheckout(currentDate: Date) {
  const filePath = path.resolve(process.cwd(), "checkout.txt");
  let finalContent = "";

  for (const repoPath of repo) {
    const repoContent = await getCommits(currentDate, repoPath);
    finalContent += repoContent;
  }
  console.log(finalContent);

  fs.writeFileSync(filePath, finalContent);
  console.log(`Commits have been written to ${filePath}`);
}

async function updateCheckoutDate() {
  const filePath = path.resolve(process.cwd(), "template.txt");
  const checkoutFilePath = path.resolve(process.cwd(), "checkout.txt");

  const fileContent = fs.readFileSync(filePath, "utf-8");

  const dateReg = /\b\d{1,2} \w+ \d{4}\b/;
  const dateMatch = fileContent.match(dateReg);

  if (!dateMatch) {
    console.log("No date found in template.txt");
    return;
  }

  const currentDateStr = dateMatch[0];
  const currentFileDate = new Date(currentDateStr);
  currentFileDate.setDate(currentFileDate.getDate() + 1);

  if (currentFileDate.getDay() === 6 || currentFileDate.getDay() === 7) {
    currentFileDate.setDate(currentFileDate.getDate() + 2);
  }

  await getYesterdayCheckout(currentFileDate);

  const updateDateStr = currentFileDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let updateContent = fileContent.replace(currentDateStr, updateDateStr);

  //insert checkout.txt
  const checkoutContent = fs.readFileSync(checkoutFilePath, "utf-8");

  const todayIndex = updateContent.indexOf("Today:");
  const stuckIndex = updateContent.indexOf("Stuck:");

  if (todayIndex === -1 || stuckIndex === -1) {
    console.log("Today or Stuck not found in template.txt");
    return;
  }

  updateContent =
    updateContent.slice(0, todayIndex + "Today:".length) +
    "\n" +
    checkoutContent +
    "\n" +
    updateContent.slice(stuckIndex);

  fs.writeFileSync(filePath, updateContent);

  console.log(`Successfully update template ${filePath}`);
}

updateCheckoutDate();
