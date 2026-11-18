import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProjectNavigation } from "@/components/workspace/project-navigation";
import { ProjectRecordForm, type ProjectRecordField } from "@/components/workspace/project-record-form";
import { canViewProjectSection, canWriteProjectRecord } from "@/lib/project-permissions";
import { getProjectMembership } from "@/lib/project-access";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const taskStatuses = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "Doing" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "IN_REVIEW", label: "Review" },
  { value: "DONE", label: "Done" }
];

function PageHeading({ section, projectId }: { section: string; projectId: string }) {
  const titles: Record<string, { title: string; description: string }> = {
    tasks: { title: "Tasks", description: "Assign owners and follow work through each stage." },
    dependencies: { title: "Plan and dependencies", description: "Set project stages and see which tasks are waiting on others." },
    materials: { title: "Material tracker", description: "Record deliveries and issues against the project store." },
    money: { title: "Money", description: "Track budgets, released funds and recorded site cash." },
    vendors: { title: "Vendors", description: "Manage suppliers invited to support this project." },
    site: { title: "Site diary", description: "Record daily work, attendance and site issues." },
    "gate-log": { title: "Gate log", description: "Record every vehicle and load entering or leaving the site." },
    zones: { title: "Zone map", description: "Organize the project by floor, zone or work area." },
    documents: { title: "Documents", description: "Keep project drawings, permits and records in one place." }
  };
  const copy = titles[section];

  return (
    <section className="page-heading page-heading-row">
      <div>
        <p className="eyebrow">PROJECT WORKSPACE</p>
        <h1>{copy.title}</h1>
        <p className="muted">{copy.description}</p>
      </div>
      <Link className="button button-outline" href={`/workspace/projects/${projectId}`}><ArrowRight size={14} /> Project home</Link>
    </section>
  );
}

