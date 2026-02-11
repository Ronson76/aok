import bcrypt from "bcrypt";
import { db } from "./db";
import { 
  users, contacts, checkIns, settings, alertLogs, moodEntries,
  organizationBundles, organizationClients, bundleUsage,
  incidents, welfareConcerns, caseFiles, caseNotes, auditTrail,
  escalationRules, errandSessions, activeEmergencyAlerts
} from "@shared/schema";
import { sql } from "drizzle-orm";

const ORG_EMAIL = "demo-ymca@aok.care";
const ORG_PASSWORD = "YmcaDemo2025!";
const CLIENT_PASSWORD = "Demo1234!";

interface DemoClient {
  name: string;
  email: string;
  referenceId: string;
  mobileNumber: string;
  dateOfBirth: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  status: "safe" | "pending" | "overdue";
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

const demoClients: DemoClient[] = [
  { name: "Margaret Thompson", email: "margaret.t@demo.aok.care", referenceId: "YMCA-001", mobileNumber: "+447700100001", dateOfBirth: "1942-03-15", addressLine1: "14 Oakwood Drive", city: "Birmingham", postalCode: "B15 2TT", status: "safe", contactName: "David Thompson", contactEmail: "david.t@demo.aok.care", contactPhone: "+447700200001" },
  { name: "Arthur Williams", email: "arthur.w@demo.aok.care", referenceId: "YMCA-002", mobileNumber: "+447700100002", dateOfBirth: "1938-07-22", addressLine1: "7 Elm Court", city: "Birmingham", postalCode: "B29 6EJ", status: "safe", contactName: "Susan Williams", contactEmail: "susan.w@demo.aok.care", contactPhone: "+447700200002" },
  { name: "Dorothy Evans", email: "dorothy.e@demo.aok.care", referenceId: "YMCA-003", mobileNumber: "+447700100003", dateOfBirth: "1945-11-08", addressLine1: "23 Birch Lane", city: "Solihull", postalCode: "B91 3QR", status: "overdue", contactName: "Robert Evans", contactEmail: "robert.e@demo.aok.care", contactPhone: "+447700200003" },
  { name: "James Mitchell", email: "james.m@demo.aok.care", referenceId: "YMCA-004", mobileNumber: "+447700100004", dateOfBirth: "1950-01-30", addressLine1: "5 Hawthorn Close", city: "Birmingham", postalCode: "B17 8PL", status: "safe", contactName: "Helen Mitchell", contactEmail: "helen.m@demo.aok.care", contactPhone: "+447700200004" },
  { name: "Patricia Clarke", email: "patricia.c@demo.aok.care", referenceId: "YMCA-005", mobileNumber: "+447700100005", dateOfBirth: "1940-09-12", addressLine1: "31 Willow Gardens", city: "Sutton Coldfield", postalCode: "B73 5RH", status: "pending", contactName: "Mark Clarke", contactEmail: "mark.c@demo.aok.care", contactPhone: "+447700200005" },
  { name: "George Harris", email: "george.h@demo.aok.care", referenceId: "YMCA-006", mobileNumber: "+447700100006", dateOfBirth: "1947-05-03", addressLine1: "12 Cedar Avenue", city: "Birmingham", postalCode: "B23 7ND", status: "safe", contactName: "Linda Harris", contactEmail: "linda.h@demo.aok.care", contactPhone: "+447700200006" },
  { name: "Betty Johnson", email: "betty.j@demo.aok.care", referenceId: "YMCA-007", mobileNumber: "+447700100007", dateOfBirth: "1935-12-19", addressLine1: "8 Maple Crescent", city: "Erdington", postalCode: "B24 0JW", status: "safe", contactName: "Carol Johnson", contactEmail: "carol.j@demo.aok.care", contactPhone: "+447700200007" },
  { name: "Frank Taylor", email: "frank.t@demo.aok.care", referenceId: "YMCA-008", mobileNumber: "+447700100008", dateOfBirth: "1943-08-27", addressLine1: "19 Chestnut Road", city: "Moseley", postalCode: "B13 8EF", status: "overdue", contactName: "Anne Taylor", contactEmail: "anne.t@demo.aok.care", contactPhone: "+447700200008" },
  { name: "Edna Wilson", email: "edna.w@demo.aok.care", referenceId: "YMCA-009", mobileNumber: "+447700100009", dateOfBirth: "1939-04-06", addressLine1: "44 Ash Grove", city: "Harborne", postalCode: "B17 0HG", status: "safe", contactName: "Peter Wilson", contactEmail: "peter.w@demo.aok.care", contactPhone: "+447700200009" },
  { name: "Harold Brown", email: "harold.b@demo.aok.care", referenceId: "YMCA-010", mobileNumber: "+447700100010", dateOfBirth: "1941-06-14", addressLine1: "2 Poplar Way", city: "Kings Heath", postalCode: "B14 7JN", status: "safe", contactName: "Joan Brown", contactEmail: "joan.b@demo.aok.care", contactPhone: "+447700200010" },
];

function daysAgo(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
}

function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

function randomBirminghamCoords(): { lat: string; lng: string } {
  const lat = (52.46 + Math.random() * 0.06).toFixed(6);
  const lng = (-1.93 + Math.random() * 0.08).toFixed(6);
  return { lat, lng };
}

export async function seedYmcaDemo(): Promise<{ orgId: string; orgEmail: string; orgPassword: string; clientCount: number }> {
  console.log("[DEMO SEED] Starting YMCA demo seed...");

  const existingOrg = await db.select().from(users).where(sql`email = ${ORG_EMAIL}`);
  if (existingOrg.length > 0) {
    throw new Error("YMCA demo already exists. Delete the existing org first if you want to re-seed.");
  }

  const passwordHash = await bcrypt.hash(ORG_PASSWORD, 10);
  const clientPasswordHash = await bcrypt.hash(CLIENT_PASSWORD, 10);

  const [orgUser] = await db.insert(users).values({
    email: ORG_EMAIL,
    passwordHash,
    accountType: "organization",
    name: "YMCA Birmingham",
    mobileNumber: "+447700000000",
    addressLine1: "YMCA Centre, 300 Reservoir Road",
    city: "Birmingham",
    postalCode: "B23 6DB",
    country: "United Kingdom",
    termsAcceptedAt: daysAgo(90),
    featureWellbeingAi: true,
    featureShakeToAlert: true,
    featureWellness: true,
    featurePetProtection: true,
    featureDigitalWill: true,
    featureFitnessTracking: true,
    orgFeatureEmergencyRecording: true,
  }).returning();

  console.log(`[DEMO SEED] Created org: ${orgUser.id}`);

  const [bundle] = await db.insert(organizationBundles).values({
    userId: orgUser.id,
    name: "YMCA Elderly Care Bundle",
    seatLimit: 15,
    seatsUsed: 10,
    status: "active",
    startsAt: daysAgo(90),
    expiresAt: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
  }).returning();

  console.log(`[DEMO SEED] Created bundle: ${bundle.id}`);

  const clientIds: string[] = [];
  const orgClientIds: string[] = [];

  for (let i = 0; i < demoClients.length; i++) {
    const client = demoClients[i];
    const coords = randomBirminghamCoords();

    const [clientUser] = await db.insert(users).values({
      email: client.email,
      passwordHash: clientPasswordHash,
      accountType: "organization",
      name: client.name,
      referenceId: client.referenceId,
      dateOfBirth: client.dateOfBirth,
      mobileNumber: client.mobileNumber,
      addressLine1: client.addressLine1,
      city: client.city,
      postalCode: client.postalCode,
      country: "United Kingdom",
      termsAcceptedAt: daysAgo(85 - i),
      latitude: coords.lat,
      longitude: coords.lng,
      lastLocationUpdatedAt: hoursAgo(Math.floor(Math.random() * 12)),
    }).returning();

    clientIds.push(clientUser.id);

    const refCode = `YM${String(i + 1).padStart(4, '0')}`;
    const [orgClient] = await db.insert(organizationClients).values({
      organizationId: orgUser.id,
      clientId: clientUser.id,
      bundleId: bundle.id,
      nickname: client.name.split(' ')[0],
      clientOrdinal: i + 1,
      status: "active",
      registrationStatus: "registered",
      referenceCode: refCode,
      clientPhone: client.mobileNumber,
      clientEmail: client.email,
      clientName: client.name,
      alertsEnabled: true,
      scheduleStartTime: daysAgo(80 - i),
      checkInIntervalHours: 24,
      emergencyContacts: [
        { name: client.contactName, email: client.contactEmail, phone: client.contactPhone, relationship: "Family" }
      ],
      featureEmergencyRecording: i < 5,
    }).returning();

    orgClientIds.push(orgClient.id);

    await db.insert(bundleUsage).values({
      bundleId: bundle.id,
      referenceId: client.referenceId,
      usedAt: daysAgo(80 - i),
    });

    const confirmedAt = daysAgo(78 - i);
    await db.insert(contacts).values({
      userId: clientUser.id,
      name: client.contactName,
      email: client.contactEmail,
      phone: client.contactPhone,
      phoneType: "mobile",
      isPrimary: true,
      confirmedAt,
    });

    const intervalHours = 24;
    let nextDue: Date;
    let lastCheckIn: Date;

    if (client.status === "safe") {
      lastCheckIn = hoursAgo(Math.floor(Math.random() * 6) + 1);
      nextDue = new Date(lastCheckIn.getTime() + intervalHours * 60 * 60 * 1000);
    } else if (client.status === "pending") {
      lastCheckIn = hoursAgo(20);
      nextDue = hoursAgo(-4);
    } else {
      lastCheckIn = hoursAgo(30);
      nextDue = hoursAgo(6);
    }

    await db.insert(settings).values({
      userId: clientUser.id,
      frequency: "daily",
      intervalHours: String(intervalHours),
      scheduleStartTime: daysAgo(78 - i),
      lastCheckIn,
      nextCheckInDue: nextDue,
      alertsEnabled: true,
      pushStatus: "enabled",
      shakeToSOSEnabled: true,
      additionalInfo: JSON.stringify({
        healthConditions: i % 3 === 0 ? ["Diabetes Type 2", "High blood pressure"] : i % 3 === 1 ? ["Arthritis"] : [],
        medications: i % 2 === 0 ? ["Metformin 500mg", "Ramipril 5mg"] : [],
        allergies: i === 2 ? ["Penicillin"] : [],
        notes: i === 0 ? "Lives alone, uses a walking frame" : i === 7 ? "Recently discharged from hospital" : ""
      }),
      livingSituation: i % 2 === 0 ? "with-pets" : "solo-travel",
    });

    const checkInCount = 15 + Math.floor(Math.random() * 30);
    for (let j = 0; j < checkInCount; j++) {
      const daysBack = Math.floor(Math.random() * 60);
      const isMissed = Math.random() < 0.08;
      await db.insert(checkIns).values({
        userId: clientUser.id,
        timestamp: daysAgo(daysBack, Math.floor(Math.random() * 12)),
        status: isMissed ? "missed" : "success",
      });
    }

    if (client.status === "overdue") {
      await db.insert(checkIns).values({
        userId: clientUser.id,
        timestamp: hoursAgo(30),
        status: "missed",
      });
    }

    const moods: Array<"great" | "good" | "okay" | "low" | "bad"> = ["great", "good", "okay", "low", "bad"];
    const moodNotes = [
      "Feeling well today, had a nice walk",
      "A bit tired but managing okay",
      "Visited grandchildren, lovely day",
      "Pain is worse today, staying in",
      "Good day at the YMCA centre",
      "Slept poorly last night",
      "Garden is looking lovely, spent time outside",
      "",
      "Had a fall yesterday but feeling better now",
      "Neighbours popped round for tea"
    ];

    for (let j = 0; j < 12; j++) {
      const daysBack = Math.floor(Math.random() * 45);
      const moodIdx = Math.random() < 0.3 ? (Math.random() < 0.5 ? 3 : 4) : Math.floor(Math.random() * 3);
      await db.insert(moodEntries).values({
        userId: clientUser.id,
        mood: moods[moodIdx],
        note: moodNotes[Math.floor(Math.random() * moodNotes.length)] || null,
        createdAt: daysAgo(daysBack),
      });
    }

    if (client.status === "overdue") {
      const missedAlertTime = hoursAgo(5);
      await db.insert(alertLogs).values({
        userId: clientUser.id,
        timestamp: missedAlertTime,
        contactsNotified: [client.contactEmail],
        message: `MISSED CHECK-IN: ${client.name} (${client.referenceId}) - 1 email(s), 1 voice call(s) notified`,
      });

      await db.insert(activeEmergencyAlerts).values({
        userId: clientUser.id,
        activatedAt: missedAlertTime,
        lastDispatchAt: missedAlertTime,
        latitude: coords.lat,
        longitude: coords.lng,
        isActive: true,
      });
    }

    for (let j = 0; j < 2; j++) {
      const missedDay = 10 + Math.floor(Math.random() * 40);
      await db.insert(alertLogs).values({
        userId: clientUser.id,
        timestamp: daysAgo(missedDay),
        contactsNotified: [client.contactEmail],
        message: `MISSED CHECK-IN: ${client.name} (${client.referenceId}) - 1 email(s) notified`,
      });
    }

    if (i < 4) {
      const activityTypes = ["walking", "shopping", "appointment", "dog_walking"];
      const labels = ["Walk to pharmacy", "Weekly shop at Asda", "GP appointment", "Walking Buster in the park"];
      const durations = [30, 45, 60, 40];
      for (let j = 0; j < 3; j++) {
        const daysBack = 3 + Math.floor(Math.random() * 20);
        const startTime = daysAgo(daysBack);
        const durMins = durations[j % 4];
        const endTime = new Date(startTime.getTime() + durMins * 60 * 1000);
        const graceEnd = new Date(endTime.getTime() + 10 * 60 * 1000);
        await db.insert(errandSessions).values({
          userId: clientUser.id,
          activityType: activityTypes[j % 4],
          customLabel: labels[j % 4],
          expectedDurationMins: durMins,
          status: "completed",
          startedAt: startTime,
          expectedEndAt: endTime,
          graceEndsAt: graceEnd,
          completedAt: new Date(endTime.getTime() - 5 * 60 * 1000),
          lastKnownLat: coords.lat,
          lastKnownLng: coords.lng,
          lastLocationAt: endTime,
          gpsPoints: [],
        });
      }
    }

    console.log(`[DEMO SEED] Client ${i + 1}/10: ${client.name} (${client.status})`);
  }

  const incidentData = [
    { clientIdx: 2, type: "medical_issue" as const, severity: "high" as const, desc: "Client reported a fall in the garden. Sustained minor bruising to left arm. First aid administered by neighbour. GP visit arranged for following day.", status: "monitoring" as const },
    { clientIdx: 7, type: "neglect" as const, severity: "medium" as const, desc: "Home visit revealed low food supplies and unheated property. Client stated boiler broke 3 days ago. Emergency repair arranged, food delivery organised.", status: "open" as const },
    { clientIdx: 4, type: "missing_person_concern" as const, severity: "high" as const, desc: "Client missed 3 consecutive check-ins over 48 hours. Family contact confirmed client was admitted to hospital for respiratory infection. Now stable.", status: "closed" as const },
    { clientIdx: 0, type: "lone_worker_danger" as const, severity: "low" as const, desc: "Client reported feeling unsafe walking home after dark. Route reviewed, taxi service arranged for evening appointments.", status: "closed" as const },
  ];

  for (const inc of incidentData) {
    await db.insert(incidents).values({
      organizationId: orgUser.id,
      clientId: orgClientIds[inc.clientIdx],
      reportedByName: "Sarah Matthews (YMCA Care Lead)",
      incidentType: inc.type,
      severity: inc.severity,
      description: inc.desc,
      status: inc.status,
      isAnonymous: false,
      createdAt: daysAgo(Math.floor(Math.random() * 30) + 5),
      updatedAt: daysAgo(Math.floor(Math.random() * 5)),
      resolvedAt: inc.status === "closed" ? daysAgo(2) : undefined,
    });
  }

  const welfareData = [
    { clientIdx: 9, type: "welfare_concern", desc: "Neighbour reported hearing client shouting during the night. Client appeared confused during morning check-in. Possible sundowning symptoms. Referral to memory clinic recommended.", behaviours: "Confusion, disturbed sleep, agitation" },
    { clientIdx: 5, type: "pattern_based", desc: "Mood tracking shows declining pattern over 3 weeks. Client logging 'low' and 'bad' moods consistently. Previously logged 'good' and 'great'. Gentle wellbeing conversation scheduled.", behaviours: "Withdrawal, low mood, reduced activity" },
    { clientIdx: 1, type: "gut_instinct", desc: "During routine call, client sounded unusually anxious and evasive. Mentioned 'visitor' in the background. Follow-up home visit arranged within 24 hours.", behaviours: "Anxiety, evasiveness, reluctance to speak freely" },
  ];

  for (const wc of welfareData) {
    await db.insert(welfareConcerns).values({
      organizationId: orgUser.id,
      clientId: orgClientIds[wc.clientIdx],
      reportedByName: "Sarah Matthews (YMCA Care Lead)",
      concernType: wc.type,
      description: wc.desc,
      observedBehaviours: wc.behaviours,
      isAnonymous: false,
      status: "monitoring",
      createdAt: daysAgo(Math.floor(Math.random() * 20) + 3),
      updatedAt: daysAgo(1),
    });
  }

  const caseFileData = [
    { clientIdx: 2, risk: "amber" as const, summary: "Dorothy Evans - Recurring falls risk. Three falls in the past 6 months. Occupational therapy assessment pending. Walking aid provided. Home hazard assessment completed." },
    { clientIdx: 7, risk: "red" as const, summary: "Frank Taylor - Multiple safeguarding concerns. Recent hospital discharge, home conditions poor, missed check-ins increasing. Multi-agency review scheduled." },
  ];

  for (const cf of caseFileData) {
    const [caseFile] = await db.insert(caseFiles).values({
      organizationId: orgUser.id,
      clientId: orgClientIds[cf.clientIdx],
      status: "monitoring",
      riskLevel: cf.risk,
      summary: cf.summary,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(1),
    }).returning();

    const notes = [
      { content: "Initial assessment completed. Key risks identified: mobility, nutrition, social isolation.", days: 25, author: "Sarah Matthews" },
      { content: "Home visit conducted. Living conditions reviewed. Action plan created with client.", days: 18, author: "Sarah Matthews" },
      { content: "Follow-up call. Client reports improvement. Continuing to monitor weekly.", days: 10, author: "James Rodriguez" },
      { content: "Multi-disciplinary team meeting held. GP, social worker, and YMCA lead agreed on care plan updates.", days: 3, author: "Sarah Matthews" },
    ];

    for (const note of notes) {
      await db.insert(caseNotes).values({
        caseFileId: caseFile.id,
        authorId: orgUser.id,
        authorName: note.author,
        content: note.content,
        isConfidential: false,
        createdAt: daysAgo(note.days),
      });
    }
  }

  await db.insert(escalationRules).values([
    {
      organizationId: orgUser.id,
      name: "Missed Check-In Escalation",
      description: "Automatically escalate when a client misses 3 consecutive check-ins within 72 hours",
      triggerType: "missed_checkins",
      threshold: 3,
      timeWindowHours: 72,
      action: "notify_lead",
      isActive: true,
    },
    {
      organizationId: orgUser.id,
      name: "High Risk Incident Alert",
      description: "Immediately notify safeguarding lead when a high severity incident is reported",
      triggerType: "high_risk_incident",
      threshold: 1,
      timeWindowHours: null,
      action: "notify_lead",
      isActive: true,
    },
    {
      organizationId: orgUser.id,
      name: "Repeat Incident Pattern",
      description: "Flag when same client has 3 or more incidents within 30 days",
      triggerType: "repeat_incidents",
      threshold: 3,
      timeWindowHours: 720,
      action: "create_case",
      isActive: true,
    },
  ]);

  const auditActions = [
    { action: "create", entityType: "client", desc: "Added client Margaret Thompson (YMCA-001)", days: 80 },
    { action: "create", entityType: "client", desc: "Added client Arthur Williams (YMCA-002)", days: 79 },
    { action: "create", entityType: "client", desc: "Bulk imported 8 clients via spreadsheet", days: 75 },
    { action: "update", entityType: "client", desc: "Updated emergency contacts for Dorothy Evans (YMCA-003)", days: 60 },
    { action: "create", entityType: "incident", desc: "Created incident report: Medical issue - Dorothy Evans", days: 28 },
    { action: "update", entityType: "escalation_rule", desc: "Updated missed check-in escalation threshold from 5 to 3", days: 45 },
    { action: "create", entityType: "welfare_concern", desc: "Filed welfare concern for Harold Brown (YMCA-010)", days: 15 },
    { action: "create", entityType: "case_file", desc: "Opened case file for Frank Taylor (YMCA-008) - risk level RED", days: 25 },
    { action: "update", entityType: "case_file", desc: "Added case note: Multi-disciplinary team meeting", days: 3 },
    { action: "read", entityType: "client", desc: "Exported client check-in report for compliance audit", days: 7 },
    { action: "update", entityType: "client", desc: "Enabled emergency recording for 5 clients", days: 50 },
    { action: "create", entityType: "escalation_rule", desc: "Created new escalation rule: Repeat Incident Pattern", days: 40 },
    { action: "update", entityType: "incident", desc: "Resolved incident: Missing person concern - Patricia Clarke", days: 8 },
    { action: "update", entityType: "client", desc: "Updated check-in schedule for George Harris to every 12 hours", days: 20 },
    { action: "export", entityType: "report", desc: "Generated monthly safeguarding summary report", days: 1 },
  ];

  for (const audit of auditActions) {
    await db.insert(auditTrail).values({
      organizationId: orgUser.id,
      userId: orgUser.id,
      userEmail: ORG_EMAIL,
      userRole: "admin",
      action: audit.action,
      entityType: audit.entityType,
      details: audit.desc,
      createdAt: daysAgo(audit.days),
    });
  }

  console.log("[DEMO SEED] YMCA demo seed complete!");
  console.log(`[DEMO SEED] Org login: ${ORG_EMAIL} / ${ORG_PASSWORD}`);

  return {
    orgId: orgUser.id,
    orgEmail: ORG_EMAIL,
    orgPassword: ORG_PASSWORD,
    clientCount: 10,
  };
}
