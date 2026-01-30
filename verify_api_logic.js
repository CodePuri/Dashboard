// Mock of the logic added to route.js
const activeBreakdownRaw = [
  { user_id: "1", plan: "free", prompt_count: 10 },
  { user_id: "2", plan: "pro", prompt_count: 2 },
  { user_id: "3", plan: "trial", prompt_count: 0 },
  { user_id: "4", plan: "free", prompt_count: 0 },
  { user_id: "5", plan: "pro", prompt_count: 6 },
];

const breakdownSegments = {
  Power: { Free: 0, Pro: 0, Freetrial: 0 },
  Casual: { Free: 0, Pro: 0, Freetrial: 0 },
  Dead: { Free: 0, Pro: 0, Freetrial: 0 },
};

activeBreakdownRaw.forEach((user) => {
  let plan = "Free";
  const status = (user.plan || "").toLowerCase();
  if (
    status.includes("pro") ||
    status.includes("paid") ||
    status.includes("premium")
  )
    plan = "Pro";
  else if (status.includes("trial")) plan = "Freetrial";

  const count = parseInt(user.prompt_count || "0");

  if (count === 0) {
    breakdownSegments.Dead[plan]++;
  } else if (count >= 5) {
    breakdownSegments.Power[plan]++;
  } else {
    breakdownSegments.Casual[plan]++;
  }
});

const activeUsersChartData = [
  { name: "Power", ...breakdownSegments.Power },
  { name: "Casual", ...breakdownSegments.Casual },
  { name: "Dead", ...breakdownSegments.Dead },
];

console.log(JSON.stringify(activeUsersChartData, null, 2));
