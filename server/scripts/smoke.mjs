/**
 * End-to-end smoke test for the NOVA API.
 *
 *   node server/scripts/smoke.mjs [baseUrl]      (default http://localhost:4000/api)
 *
 * Registers two throwaway users and walks the whole surface: auth, projects,
 * membership and roles, tasks, board moves, comments, dashboard, and the access
 * rules that should reject each of those. Exits non-zero on the first failure.
 */
const BASE = (process.argv[2] ?? "http://localhost:4000/api").replace(/\/$/, "");

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { status: response.status, body: payload };
}

const stamp = Date.now();
const owner = {
  name: "Smoke Owner",
  email: `smoke.owner.${stamp}@nova.test`,
  password: "password123",
};
const teammate = {
  name: "Smoke Teammate",
  email: `smoke.mate.${stamp}@nova.test`,
  password: "password123",
};

async function main() {
  console.log(`NOVA API smoke test against ${BASE}\n`);

  console.log("Health");
  const health = await call("GET", "/health");
  check("health endpoint reports the database is up", health.body?.database === "up",
    JSON.stringify(health.body));

  console.log("\nAuthentication");
  const registered = await call("POST", "/auth/register", { body: owner });
  check("register returns 201 with a token", registered.status === 201 && !!registered.body?.token,
    `status ${registered.status}`);
  const ownerToken = registered.body?.token;

  const duplicate = await call("POST", "/auth/register", { body: owner });
  check("duplicate email is rejected with 409", duplicate.status === 409);

  const weak = await call("POST", "/auth/register", {
    body: { name: "Weak", email: `weak.${stamp}@nova.test`, password: "short" },
  });
  check("short password fails validation with 422", weak.status === 422);

  const badLogin = await call("POST", "/auth/login", {
    body: { email: owner.email, password: "wrong-password" },
  });
  check("wrong password is rejected with 401", badLogin.status === 401);

  const login = await call("POST", "/auth/login", {
    body: { email: owner.email, password: owner.password },
  });
  check("login returns a token", login.status === 200 && !!login.body?.token);

  const me = await call("GET", "/auth/me", { token: ownerToken });
  check("GET /auth/me returns the signed-in user", me.body?.user?.email === owner.email);

  const noToken = await call("GET", "/projects");
  check("protected route without a token returns 401", noToken.status === 401);

  const mateReg = await call("POST", "/auth/register", { body: teammate });
  const mateToken = mateReg.body?.token;
  check("second account created for permission checks", mateReg.status === 201 && !!mateToken);

  console.log("\nProjects");
  const created = await call("POST", "/projects", {
    token: ownerToken,
    body: { name: "Smoke Test Project", description: "Created by the smoke test" },
  });
  const project = created.body?.project;
  check("create project returns 201", created.status === 201 && !!project?.id);
  check("creator is the owner", project?.role === "OWNER");
  check("project key is derived from the name", /^[A-Z][A-Z0-9]{1,5}$/.test(project?.key ?? ""),
    project?.key);

  const list = await call("GET", "/projects", { token: ownerToken });
  check("project appears in the owner's list",
    list.body?.projects?.some((p) => p.id === project.id));

  const hidden = await call("GET", `/projects/${project.id}`, { token: mateToken });
  check("a non-member gets 404 for the project", hidden.status === 404);

  console.log("\nMembers and roles");
  const added = await call("POST", `/projects/${project.id}/members`, {
    token: ownerToken,
    body: { email: teammate.email, role: "VIEWER" },
  });
  check("teammate added as viewer", added.status === 201 && added.body?.member?.role === "VIEWER");

  const invited = await call("POST", `/projects/${project.id}/members`, {
    token: ownerToken,
    body: { email: `nobody.${stamp}@nova.test`, role: "MEMBER" },
  });
  check("unknown email produces an invitation", invited.status === 201 && !!invited.body?.invitation?.token);

  const nowVisible = await call("GET", `/projects/${project.id}`, { token: mateToken });
  check("member can now read the project", nowVisible.status === 200);

  const viewerWrite = await call("POST", `/projects/${project.id}/tasks`, {
    token: mateToken,
    body: { title: "Viewer should not be able to create this" },
  });
  check("viewer cannot create tasks (403)", viewerWrite.status === 403, `status ${viewerWrite.status}`);

  const viewerAdmin = await call("POST", `/projects/${project.id}/members`, {
    token: mateToken,
    body: { email: "someone@nova.test", role: "MEMBER" },
  });
  check("viewer cannot add members (403)", viewerAdmin.status === 403);

  const promoted = await call("PATCH", `/projects/${project.id}/members/${added.body.member.user.id}`, {
    token: ownerToken,
    body: { role: "MEMBER" },
  });
  check("owner can promote a viewer to member", promoted.body?.member?.role === "MEMBER");

  const ownerDemote = await call("PATCH", `/projects/${project.id}/members/${me.body.user.id}`, {
    token: ownerToken,
    body: { role: "MEMBER" },
  });
  check("the owner's own role cannot be changed (403)", ownerDemote.status === 403);

  console.log("\nTasks");
  const task = await call("POST", `/projects/${project.id}/tasks`, {
    token: ownerToken,
    body: { title: "First smoke task", priority: "HIGH", status: "TODO" },
  });
  check("create task returns 201", task.status === 201 && !!task.body?.task?.id);
  check("task numbering starts at 1", task.body?.task?.number === 1);

  const second = await call("POST", `/projects/${project.id}/tasks`, {
    token: ownerToken,
    body: { title: "Second smoke task" },
  });
  check("task numbers increment per project", second.body?.task?.number === 2);

  const badAssignee = await call("POST", `/projects/${project.id}/tasks`, {
    token: ownerToken,
    body: { title: "Bad assignee", assigneeId: "clw000000000000000000000" },
  });
  check("assigning a non-member is rejected (400)", badAssignee.status === 400);

  const moved = await call("PATCH", `/tasks/${task.body.task.id}`, {
    token: ownerToken,
    body: { status: "DONE" },
  });
  check("moving a task to DONE sets completedAt",
    moved.body?.task?.status === "DONE" && !!moved.body?.task?.completedAt);

  const reopened = await call("PATCH", `/tasks/${task.body.task.id}`, {
    token: ownerToken,
    body: { status: "IN_PROGRESS" },
  });
  check("moving it back clears completedAt", reopened.body?.task?.completedAt === null);

  const filtered = await call("GET", `/projects/${project.id}/tasks?status=IN_PROGRESS`,
    { token: ownerToken });
  check("status filter returns only matching tasks",
    filtered.body?.tasks?.length === 1 && filtered.body.tasks[0].status === "IN_PROGRESS");

  const searched = await call("GET", `/projects/${project.id}/tasks?q=second`, { token: ownerToken });
  check("text search matches on title", searched.body?.tasks?.length === 1);

  console.log("\nComments and activity");
  const comment = await call("POST", `/tasks/${task.body.task.id}/comments`, {
    token: ownerToken,
    body: { body: "Looks good to me." },
  });
  check("comment created", comment.status === 201 && !!comment.body?.comment?.id);

  const emptyComment = await call("POST", `/tasks/${task.body.task.id}/comments`, {
    token: ownerToken,
    body: { body: "   " },
  });
  check("empty comment is rejected (422)", emptyComment.status === 422);

  const detail = await call("GET", `/tasks/${task.body.task.id}`, { token: ownerToken });
  check("task detail includes its comments", detail.body?.task?.comments?.length === 1);

  const activity = await call("GET", `/projects/${project.id}/activity`, { token: ownerToken });
  check("activity feed records what happened", (activity.body?.activities?.length ?? 0) >= 4,
    `${activity.body?.activities?.length} entries`);

  console.log("\nReporting");
  const stats = await call("GET", `/projects/${project.id}/stats`, { token: ownerToken });
  check("project stats group tasks by status", (stats.body?.byStatus?.IN_PROGRESS ?? 0) === 1);

  const dashboard = await call("GET", "/dashboard", { token: ownerToken });
  check("dashboard summary counts the project", (dashboard.body?.summary?.projects ?? 0) >= 1);
  check("dashboard trend covers 14 days", dashboard.body?.trend?.length === 14);

  const myTasks = await call("GET", "/tasks?assignee=me", { token: ownerToken });
  check("cross-project task list responds", Array.isArray(myTasks.body?.tasks));

  console.log("\nCleanup");
  const mateDelete = await call("DELETE", `/projects/${project.id}`, { token: mateToken });
  check("a member cannot delete the project (403)", mateDelete.status === 403);

  const removed = await call("DELETE", `/projects/${project.id}`, { token: ownerToken });
  check("owner can delete the project (204)", removed.status === 204);

  const gone = await call("GET", `/projects/${project.id}`, { token: ownerToken });
  check("deleted project is gone (404)", gone.status === 404);

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("Failed checks:");
    for (const name of failures) console.log(`  - ${name}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error.message);
  process.exit(1);
});