function RecordPanel({
  title,
  description,
  projectId,
  type,
  fields,
  submitLabel
}: {
  title: string;
  description?: string;
  projectId: string;
  type: string;
  fields: ProjectRecordField[];
  submitLabel: string;
}) {
  return (
    <article className="module-card">
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      <ProjectRecordForm projectId={projectId} recordType={type} fields={fields} submitLabel={submitLabel} />
    </article>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="muted">{children}</p>;
}

export default async function ProjectSectionPage({
  params
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;
  const { projectId, section } = await params;
  const membership = await getProjectMembership(session.user.id, projectId);
  if (!membership) notFound();

  const supportedSections = ["tasks", "dependencies", "materials", "money", "vendors", "site", "gate-log", "zones", "documents"];
  if (!supportedSections.includes(section) || !canViewProjectSection(membership.role, section)) notFound();

  const project = membership.project;
  const canWrite = (recordType: string) => canWriteProjectRecord(membership.role, recordType);
  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId, status: "ACTIVE" },
    select: { userId: true, role: true, user: { select: { name: true } } },
    orderBy: { joinedAt: "asc" }
  });
  const stages = await prisma.stage.findMany({
    where: { projectId },
    select: { id: true, name: true, startsAt: true, targetEnd: true },
    orderBy: { position: "asc" }
  });
  const stageOptions = stages.map((stage) => ({ value: stage.id, label: stage.name }));
  const memberOptions = projectMembers.map((member) => ({ value: member.userId, label: `${member.user.name} · ${member.role.replaceAll("_", " ")}` }));

  let content: React.ReactNode;

  if (section === "tasks") {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueAt: true,
        assignee: { select: { name: true } },
        stage: { select: { name: true } }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
    });
    content = (
      <>
        {canWrite("task") && <RecordPanel
          title="New task"
          description="Give each task an owner and a clear due date."
          projectId={projectId}
          type="task"
          submitLabel="Add task"
          fields={[
            { name: "title", label: "Task name", type: "text", required: true },
            { name: "dueAt", label: "Due date and time", type: "datetime-local" },
            { name: "stageId", label: "Stage", type: "select", options: stageOptions },
            { name: "assigneeId", label: "Owner", type: "select", options: memberOptions },
            { name: "description", label: "Details", type: "textarea" }
          ]}
        />}
        <article className="module-card module-card-wide">
          <div className="section-heading"><div><p className="eyebrow">TASK BOARD</p><h2>Work by status</h2></div><span className="status-chip">{tasks.length} tasks</span></div>
          <div className="kanban-grid">
            {taskStatuses.map((status) => {
              const statusTasks = tasks.filter((task) => task.status === status.value);
              return (
                <section className="kanban-column" key={status.value}>
                  <h3>{status.label}<span>{statusTasks.length}</span></h3>
                  {statusTasks.map((task) => (
                    <article className="kanban-task" key={task.id}>
                      <strong>{task.title}</strong>
                      <small>{task.assignee?.name ?? "Unassigned"} · {task.stage?.name ?? "No stage"}</small>
                      <small>{task.dueAt ? `Due ${task.dueAt.toLocaleDateString()}` : "No due date"}</small>
                      {canWrite("taskStatus") && <ProjectRecordForm
                        projectId={projectId}
                        recordType="taskStatus"
                        compact
                        submitLabel="Update"
                        fields={[
                          { name: "taskId", label: "", type: "hidden", value: task.id },
                          { name: "status", label: "Status", type: "select", value: task.status, required: true, options: taskStatuses }
                        ]}
                      />}
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
          {!tasks.length && <EmptyText>Create a task to start tracking project work.</EmptyText>}
        </article>
      </>
    );
  } else if (section === "dependencies") {
    const [tasks, dependencies] = await Promise.all([
      prisma.task.findMany({ where: { projectId }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
      prisma.taskDependency.findMany({
        where: { predecessor: { projectId } },
        select: {
          id: true,
          predecessor: { select: { title: true, status: true } },
          successor: { select: { title: true, status: true } }
        }
      })
    ]);
    const taskOptions = tasks.map((task) => ({ value: task.id, label: task.title }));
    content = (
      <>
        {canWrite("stage") && <RecordPanel
          title="Add a project stage"
          projectId={projectId}
          type="stage"
          submitLabel="Add stage"
          fields={[
            { name: "name", label: "Stage name", type: "text", required: true },
            { name: "startsAt", label: "Planned start", type: "date" },
            { name: "targetEnd", label: "Target finish", type: "date" }
          ]}
        />}
        {canWrite("dependency") && <RecordPanel
          title="Add a task dependency"
          description="Choose the task that must finish first and the task waiting on it."
          projectId={projectId}
          type="dependency"
          submitLabel="Add dependency"
          fields={[
            { name: "predecessorId", label: "Must finish first", type: "select", required: true, options: taskOptions },
            { name: "successorId", label: "Waiting task", type: "select", required: true, options: taskOptions }
          ]}
        />}
        <article className="module-card module-card-wide">
          <p className="eyebrow">SCHEDULE</p><h2>Project stages</h2>
          {stages.length ? (
            <div className="module-list">
              {stages.map((stage, index) => (
                <div className="module-list-row" key={stage.id}>
                  <div><strong>{String(index + 1).padStart(2, "0")} · {stage.name}</strong><small>{stage.startsAt?.toLocaleDateString() ?? "Start date not set"}</small></div>
                  <small>{stage.targetEnd?.toLocaleDateString() ?? "Finish date not set"}</small>
                </div>
              ))}
            </div>
          ) : <EmptyText>Add stages to build the project schedule.</EmptyText>}
          <p className="eyebrow" style={{ marginTop: 22 }}>DEPENDENCIES</p>
          {dependencies.length ? (
            <div className="module-list">
              {dependencies.map((dependency) => (
                <div className="module-list-row" key={dependency.id}>
                  <div><strong>{dependency.predecessor.title}</strong><small>{dependency.predecessor.status.replaceAll("_", " ")}</small></div>
                  <span aria-hidden="true">→</span>
                  <div><strong>{dependency.successor.title}</strong><small>{dependency.successor.status.replaceAll("_", " ")}</small></div>
                </div>
              ))}
            </div>
          ) : <EmptyText>No task dependencies recorded.</EmptyText>}
        </article>
      </>
    );
  } else if (section === "materials") {
    const [materials, recentEvents] = await Promise.all([
      prisma.material.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          unit: true,
          events: { select: { quantity: true, kind: true } }
        },
        orderBy: { name: "asc" }
      }),
      prisma.inventoryTransaction.findMany({
        where: { projectId },
        select: { id: true, quantity: true, kind: true, note: true, createdAt: true, material: { select: { name: true, unit: true } } },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);
    const materialOptions = materials.map((material) => ({ value: material.id, label: `${material.name} (${material.unit})` }));
    content = (
      <>
        {canWrite("material") && <RecordPanel title="Add material" projectId={projectId} type="material" submitLabel="Add material" fields={[
          { name: "name", label: "Material", type: "text", required: true },
          { name: "unit", label: "Unit", type: "text", required: true, placeholder: "bags, tonnes, lengths…" }
        ]} />}
        {canWrite("inventory") && <RecordPanel title="Record stock movement" projectId={projectId} type="inventory" submitLabel="Save movement" fields={[
          { name: "materialId", label: "Material", type: "select", required: true, options: materialOptions },
          { name: "kind", label: "Movement", type: "select", required: true, options: [{ value: "RECEIVE", label: "Received" }, { value: "ISSUE", label: "Issued to site" }] },
          { name: "quantity", label: "Quantity", type: "number", required: true, min: 0.001, step: 0.001 },
          { name: "note", label: "Note", type: "text" }
        ]} />}
        <article className="module-card">
          <p className="eyebrow">STORE BALANCE</p><h2>Materials on site</h2>
          {materials.length ? (
            <div className="module-list">
              {materials.map((material) => {
                const balance = material.events.reduce((total, event) => total + Number(event.quantity) * (event.kind === "ISSUE" ? -1 : 1), 0);
                return <div className="module-list-row" key={material.id}><strong>{material.name}<small>{balance.toLocaleString()} {material.unit}</small></strong></div>;
              })}
            </div>
          ) : <EmptyText>No materials added yet.</EmptyText>}
        </article>
        <article className="module-card">
          <p className="eyebrow">RECENT MOVEMENTS</p><h2>Stock activity</h2>
          {recentEvents.length ? (
            <div className="module-list">
              {recentEvents.map((event) => (
                <div className="module-list-row" key={event.id}>
                  <div><strong>{event.material.name} · {event.kind === "RECEIVE" ? "Received" : "Issued"}</strong><small>{event.note || event.createdAt.toLocaleDateString()}</small></div>
                  <span>{Number(event.quantity).toLocaleString()} {event.material.unit}</span>
                </div>
              ))}
            </div>
          ) : <EmptyText>Material movements will appear here.</EmptyText>}
        </article>
      </>
    );
  } else if (section === "money") {
    const [budgets, releases, cashEntries] = await Promise.all([
      prisma.budget.findMany({ where: { projectId }, select: { id: true, name: true, amount: true }, orderBy: { name: "asc" } }),
      prisma.fundRelease.findMany({ where: { projectId }, select: { id: true, amount: true, releasedAt: true }, orderBy: { createdAt: "desc" } }),
      prisma.siteCashTransaction.findMany({ where: { projectId }, select: { id: true, amount: true, direction: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 12 })
    ]);
    const budgetTotal = budgets.reduce((total, item) => total + Number(item.amount), 0);
    const releaseTotal = releases.reduce((total, item) => total + Number(item.amount), 0);
    const cashBalance = cashEntries.reduce((total, item) => total + Number(item.amount) * (item.direction === "IN" ? 1 : -1), 0);
    content = (
      <>
        <section className="metric-grid">
          <article className="metric-card"><span>Project budget</span><strong>₦{budgetTotal.toLocaleString("en-NG")}</strong><small>By budget category</small></article>
          <article className="metric-card"><span>Funds released</span><strong>₦{releaseTotal.toLocaleString("en-NG")}</strong><small>Recorded by project owner</small></article>
          <article className="metric-card"><span>Site cash balance</span><strong>₦{cashBalance.toLocaleString("en-NG")}</strong><small>Based on recorded cash in and out</small></article>
        </section>
        {canWrite("budget") && <RecordPanel title="Add budget category" projectId={projectId} type="budget" submitLabel="Add budget" fields={[
          { name: "name", label: "Category", type: "text", required: true },
          { name: "amount", label: "Budget (NGN)", type: "number", required: true, min: 0.01, step: 0.01 }
        ]} />}
        {canWrite("fundRelease") && <RecordPanel title="Record a fund release" description="This logs funds made available to this project; it does not initiate a bank transfer." projectId={projectId} type="fundRelease" submitLabel="Record release" fields={[
          { name: "amount", label: "Amount (NGN)", type: "number", required: true, min: 0.01, step: 0.01 }
        ]} />}
        {canWrite("cash") && <RecordPanel title="Record site cash" projectId={projectId} type="cash" submitLabel="Save transaction" fields={[
          { name: "direction", label: "Direction", type: "select", required: true, options: [{ value: "IN", label: "Cash received" }, { value: "OUT", label: "Cash spent" }] },
          { name: "amount", label: "Amount (NGN)", type: "number", required: true, min: 0.01, step: 0.01 },
          { name: "description", label: "Purpose or receipt reference", type: "text", required: true }
        ]} />}
        <article className="module-card module-card-wide">
          <p className="eyebrow">SITE CASH</p><h2>Transactions</h2>
          {cashEntries.length ? (
            <div className="module-list">
              {cashEntries.map((entry) => (
                <div className="module-list-row" key={entry.id}>
                  <div><strong>{entry.description}</strong><small>{entry.createdAt.toLocaleDateString()}</small></div>
                  <strong>{entry.direction === "IN" ? "+" : "−"}₦{Number(entry.amount).toLocaleString("en-NG")}</strong>
                </div>
              ))}
            </div>
          ) : <EmptyText>No site cash transactions recorded.</EmptyText>}
        </article>
      </>
    );
  } else if (section === "vendors") {
    if (membership.role === "VENDOR") {
      content = (
        <div className="notice module-card-wide">
          <strong>Supplier account setup is pending</strong>
          <span>This invitation grants access only to the project supplier workspace. Order, invoice and payment records are not enabled yet; no other supplier information is visible to your account.</span>
        </div>
      );
    } else {
      const vendors = await prisma.vendor.findMany({
        where: { projectId },
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
        orderBy: { name: "asc" }
      });
      content = (
        <>
          {canWrite("vendor") && <RecordPanel title="Add a supplier" projectId={projectId} type="vendor" submitLabel="Add supplier" fields={[
            { name: "name", label: "Business name", type: "text", required: true },
            { name: "email", label: "Email", type: "email" },
            { name: "phone", label: "Phone", type: "text" }
          ]} />}
          <article className="module-card module-card-wide">
            <div className="section-heading"><div><p className="eyebrow">SUPPLIERS</p><h2>Project vendors</h2></div><Link className="text-link" href={`/workspace/projects/${projectId}/team/invite`}>Invite supplier <ArrowRight size={14} /></Link></div>
            {vendors.length ? (
              <div className="module-list">
                {vendors.map((vendor) => (
                  <div className="module-list-row" key={vendor.id}>
                    <div><strong>{vendor.name}</strong><small>{vendor.email || vendor.phone || "Contact details not added"}</small></div>
                    <small>Added {vendor.createdAt.toLocaleDateString()}</small>
                  </div>
                ))}
              </div>
            ) : <EmptyText>Add a supplier or invite a vendor to this project.</EmptyText>}
          </article>
          <div className="notice"><strong>Vendor orders and payments</strong><span>Purchase orders, invoices and payment confirmation need a payment provider and verified supplier accounts. Supplier contact records are ready now.</span></div>
        </>
      );
    }
  } else if (section === "site") {
    const [logs, issues, myOpenShift, attendance] = await Promise.all([
      prisma.dailyLog.findMany({ where: { projectId }, select: { id: true, logDate: true, weather: true, workforce: true, workDone: true, issues: true, author: { select: { name: true } } }, orderBy: { logDate: "desc" }, take: 12 }),
      prisma.issue.findMany({ where: { projectId, resolvedAt: null }, select: { id: true, title: true, description: true, priority: true, createdAt: true, reporter: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.attendance.findFirst({ where: { projectId, userId: session.user.id, checkedOut: null }, select: { id: true } }),
      prisma.attendance.findMany({ where: { projectId, checkedIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, select: { id: true, checkedIn: true, checkedOut: true, user: { select: { name: true } } }, orderBy: { checkedIn: "desc" }, take: 20 })
    ]);
    content = (
      <>
        {canWrite("dailyLog") && <RecordPanel title="Daily report" projectId={projectId} type="dailyLog" submitLabel="Save daily report" fields={[
          { name: "logDate", label: "Report date", type: "date", required: true },
          { name: "weather", label: "Weather", type: "text" },
          { name: "workforce", label: "People on site", type: "number", min: 0, step: 1 },
          { name: "workDone", label: "Work completed", type: "textarea", required: true },
          { name: "issues", label: "Delays or safety notes", type: "textarea" }
        ]} />}
        {canWrite("issue") && <RecordPanel title="Report a site issue" projectId={projectId} type="issue" submitLabel="Report issue" fields={[
          { name: "title", label: "Issue", type: "text", required: true },
          { name: "priority", label: "Priority", type: "select", required: true, options: [{ value: "LOW", label: "Low" }, { value: "MEDIUM", label: "Medium" }, { value: "HIGH", label: "High" }, { value: "URGENT", label: "Urgent" }] },
          { name: "description", label: "Details", type: "textarea", required: true }
        ]} />}
        <article className="module-card">
          <p className="eyebrow">ATTENDANCE</p><h2>My site check-in</h2>
          <p className="muted">{myOpenShift ? "You are currently checked in." : "Check in when you arrive on site."}</p>
          {canWrite("attendance") && <ProjectRecordForm projectId={projectId} recordType="attendance" submitLabel={myOpenShift ? "Check out" : "Check in"} fields={[
            { name: "action", label: "", type: "hidden", value: myOpenShift ? "CHECK_OUT" : "CHECK_IN" }
          ]} />}
          {attendance.length ? <div className="module-list">{attendance.map((person) => <div className="module-list-row" key={person.id}><strong>{person.user.name}<small>{person.checkedOut ? "Checked out" : "On site"}</small></strong><small>{person.checkedIn.toLocaleTimeString()}</small></div>)}</div> : <EmptyText>No check-ins recorded today.</EmptyText>}
        </article>
        <article className="module-card module-card-wide">
          <p className="eyebrow">DAILY DIARY</p><h2>Recent reports</h2>
          {logs.length ? <div className="module-list">{logs.map((log) => <div className="module-list-row" key={log.id}><div><strong>{log.workDone}</strong><small>{log.author.name} · {log.workforce ?? 0} on site{log.weather ? ` · ${log.weather}` : ""}</small></div><small>{log.logDate.toLocaleDateString()}</small></div>)}</div> : <EmptyText>No reports have been filed.</EmptyText>}
        </article>
        <article className="module-card module-card-wide">
          <p className="eyebrow">OPEN ISSUES</p><h2>Site issues</h2>
          {issues.length ? <div className="module-list">{issues.map((issue) => <div className="module-list-row" key={issue.id}><div><strong>{issue.title}<small>{issue.description} · Reported by {issue.reporter.name}</small></strong></div><span className="status-chip">{issue.priority}</span></div>)}</div> : <EmptyText>No open site issues.</EmptyText>}
        </article>
      </>
    );
  } else if (section === "gate-log") {
    const entries = await prisma.gateEntry.findMany({
      where: { projectId },
      select: { id: true, direction: true, vehicle: true, loadSummary: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30
    });
    content = (
      <>
        {canWrite("gateEntry") && <RecordPanel title="Log a vehicle" projectId={projectId} type="gateEntry" submitLabel="Record entry" fields={[
          { name: "direction", label: "Movement", type: "select", required: true, options: [{ value: "IN", label: "Entering site" }, { value: "OUT", label: "Leaving site" }] },
          { name: "vehicle", label: "Vehicle / plate", type: "text" },
          { name: "loadSummary", label: "Load or reason", type: "text" }
        ]} />}
        <article className="module-card module-card-wide">
          <div className="section-heading"><div><p className="eyebrow">SITE SECURITY</p><h2>Recent gate activity</h2></div><span className="status-chip">{entries.length} records</span></div>
          {entries.length ? <div className="module-list">{entries.map((entry) => <div className="module-list-row" key={entry.id}><div><strong>{entry.vehicle || "Vehicle not identified"} · {entry.direction === "IN" ? "In" : "Out"}</strong><small>{entry.loadSummary || "No load details recorded"}</small></div><small>{entry.createdAt.toLocaleString()}</small></div>)}</div> : <EmptyText>No vehicles recorded at the gate.</EmptyText>}
        </article>
      </>
    );
  } else if (section === "zones") {
    const zones = await prisma.zone.findMany({
      where: { projectId },
      select: { id: true, name: true, stageId: true },
      orderBy: { name: "asc" }
    });
    content = (
      <>
        {canWrite("zone") && <RecordPanel title="Add a zone" description="Use a floor, building wing or work area as a zone." projectId={projectId} type="zone" submitLabel="Add zone" fields={[
          { name: "name", label: "Zone name", type: "text", required: true },
          { name: "stageId", label: "Current stage", type: "select", options: stageOptions }
        ]} />}
        <article className="module-card module-card-wide">
          <p className="eyebrow">PROJECT AREAS</p><h2>Zone map</h2>
          {zones.length ? (
            <div className="project-grid">
              {zones.map((zone) => (
                <article className="module-card" key={zone.id}>
                  <p className="eyebrow">ZONE</p><h3>{zone.name}</h3>
                  <p className="muted">{stages.find((stage) => stage.id === zone.stageId)?.name ?? "Stage not set"}</p>
                </article>
              ))}
            </div>
          ) : <EmptyText>Add zones to group project stages, crews and materials by area.</EmptyText>}
        </article>
      </>
    );
  } else {
    const documents = await prisma.document.findMany({
      where: { projectId },
      select: { id: true, title: true, contentType: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
    content = (
      <>
        <article className="module-card module-card-wide">
          <p className="eyebrow">PROJECT DOCUMENTS</p><h2>Drawings, permits and records</h2>
          {documents.length ? <div className="module-list">{documents.map((document) => <div className="module-list-row" key={document.id}><strong>{document.title}<small>{document.contentType}</small></strong><small>{document.createdAt.toLocaleDateString()}</small></div>)}</div> : <EmptyText>No documents uploaded yet.</EmptyText>}
        </article>
        <div className="notice"><strong>Secure file storage is not configured</strong><span>Before enabling uploads, choose a private object-storage provider and configure its credentials on the VPS. Files should never be stored in the public web directory.</span></div>
      </>
    );
  }

  return (
    <div className="page-stack">
      <ProjectNavigation projectId={project.id} role={membership.role} />
      <PageHeading section={section} projectId={project.id} />
      <section className="module-grid">{content}</section>
    </div>
  );
}
