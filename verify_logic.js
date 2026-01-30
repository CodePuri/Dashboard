const attritionList = [
  {
    user_id: "1",
    plan: "free",
    lastActiveDate: new Date().toISOString(),
    promptCount: 10,
  }, // Power Free
  {
    user_id: "2",
    plan: "pro",
    lastActiveDate: new Date().toISOString(),
    promptCount: 2,
  }, // Casual Pro
  { user_id: "3", plan: "trial", lastActiveDate: "2023-01-01", promptCount: 5 }, // Dead Trial
  {
    user_id: "4",
    plan: "free",
    lastActiveDate: new Date().toISOString(),
    promptCount: 3,
  }, // Casual Free
  {
    user_id: "5",
    plan: "pro",
    lastActiveDate: new Date().toISOString(),
    promptCount: 6,
  }, // Power Pro
];

const dateFilter = "Last 30 Days";

const isDateInFilter = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  switch (dateFilter) {
    case "Today":
      return date.toDateString() === now.toDateString();
    case "Last 7 Days":
      return now - date <= 7 * oneDay;
    case "Last 30 Days":
      return now - date <= 30 * oneDay;
    case "All Time":
      return true;
    default:
      return now - date <= 30 * oneDay;
  }
};

const segments = {
  Power: { Free: 0, Pro: 0, Freetrial: 0 },
  Casual: { Free: 0, Pro: 0, Freetrial: 0 },
  Dead: { Free: 0, Pro: 0, Freetrial: 0 },
};

console.log("Processing " + attritionList.length + " users...");

attritionList.forEach((user) => {
  let plan = "Free";
  const status = (user.plan || "").toLowerCase();
  if (
    status.includes("pro") ||
    status.includes("paid") ||
    status.includes("premium")
  )
    plan = "Pro";
  else if (status.includes("trial")) plan = "Freetrial";

  const isActive = isDateInFilter(user.lastActiveDate);

  console.log(
    `User ${user.user_id}: Plan=${plan}, Active=${isActive}, Prompts=${user.promptCount}`,
  );

  if (isActive) {
    if (user.promptCount >= 5) {
      segments.Power[plan]++;
    } else {
      segments.Casual[plan]++;
    }
  } else {
    segments.Dead[plan]++;
  }
});

const activeUsersChartData = [
  { name: "Power", ...segments.Power },
  { name: "Casual", ...segments.Casual },
  { name: "Dead", ...segments.Dead },
];

console.log("Resulting Chart Data:");
console.log(JSON.stringify(activeUsersChartData, null, 2));

// Expected:
// Power: Free=1, Pro=1, Freetrial=0
// Casual: Free=1, Pro=1, Freetrial=0
// Dead: Free=0, Pro=0, Freetrial=1
