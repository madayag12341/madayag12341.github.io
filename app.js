/* ============================================
   SUPABASE CONNECTION
   Reads/writes go straight to the tables from
   schema.sql.
   ============================================ */
const SUPABASE_URL = "https://dmrdufunkqvjrfyxyimc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmR1ZnVua3F2anJmeXh5aW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTQ0ODgsImV4cCI6MjEwNDE5MDQ4OH0.UBSCuqEfi9t7Ey6SRtdrPfoxHjqkapJa1jzqRkn6q2c";

// Must match index.html exactly. See the comment there for why this check exists.
(function assertKeyIsHeaderSafe(key) {
  const bad = [...key].findIndex(ch => ch.codePointAt(0) > 255);
  if (bad !== -1) {
    const ch = key[bad];
    throw new Error(
      `Supabase anon key has a non-ISO-8859-1 character at index ${bad}: "${ch}" ` +
      `(U+${ch.codePointAt(0).toString(16).toUpperCase()}). Re-copy it from Project Settings > API.`
    );
  }
})(SUPABASE_ANON_KEY);

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_FOR_ENTITY = {
  teachers: "teachers",
  students: "students",
  subjects: "subjects",
  sections: "sections",
};

let nextId = 1;
const newId = () => nextId++; // temporary client-side id, swapped for the real DB id after insert

const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];

/* ---- teacher account permissions: what a teacher login is allowed to do ---- */
const TEACHER_PERMS = [
  { key: "teachersEditGrades", label: "Edit grades" },
  { key: "teachersPortalAccess", label: "My portal access" },
  { key: "teachersEditStudents", label: "Edit students" },
  { key: "teachersEditSubjects", label: "Edit subject" },
  { key: "teachersEditTeachers", label: "Edit teachers" },
];
const TEACHER_PERM_COLUMNS = {
  teachersEditGrades: "can_edit_grades",
  teachersPortalAccess: "can_access_portal",
  teachersEditStudents: "can_edit_students",
  teachersEditSubjects: "can_edit_subjects",
  teachersEditTeachers: "can_edit_teachers",
};
const DEFAULT_TEACHER_PERMISSIONS = {
  teachersEditGrades: true,
  teachersPortalAccess: true,
  teachersEditStudents: true,
  teachersEditSubjects: true,
  teachersEditTeachers: false,
};

/* ---- what shows up in the "Position" dropdown on the Teacher accounts screen ---- */
const TEACHER_POSITIONS = ["Teacher 1", "Dean", "Principal", "Vice Principal", "Guidance Counselor", "Disciplinary Officer"];
const SECTION_NAME_POOL = [
  "Narra", "Molave", "Acacia", "Mahogany", "Ipil", "Yakal", "Kamagong", "Banaba",
  "Kalachuchi", "Sampaguita", "Ilang-Ilang", "Camia", "Waling-Waling", "Champaca",
  "Dapdap", "Tanguile",
];

let data = { teachers: [], students: [], subjects: [], sections: [], admins: [] };
let currentUser = null; // { id, username, role, teacherId, studentId }

/* ---- auth guard: redirect to index.html (the login page) unless there's a live Supabase session ---- */
async function requireAuth() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "index.html";
    return null;
  }

  const userId = sessionData.session.user.id;
  // maybeSingle(), not single() — single() treats "no row" as an error, so a
  // successful sign-in with no profile row looked identical to a failed login.
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    console.error("No usable profile for this login. id =", userId, error);
    await supabaseClient.auth.signOut();
    window.location.href = "index.html?err=no-profile";
    return null;
  }

  currentUser = {
    id: profile.id,
    username: profile.username,
    role: profile.role,
    teacherId: profile.teacher_id,
    studentId: profile.student_id,
  };
  return currentUser;
}

/* ---- row (snake_case, DB) <-> record (camelCase, app) mapping ---- */
function rowToTeacher(r) {
  return {
    id: r.id, name: r.name, email: r.email, contact: r.contact, status: r.status, username: r.username, position: r.position || "",
    // Any column not yet present in the DB (older rows, migration not run yet) reads as
    // undefined/null from Supabase — treat that as "still allowed" rather than locking
    // everyone out, so only an explicit false takes access away.
    permissions: {
      teachersEditGrades: r.can_edit_grades !== false,
      teachersPortalAccess: r.can_access_portal !== false,
      teachersEditStudents: r.can_edit_students !== false,
      teachersEditSubjects: r.can_edit_subjects !== false,
      // Unlike the perms above, a missing/null column here means "not granted" —
      // this unlocks the Teachers page itself, so it should never silently
      // default to on for rows created before this column existed.
      teachersEditTeachers: r.can_edit_teachers === true,
    },
  };
}
function rowToSection(r) {
  return { id: r.id, name: r.name, gradeLevel: r.grade_level, adviserId: r.adviser_id };
}
function rowToSubject(r) {
  return { id: r.id, code: r.code, name: r.name, units: r.units, gradeLevel: r.grade_level, teacherIds: [] };
}
function rowToStudent(r) {
  return {
    id: r.id, studentNo: r.student_no, firstName: r.first_name, middleName: r.middle_name,
    lastName: r.last_name, name: r.name, birthDate: r.birth_date, gradeLevel: r.grade_level,
    sectionId: r.section_id, status: r.status, username: r.username, balance: r.balance,
    permissions: {
      studentsViewSubjects: r.can_view_subjects,
      studentsViewGradingCard: r.can_view_grading_card,
    },
    grades: {},
  };
}
function rowToAdmin(r) {
  return { id: r.id, name: r.name, role: r.role, username: r.username, status: r.status };
}

function teacherToRow(t) {
  const perms = t.permissions || DEFAULT_TEACHER_PERMISSIONS;
  return {
    name: t.name, email: t.email, contact: t.contact || null, status: t.status, username: t.username || null, position: t.position || null,
    can_edit_grades: perms.teachersEditGrades !== false,
    can_access_portal: perms.teachersPortalAccess !== false,
    can_edit_students: perms.teachersEditStudents !== false,
    can_edit_subjects: perms.teachersEditSubjects !== false,
    can_edit_teachers: perms.teachersEditTeachers === true,
  };
}
function sectionToRow(s) {
  return { name: s.name, grade_level: s.gradeLevel, adviser_id: s.adviserId ?? null };
}
function subjectToRow(s) {
  return { code: s.code, name: s.name, units: s.units, grade_level: s.gradeLevel };
}
function studentToRow(s) {
  return {
    student_no: s.studentNo, first_name: s.firstName, middle_name: s.middleName || null,
    last_name: s.lastName, name: s.name, birth_date: s.birthDate, grade_level: s.gradeLevel,
    section_id: s.sectionId ?? null, status: s.status, username: s.username || null,
    can_view_subjects: s.permissions ? s.permissions.studentsViewSubjects : true,
    can_view_grading_card: s.permissions ? s.permissions.studentsViewGradingCard : true,
  };
}
const ROW_MAPPERS = { teachers: teacherToRow, sections: sectionToRow, subjects: subjectToRow, students: studentToRow };

/* ---- initial load: pull every table into the same `data` shape the rest of the app expects ---- */
async function loadAllData() {
  const [teachersRes, sectionsRes, subjectsRes, subjectTeachersRes, studentsRes, gradesRes, adminsRes, settingsRes, logRes] = await Promise.all([
    supabaseClient.from("teachers").select("*").order("id"),
    supabaseClient.from("sections").select("*").order("id"),
    supabaseClient.from("subjects").select("*").order("id"),
    supabaseClient.from("subject_teachers").select("*"),
    supabaseClient.from("students").select("*").order("id"),
    supabaseClient.from("grades").select("*"),
    supabaseClient.from("admins").select("*").order("id"),
    supabaseClient.from("settings").select("*").maybeSingle(),
    supabaseClient.from("activity_log").select("*").order("happened_at", { ascending: false }).limit(200),
  ]);

  for (const res of [teachersRes, sectionsRes, subjectsRes, subjectTeachersRes, studentsRes, gradesRes, adminsRes, settingsRes, logRes]) {
    if (res.error) console.error("Supabase load error:", res.error);
  }

  data.teachers = (teachersRes.data || []).map(rowToTeacher);
  data.sections = (sectionsRes.data || []).map(rowToSection);
  data.subjects = (subjectsRes.data || []).map(rowToSubject);
  (subjectTeachersRes.data || []).forEach(link => {
    const subject = data.subjects.find(s => s.id === link.subject_id);
    if (subject) subject.teacherIds.push(link.teacher_id);
  });
  data.students = (studentsRes.data || []).map(rowToStudent);
  (gradesRes.data || []).forEach(g => {
    const student = data.students.find(s => s.id === g.student_id);
    if (student) student.grades[g.subject_id] = { q1: g.q1, q2: g.q2, q3: g.q3, q4: g.q4 };
  });
  data.admins = (adminsRes.data || []).map(rowToAdmin);

  if (settingsRes.data) {
    settings.schoolName = settingsRes.data.school_name;
    settings.schoolYear = settingsRes.data.school_year;
    settings.period = settingsRes.data.period;
    settings.scale = settingsRes.data.scale;
    settings.passing = settingsRes.data.passing;
  }

  activityLog = (logRes.data || []).map(r => ({ timestamp: new Date(r.happened_at), what: r.what, category: r.category, action: r.action, name: r.name }));
}

/* ---- write helpers used by the add/edit modal, delete confirm, etc. ---- */
async function syncSubjectTeachers(subjectId, teacherIds) {
  await supabaseClient.from("subject_teachers").delete().eq("subject_id", subjectId);
  if (teacherIds.length) {
    const { error } = await supabaseClient.from("subject_teachers").insert(teacherIds.map(teacherId => ({ subject_id: subjectId, teacher_id: teacherId })));
    if (error) console.error(error);
  }
}

async function createLoginFor(entityKey, recordId, draft) {
  if (!draft.username || !draft.password) return;
  const { error } = await supabaseClient.functions.invoke("create-user", {
    body: {
      email: draft.email || `${draft.username}@meridian.example.com`,
      password: draft.password,
      username: draft.username,
      role: entityKey === "teachers" ? "teacher" : "student",
      teacher_id: entityKey === "teachers" ? recordId : null,
      student_id: entityKey === "students" ? recordId : null,
    },
  });
  if (error) {
    console.error("create-user failed:", error);
    showToast("Record saved, but the login wasn't created.", "error");
    return;
  }
  showToast("Login created.", "success");
}

async function persistEntitySave(entityKey, mode, draft) {
  const table = TABLE_FOR_ENTITY[entityKey];
  const mapper = ROW_MAPPERS[entityKey];
  try {
    if (mode === "add") {
      const tempId = draft.id;
      const { data: inserted, error } = await supabaseClient.from(table).insert(mapper(draft)).select().single();
      if (error) throw error;
      const record = data[entityKey].find(r => r.id === tempId);
      if (record) record.id = inserted.id;
      if (entityKey === "subjects") await syncSubjectTeachers(inserted.id, draft.teacherIds || []);
      // The teachers/students tables hold no password — the login lives in
      // auth.users, created server-side where the service_role key is safe.
      if (entityKey === "teachers" || entityKey === "students") {
        await createLoginFor(entityKey, inserted.id, draft);
      }
      renderAll();
    } else {
      const { error } = await supabaseClient.from(table).update(mapper(draft)).eq("id", draft.id);
      if (error) throw error;
      if (entityKey === "subjects") await syncSubjectTeachers(draft.id, draft.teacherIds || []);
    }
  } catch (err) {
    console.error(err);
    showToast("Couldn't save to the database — check your connection.", "error");
  }
}
function persistEntityDelete(entityKey, id) {
  const table = TABLE_FOR_ENTITY[entityKey];
  supabaseClient.from(table).delete().eq("id", id).then(({ error }) => {
    if (error) { console.error(error); showToast("Couldn't delete from the database — check your connection.", "error"); }
  });
}

// Philippine school years run roughly June–March, so from June onward the
// school year is "this year–next year"; before June it's "last year–this year".
function computeCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 5 ? year : year - 1; // getMonth() is 0-indexed, 5 = June
  return `${startYear}–${startYear + 1}`;
}

let settings = {
  schoolName: "Meridian Grade School",
  schoolYear: computeCurrentSchoolYear(),
  period: "2nd Quarter",
  scale: "percentage",
  passing: 75,
};

let activityLog = [];

function logActivity(text, category, action, name) {
  activityLog.unshift({ timestamp: new Date(), what: text, category, action, name });
  renderLogs();
  supabaseClient.from("activity_log").insert({ what: text, category, action, name }).then(({ error }) => {
    if (error) console.error(error);
  });
}

/* ============================================
   TOASTS
   ============================================ */
const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.classList.add("is-leaving");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 2500);
}

/* ============================================
   ENTITY CONFIG
   ============================================ */
const entityConfig = {
  teachers: {
    label: "teacher",
    fields: [
      { key: "firstName", label: "First name", type: "text", required: true },
      { key: "middleName", label: "Middle name", type: "text" },
      { key: "lastName", label: "Last name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "contact", label: "Contact no.", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
    columns: (row) => [
      row.name,
      row.email,
      row.contact || "—",
      advisoryCell(row.id),
      subjectLoadCell(row.id),
      statusTag(row.status),
    ],
  },
  students: {
    label: "student",
    fields: [
      { key: "firstName", label: "First name", type: "text", required: true },
      { key: "middleName", label: "Middle name", type: "text" },
      { key: "lastName", label: "Last name", type: "text", required: true },
      { key: "birthDate", label: "Birthdate", type: "date", required: true },
      { key: "studentNo", label: "Student no.", type: "text", required: true, locked: true },
      { key: "gradeLevel", label: "Grade level", type: "select", options: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
      { key: "sectionId", label: "Section", type: "select", options: () => {
          const gradeSelect = modalFields.querySelector('[data-key="gradeLevel"]');
          return sectionOptionsForGrade(gradeSelect ? gradeSelect.value : null);
        } },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
    columns: (row) => [
      row.studentNo,
      row.name,
      row.gradeLevel,
      sectionName(row.sectionId),
      statusTag(row.status),
    ],
  },
  subjects: {
    label: "subject",
    fields: [
      { key: "gradeLevel", label: "Grade level", type: "select", options: () => subjectGradeLevelOptions() },
      { key: "name", label: "Subject name", type: "select", options: () => subjectNameOptions(), required: true },
      { key: "code", label: "Subject code", type: "text", required: true, locked: true },
      { key: "units", label: "Units", type: "number", locked: true },
      { key: "teacherIds", label: "Teacher assigned", type: "select", options: () => teacherOptions() },
    ],
    columns: (row) => [
      row.code,
      row.name,
      row.units,
      row.gradeLevel,
      teacherNames(row.teacherIds),
    ],
  },
  sections: {
    label: "section",
    fields: [
      { key: "gradeLevel", label: "Grade level", type: "select", options: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
      { key: "name", label: "Section name", type: "select", required: true, options: () => sectionNameOptionsForGrade("Grade 7") },
      { key: "adviserId", label: "Adviser", type: "select", options: () => teacherOptions() },
    ],
    columns: (row) => [
      row.name,
      row.gradeLevel,
      teacherName(row.adviserId),
      studentCountForSection(row.id),
    ],
  },
};

/* ============================================
   LOOKUP HELPERS
   ============================================ */
function teacherOptions() {
  return [{ value: "", label: "— none —" }, ...data.teachers.map(t => ({ value: t.id, label: t.name }))];
}
function availableTeacherOptionsForSubject(name, excludeId = null) {
  const takenBy = new Set(
    data.subjects.filter(s => s.name === name && s.id !== excludeId).flatMap(s => s.teacherIds || [])
  );
  const pool = data.teachers.filter(t => !takenBy.has(t.id));
  return [{ value: "", label: "— none —" }, ...pool.map(t => ({ value: t.id, label: t.name }))];
}
function unassignedTeacherOptions(keepId = null) {
  const takenBy = new Set(
    data.sections.filter(s => s.id !== keepId && s.adviserId != null).map(s => s.adviserId)
  );
  const pool = data.teachers.filter(t => !takenBy.has(t.id));
  return [{ value: "", label: "— none —" }, ...pool.map(t => ({ value: t.id, label: t.name }))];
}
function sectionOptionsForGrade(gradeLevel) {
  const pool = gradeLevel ? data.sections.filter(s => s.gradeLevel === gradeLevel) : data.sections;
  return [{ value: "", label: "— none —" }, ...pool.map(s => ({ value: s.id, label: s.name }))];
}
function buildFullName(firstName, middleName, lastName) {
  const first = (firstName || "").trim();
  const middle = (middleName || "").trim();
  const last = (lastName || "").trim();
  const middlePart = middle ? ` ${middle.charAt(0).toUpperCase()}.` : "";
  return `${first}${middlePart} ${last}`.replace(/\s+/g, " ").trim();
}
// Best-effort reverse of buildFullName, used only to prefill the First/Middle/
// Last fields when editing a record that only has a combined name on file
// (e.g. a teacher saved before this modal had separate name fields).
function splitFullName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" ").replace(/\.$/, ""),
    lastName: parts[parts.length - 1],
  };
}
function studentInitials(firstName, middleName, lastName) {
  const f = (firstName || "").trim().charAt(0);
  const m = (middleName || "").trim().charAt(0);
  const l = (lastName || "").trim().charAt(0);
  const initials = `${f}${m}${l}`.toUpperCase();
  return initials || "STU";
}
function generateStudentNo(firstName, middleName, lastName, birthDateStr, excludeId = null) {
  if (!birthDateStr) return "";
  const initials = studentInitials(firstName, middleName, lastName);
  const compact = birthDateStr.replace(/-/g, "");
  let seq = 1;
  let candidate;
  do {
    candidate = `${initials}-${compact}-${String(seq).padStart(2, "0")}`;
    seq++;
  } while (data.students.some(s => s.studentNo === candidate && s.id !== excludeId));
  return candidate;
}
function normalizeNamePart(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function isDuplicateStudent(a, b) {
  return normalizeNamePart(a.firstName) === normalizeNamePart(b.firstName) &&
    normalizeNamePart(a.middleName) === normalizeNamePart(b.middleName) &&
    normalizeNamePart(a.lastName) === normalizeNamePart(b.lastName) &&
    (a.birthDate || "") === (b.birthDate || "");
}
function subjectNameOptions(gradeLevel) {
  const pool = gradeLevel ? data.subjects.filter(s => s.gradeLevel === gradeLevel) : data.subjects;
  const uniqueNames = [...new Set(pool.map(s => s.name))];
  return [{ value: "", label: "— Select subject —" }, ...uniqueNames.map(n => ({ value: n, label: n }))];
}
function subjectGradeLevelOptions() {
  return [{ value: "", label: "— Select grade level —" }, ...GRADE_LEVELS.map(g => ({ value: g, label: g }))];
}
function subjectDefaultsForName(name) {
  const match = data.subjects.find(s => s.name === name);
  return match
    ? { code: match.code, gradeLevel: match.gradeLevel, units: match.units, teacherIds: match.teacherIds || [] }
    : null;
}
function teacherName(id) {
  const t = data.teachers.find(t => t.id == id);
  return t ? t.name : "—";
}
function teacherNames(ids) {
  if (!ids || ids.length === 0) return "—";
  return ids.map(id => teacherName(id)).join(", ");
}
function sectionName(id) {
  const s = data.sections.find(s => s.id == id);
  return s ? s.name : "—";
}
function sectionNameOptionsForGrade(gradeLevel, currentName) {
  const usedNames = new Set(
    data.sections.filter(s => s.gradeLevel === gradeLevel && s.name !== currentName).map(s => s.name)
  );
  const names = SECTION_NAME_POOL.map(n => `${gradeLevel} – ${n}`).filter(n => !usedNames.has(n));
  if (currentName && currentName.startsWith(gradeLevel) && !names.includes(currentName)) {
    names.unshift(currentName);
  }
  if (names.length === 0) {
    let n = 1;
    let fallback = `${gradeLevel} – Section ${n}`;
    while (usedNames.has(fallback)) {
      n++;
      fallback = `${gradeLevel} – Section ${n}`;
    }
    names.push(fallback);
  }
  return names.map(n => ({ value: n, label: n }));
}
function findSectionByGradeAndName(gradeLevel, name) {
  return data.sections.find(s => s.gradeLevel === gradeLevel && s.name === name);
}
function existingSectionNamesForGrade(gradeLevel) {
  return data.sections.filter(s => s.gradeLevel === gradeLevel).map(s => ({ value: s.name, label: s.name }));
}
function sortedSections() {
  return [...data.sections].sort((a, b) =>
    a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name)
  );
}
function subjectLoadCount(teacherId) {
  return data.subjects.filter(s => (s.teacherIds || []).includes(teacherId)).length;
}
function studentCountForSection(sectionId) {
  return data.students.filter(s => s.sectionId == sectionId).length;
}
function statusTag(status) {
  const cls = status === "Active" ? "active" : "inactive";
  return `<span class="status-tag ${cls}">${status}</span>`;
}
// Outstanding balance is edited on the Students Account page now, not here —
// this just reflects the current figure as a Yes/No: any balance above 0
// reads "Yes" (they owe money), a balance of 0 reads "No" (settled).
function outstandingBalanceLabel(balance) {
  const bal = Number(balance || 0);
  return bal > 0 ? "Yes" : "No";
}
function outstandingBalanceTagHtml(balance) {
  const label = outstandingBalanceLabel(balance);
  const cls = label === "Yes" ? "inactive" : "active";
  return { html: `<span class="status-tag ${cls}">${label}</span>`, cls, label };
}
function advisoryCell(teacherId) {
  const section = data.sections.find(s => s.adviserId == teacherId);
  return section ? section.name : `<span class="advisory-none">None assigned</span>`;
}
// The grade level a teacher is scoped to for subject-load purposes — taken
// from the section they advise. null if they aren't advising any section yet.
function teacherAdvisoryGradeLevel(teacherId) {
  const section = data.sections.find(s => s.adviserId == teacherId);
  return section ? section.gradeLevel : null;
}
// The full section object a teacher advises (id, name, gradeLevel), used to
// lock the grade/section fields when that teacher adds/edits a student —
// they can only ever place a student into their own advisory section.
// null if they aren't advising any section yet.
function advisorySectionForTeacher(teacherId) {
  return data.sections.find(s => s.adviserId == teacherId) || null;
}
function subjectLoadCell(teacherId) {
  const count = subjectLoadCount(teacherId);
  return `<button type="button" class="link-count" data-load="${teacherId}">${count} subject${count === 1 ? "" : "s"}</button>`;
}
function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
function computeFinalRating(grades) {
  const values = [grades.q1, grades.q2, grades.q3, grades.q4];
  if (values.every(g => typeof g === "number")) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg * 100) / 100;
  }
  return null;
}
function computeGeneralAverage(student) {
  // Only count subjects currently assigned to this student's grade level —
  // stale/orphaned entries in student.grades (e.g. from a subject that was
  // removed or a past grade level) must not block the average forever.
  const currentSubjectIds = data.subjects
    .filter(su => su.gradeLevel === student.gradeLevel)
    .map(su => String(su.id));

  const finals = currentSubjectIds
    .map(id => student.grades && student.grades[id])
    .map(g => computeFinalRating(g || {}));

  if (finals.length === 0 || finals.some(f => f === null)) return null;
  const avg = finals.reduce((a, b) => a + b, 0) / finals.length;
  return Math.round(avg * 100) / 100;
}

/* ============================================
   RENDERING
   ============================================ */
function renderAll() {
  Object.keys(entityConfig).forEach(renderTable);
  renderStats();
  renderLogs();
  refreshStudentSectionFilterOptions();
  refreshSubjectFilterOptions();
  refreshSectionFilterOptions();
  renderStudentsAccountPage();
}

function refreshStudentSectionFilterOptions() {
  const select = document.getElementById("studentFilterSection");
  const current = select.value;
  const gradeScopedSections = studentFilter.gradeLevel === "all"
    ? data.sections
    : data.sections.filter(s => s.gradeLevel === studentFilter.gradeLevel);
  select.innerHTML = `<option value="all">All sections</option>` +
    gradeScopedSections.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  const stillExists = current === "all" || gradeScopedSections.some(s => String(s.id) === current);
  select.value = stillExists ? current : "all";
  if (!stillExists) studentFilter.sectionId = "all";
}

function refreshSubjectFilterOptions() {
  const teacherSelect = document.getElementById("subjectFilterTeacher");
  const currentTeacher = teacherSelect.value;
  teacherSelect.innerHTML = `<option value="all">All teachers</option><option value="none">Unassigned</option>` +
    data.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  const teacherStillExists = currentTeacher === "all" || currentTeacher === "none" || data.teachers.some(t => String(t.id) === currentTeacher);
  teacherSelect.value = teacherStillExists ? currentTeacher : "all";
  if (!teacherStillExists) subjectFilter.teacherId = "all";
}

function refreshSectionFilterOptions() {
  const sectionSelect = document.getElementById("sectionFilterSection");
  const currentSection = sectionSelect.value;
  const gradeScopedSections = sectionFilter.gradeLevel === "all"
    ? sortedSections()
    : sortedSections().filter(s => s.gradeLevel === sectionFilter.gradeLevel);
  sectionSelect.innerHTML = `<option value="all">All sections</option>` +
    gradeScopedSections.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  const sectionStillExists = currentSection === "all" || gradeScopedSections.some(s => String(s.id) === currentSection);
  sectionSelect.value = sectionStillExists ? currentSection : "all";
  if (!sectionStillExists) sectionFilter.sectionId = "all";

  const adviserSelect = document.getElementById("sectionFilterAdviser");
  const currentAdviser = adviserSelect.value;
  adviserSelect.innerHTML = `<option value="all">All advisers</option><option value="none">Unassigned</option>` +
    data.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  const adviserStillExists = currentAdviser === "all" || currentAdviser === "none" || data.teachers.some(t => String(t.id) === currentAdviser);
  adviserSelect.value = adviserStillExists ? currentAdviser : "all";
  if (!adviserStillExists) sectionFilter.adviserId = "all";
}

let teacherFilter = { term: "", advisoryGrade: "all" };

function getFilteredTeachers() {
  const term = teacherFilter.term.trim().toLowerCase();
  return data.teachers.filter(t => {
    const matchesTerm = !term || t.name.toLowerCase().includes(term);
    let matchesAdvisory = true;
    const section = data.sections.find(s => s.adviserId == t.id);
    if (teacherFilter.advisoryGrade === "none") {
      matchesAdvisory = !section;
    } else if (teacherFilter.advisoryGrade !== "all") {
      matchesAdvisory = section ? section.gradeLevel === teacherFilter.advisoryGrade : false;
    }
    return matchesTerm && matchesAdvisory;
  });
}

let subjectFilter = { term: "", gradeLevel: "all", teacherId: "all" };

function getFilteredSubjects() {
  const term = subjectFilter.term.trim().toLowerCase();
  return data.subjects.filter(s => {
    const matchesTerm = !term || s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term);
    const matchesGrade = subjectFilter.gradeLevel === "all" || s.gradeLevel === subjectFilter.gradeLevel;
    const matchesTeacher = subjectFilter.teacherId === "all" ||
      (subjectFilter.teacherId === "none" ? !(s.teacherIds && s.teacherIds.length) : (s.teacherIds || []).includes(Number(subjectFilter.teacherId)));
    return matchesTerm && matchesGrade && matchesTeacher;
  });
}

let sectionFilter = { sectionId: "all", gradeLevel: "all", adviserId: "all" };

function getFilteredSections() {
  return data.sections.filter(s => {
    const matchesSection = sectionFilter.sectionId === "all" || String(s.id) === sectionFilter.sectionId;
    const matchesGrade = sectionFilter.gradeLevel === "all" || s.gradeLevel === sectionFilter.gradeLevel;
    const matchesAdviser = sectionFilter.adviserId === "all" ||
      (sectionFilter.adviserId === "none" ? s.adviserId == null : String(s.adviserId) === sectionFilter.adviserId);
    return matchesSection && matchesGrade && matchesAdviser;
  });
}

function renderTable(entityKey) {
  const config = entityConfig[entityKey];
  const tbody = document.querySelector(`#table-${entityKey} tbody`);
  const emptyNote = document.getElementById(`empty-${entityKey}`);
  const rows = entityKey === "students" ? getFilteredStudents() :
    entityKey === "subjects" ? getFilteredSubjects() :
    entityKey === "teachers" ? getFilteredTeachers() :
    entityKey === "sections" ? getFilteredSections() : data[entityKey];

  tbody.innerHTML = "";

  if (entityKey === "students") {
    if (data.students.length === 0) {
      emptyNote.textContent = "No students yet. Add the first one above.";
      emptyNote.hidden = false;
    } else if (rows.length === 0) {
      emptyNote.textContent = "No students match your search.";
      emptyNote.hidden = false;
    } else {
      emptyNote.hidden = true;
    }
  } else if (entityKey === "subjects") {
    if (data.subjects.length === 0) {
      emptyNote.textContent = "No subjects yet. Add the first one above.";
      emptyNote.hidden = false;
    } else if (rows.length === 0) {
      emptyNote.textContent = "No subjects match your filters.";
      emptyNote.hidden = false;
    } else {
      emptyNote.hidden = true;
    }
  } else if (entityKey === "teachers") {
    if (data.teachers.length === 0) {
      emptyNote.textContent = "No teachers yet. Add the first one above.";
      emptyNote.hidden = false;
    } else if (rows.length === 0) {
      emptyNote.textContent = "No teachers match your search.";
      emptyNote.hidden = false;
    } else {
      emptyNote.hidden = true;
    }
  } else if (entityKey === "sections") {
    if (data.sections.length === 0) {
      emptyNote.textContent = "No sections yet. Add the first one above.";
      emptyNote.hidden = false;
    } else if (rows.length === 0) {
      emptyNote.textContent = "No sections match your filters.";
      emptyNote.hidden = false;
    } else {
      emptyNote.hidden = true;
    }
  } else {
    emptyNote.hidden = rows.length > 0;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");
    const cells = config.columns(row).map(c => `<td>${c}</td>`).join("");
    const rowActions = buildRowActions(entityKey, row);
    tr.innerHTML = rowActions === null
      ? cells
      : `${cells}
      <td class="row-actions">
        ${rowActions}
      </td>`;
    tbody.appendChild(tr);
  });
}

const ROW_ICONS = {
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
  </svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18"></path>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
  </svg>`,
  grades: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 10 12 5 2 10l10 5 10-5Z"></path>
    <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"></path>
    <path d="M22 10v6"></path>
  </svg>`,
};

function isSectionAdviser(sectionId) {
  const section = data.sections.find(s => s.id === sectionId);
  return !!section && !!currentUser && section.adviserId === currentUser.teacherId;
}

// A Principal or Vice Principal isn't necessarily a section adviser, but still
// needs full, unrestricted grades access across every student and every
// quarter — the section-adviser scoping and the quarter lock both bypass for
// them. This only affects grades; editing/deleting a student's record stays
// governed by isSectionAdviser()/admin as before.
function hasFullGradesAccess() {
  if (!currentUser || currentUser.role !== "teacher") return false;
  const teacher = data.teachers.find(t => t.id === currentUser.teacherId);
  return !!teacher && (teacher.position === "Principal" || teacher.position === "Vice Principal");
}

// True for the Principal, Vice Principal, and Dean positions — the set of
// positions singled out for extra rights (deleting teacher accounts) and
// extra restrictions (grades are view-only for them, see below).
function isSeniorTeacherPosition(teacher) {
  return !!teacher && ["Principal", "Vice Principal", "Dean"].includes(teacher.position);
}
function currentTeacherRecord() {
  if (!currentUser || currentUser.role !== "teacher") return null;
  return data.teachers.find(t => t.id === currentUser.teacherId) || null;
}

// Deleting a teacher account is reserved for admins plus these three senior
// positions — the "Edit teachers" checkbox alone (which unlocks the page and
// editing) is not enough to also delete an account.
function canDeleteTeachers() {
  return isSeniorTeacherPosition(currentTeacherRecord());
}

// True for admins by default (nothing to restrict here) and for students (not applicable).
// Only actually checks the teacher's own checkboxes when the signed-in account is a teacher.
function teacherCan(key) {
  if (!currentUser || currentUser.role !== "teacher") return true;
  const teacher = data.teachers.find(t => t.id === currentUser.teacherId);
  const perms = teacher && teacher.permissions ? teacher.permissions : DEFAULT_TEACHER_PERMISSIONS;
  return !!perms[key];
}

function buildRowActions(entityKey, row) {
  const role = currentUser ? currentUser.role : "admin";
  const parts = [];

  if (entityKey === "students") {
    // Teachers only get the grading-sheet icon for students in a section they advise,
    // except a Principal/Vice Principal, who gets it for every student —
    // getFilteredStudents() already keeps other sections off the table for a regular
    // teacher, but this is a second gate in case a row ever gets rendered from elsewhere.
    const canOpenGrades = role !== "teacher" || hasFullGradesAccess() || isSectionAdviser(row.sectionId);
    if (canOpenGrades) {
      parts.push(`<button class="icon-btn icon-btn--grades" data-grades="${row.id}" title="Grading card sheet" aria-label="Grading card sheet">${ROW_ICONS.grades}</button>`);
    }
    const canEdit = role === "admin" || (role === "teacher" && teacherCan("teachersEditStudents") && isSectionAdviser(row.sectionId));
    if (canEdit) {
      parts.push(`<button class="icon-btn" data-edit="${entityKey}:${row.id}" title="Edit" aria-label="Edit">${ROW_ICONS.edit}</button>`);
    }
    // A teacher who can edit a student (their own advisee) can also delete
    // that record — not admin-only anymore.
    if (canEdit) {
      parts.push(`<button class="icon-btn link-delete" data-delete="${entityKey}:${row.id}" title="Delete" aria-label="Delete">${ROW_ICONS.delete}</button>`);
    }
    return parts.length ? parts.join("") : null;
  }

  if (entityKey === "subjects") {
    if (role === "admin") {
      parts.push(`<button class="icon-btn" data-edit="${entityKey}:${row.id}" title="Edit" aria-label="Edit">${ROW_ICONS.edit}</button>`);
      parts.push(`<button class="icon-btn link-delete" data-delete="${entityKey}:${row.id}" title="Delete" aria-label="Delete">${ROW_ICONS.delete}</button>`);
      return parts.join("");
    }
    // Subjects are admin-only now — teachers can view the list but never add,
    // edit, or delete a subject, regardless of their "Edit subject" checkbox.
    return null;
  }

  if (entityKey === "teachers") {
    // Principal/Vice Principal can always edit teacher records, regardless
    // of their own "Edit teachers" checkbox — same standing as an admin here.
    const canEdit = role === "admin" || (role === "teacher" && (teacherCan("teachersEditTeachers") || hasFullGradesAccess()));
    if (canEdit) {
      parts.push(`<button class="icon-btn" data-edit="${entityKey}:${row.id}" title="Edit" aria-label="Edit">${ROW_ICONS.edit}</button>`);
    }
    // Deleting a teacher account is reserved for admins and for the
    // Principal/Vice Principal/Dean positions — the "Edit teachers" checkbox
    // by itself only grants page access and editing, not deletion.
    if (role === "admin" || canDeleteTeachers()) {
      parts.push(`<button class="icon-btn link-delete" data-delete="${entityKey}:${row.id}" title="Delete" aria-label="Delete">${ROW_ICONS.delete}</button>`);
    }
    return parts.length ? parts.join("") : null;
  }

  // Sections: only admin may edit or delete.
  if (role !== "admin") return null;
  parts.push(`<button class="icon-btn" data-edit="${entityKey}:${row.id}" title="Edit" aria-label="Edit">${ROW_ICONS.edit}</button>`);
  parts.push(`<button class="icon-btn link-delete" data-delete="${entityKey}:${row.id}" title="Delete" aria-label="Delete">${ROW_ICONS.delete}</button>`);
  return parts.join("");
}

/* ============================================
   STUDENT SEARCH / FILTER
   ============================================ */
let studentFilter = { field: "name", term: "", gradeLevel: "all", sectionId: "all" };

function getFilteredStudents() {
  const term = studentFilter.term.trim().toLowerCase();
  const role = currentUser ? currentUser.role : "admin";
  // Teachers only ever see students in the section(s) they're the adviser of,
  // except a Principal/Vice Principal, who — like an admin — sees everyone.
  // (Students never reach this table — they use the portal.)
  const scoped = role === "teacher" && !hasFullGradesAccess()
    ? data.students.filter(s => isSectionAdviser(s.sectionId))
    : data.students;
  return scoped.filter(s => {
    const matchesTerm = !term || (studentFilter.field === "studentNo" ? s.studentNo : s.name).toLowerCase().includes(term);
    const matchesGrade = studentFilter.gradeLevel === "all" || s.gradeLevel === studentFilter.gradeLevel;
    const matchesSection = studentFilter.sectionId === "all" || String(s.sectionId) === String(studentFilter.sectionId);
    return matchesTerm && matchesGrade && matchesSection;
  });
}

function renderStats() {
  document.getElementById("statTeachers").textContent = data.teachers.length;
  document.getElementById("statStudents").textContent = data.students.length;
  document.getElementById("statSubjects").textContent = data.subjects.length;
  document.getElementById("statSections").textContent = data.sections.length;
}

const entityLogCategory = { teachers: "Teacher", students: "Student", subjects: "Admin", sections: "Admin" };

function formatLogDate(d) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function formatLogTime(d) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

let logsFilter = { category: "all" };

function renderLogs() {
  const tbody = document.querySelector("#logsTable tbody");
  const emptyNote = document.getElementById("empty-logs");
  if (!tbody) return;
  const filtered = logsFilter.category === "all"
    ? activityLog
    : activityLog.filter(a => a.category === logsFilter.category);

  tbody.innerHTML = filtered.map(a => `
    <tr>
      <td>${formatLogDate(a.timestamp)}</td>
      <td>${formatLogTime(a.timestamp)}</td>
      <td>${a.name || "—"}</td>
      <td>${a.category}</td>
      <td>${a.action}</td>
      <td>${a.what}</td>
    </tr>`).join("");

  emptyNote.hidden = filtered.length !== 0;
}

/* ============================================
   NAVIGATION
   ============================================ */
function activateNavPage(pageName) {
  // Hard stop, not just a hidden button: a student session can never land on
  // any page but the portal, no matter what triggers navigation.
  if (currentUser && currentUser.role === "student" && pageName !== "portal") {
    pageName = "portal";
  }
  // Same idea for teachers: Admin Settings and Students Account are always
  // admin-only, full stop. Teachers is admin-only too, except the Principal
  // and Vice Principal positions (hasFullGradesAccess) — their nav buttons
  // are already hidden/shown to match, but that alone doesn't stop someone
  // from calling activateNavPage(...) directly (e.g. devtools), so this is
  // the real gate.
  if (currentUser && currentUser.role === "teacher" && pageName === "settings") {
    pageName = "home";
  }
  if (currentUser && currentUser.role === "teacher" && pageName === "studentsAccount") {
    pageName = "home";
  }
  if (currentUser && currentUser.role === "teacher" && pageName === "teachers" && !hasFullGradesAccess()) {
    pageName = "home";
  }
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("is-active"));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("is-active"));
  const navBtn = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  const page = document.getElementById(`page-${pageName}`);
  if (navBtn) navBtn.classList.add("is-active");
  if (page) page.classList.add("is-active");
  // Settings has no modal to reopen, so landing on the page itself is the
  // equivalent "reopen" event that unlocks its Save button.
  if (pageName === "settings") loadSettingsForm();
  if (pageName === "studentsAccount") renderStudentsAccountPage();
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => activateNavPage(btn.dataset.page));
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// The Home page greets whoever is logged in by their title, not a fixed
// "Registrar" — a teacher account holding the Principal position (or Dean,
// Vice Principal, etc.) sees a greeting for that position instead.
function setHomeGreeting(title) {
  const greeting = document.getElementById("homeGreeting");
  if (greeting) greeting.textContent = `Good day, ${title}.`;
}

/* ---- lock the UI down to what this role is allowed to see/do ---- */
function applyRoleRestrictions() {
  const accountLabel = document.getElementById("accountLabel");
  accountLabel.textContent = `${currentUser.username} · ${currentUser.role}`;

  const homeNav = document.querySelector('.nav-item[data-page="home"]');
  const teachersNav = document.querySelector('.nav-item[data-page="teachers"]');
  const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
  const studentsAccountNav = document.querySelector('.nav-item[data-page="studentsAccount"]');
  const studentsNav = document.querySelector('.nav-item[data-page="students"]');
  const subjectsNav = document.querySelector('.nav-item[data-page="subjects"]');
  const sectionsNav = document.querySelector('.nav-item[data-page="sections"]');
  const portalNav = document.getElementById("navPortal");

  if (currentUser.role === "admin") {
    setHomeGreeting("Registrar");
    return; // full access, nothing to hide
  }

  if (currentUser.role === "teacher") {
    const teacher = data.teachers.find(t => t.id === currentUser.teacherId);
    const perms = teacher && teacher.permissions ? teacher.permissions : DEFAULT_TEACHER_PERMISSIONS;
    // Admin Settings and Students Account are always admin-only — no
    // teacher login, including Principal/Vice Principal, ever sees them.
    settingsNav.hidden = true;
    studentsAccountNav.hidden = true;
    // Teachers is hidden from every teacher login except the Principal and
    // Vice Principal positions, who see it.
    const seesAdminNav = hasFullGradesAccess();
    document.querySelectorAll("[data-add]").forEach(btn => { btn.hidden = true; });

    setHomeGreeting((teacher && teacher.position) || "Teacher");

    // Teachers nav: Principal/Vice Principal always see it; every other
    // teacher has it hidden regardless of their "Edit teachers" checkbox.
    teachersNav.hidden = !seesAdminNav;
    const addTeacherBtn = document.querySelector('[data-add="teachers"]');
    if (addTeacherBtn) addTeacherBtn.hidden = !perms.teachersEditTeachers && !seesAdminNav;

    // "Edit students" also governs whether this teacher can add a new one —
    // but only if they're actually advising a section, since a new student a
    // teacher adds always goes into their own grade/section. Subjects are
    // admin-only now, so the Add Subject button stays hidden (its default
    // state, set above) no matter what the "Edit subject" checkbox says.
    const addStudentBtn = document.querySelector('[data-add="students"]');
    if (addStudentBtn) addStudentBtn.hidden = !perms.teachersEditStudents || !advisorySectionForTeacher(currentUser.teacherId);

    // "My portal access" governs whether the My Portal nav item shows at all.
    if (portalNav) {
      portalNav.hidden = !perms.teachersPortalAccess;
      if (perms.teachersPortalAccess) renderTeacherPortal();
    }
    return;
  }

  if (currentUser.role === "student") {
    // Rule: a student login can only ever reach "My Portal" — every other nav
    // item, including the Dashboard/Home screen, is hidden with no exceptions.
    homeNav.hidden = true;
    teachersNav.hidden = true;
    settingsNav.hidden = true;
    studentsAccountNav.hidden = true;
    studentsNav.hidden = true;
    subjectsNav.hidden = true;
    sectionsNav.hidden = true;
    portalNav.hidden = false;
    document.querySelectorAll("[data-add]").forEach(btn => { btn.hidden = true; });
    renderStudentPortal();
    activateNavPage("portal");
  }
}

function renderTeacherPortal() {
  const teacher = data.teachers.find(t => t.id === currentUser.teacherId);
  if (!teacher) return;

  // Teachers have no balance or grading card of their own — only students do.
  document.getElementById("portalBalancePanel").hidden = true;
  document.getElementById("portalGradesPanel").hidden = true;
  document.getElementById("portalSubjectsPanel").hidden = false;

  document.getElementById("portalStudentName").textContent = teacher.name;
  document.getElementById("portalStudentMeta").textContent = `${teacher.username || "—"} · ${teacher.position || "Teacher"}`;
  document.getElementById("portalSubjectsHeading").textContent = "My subject load";

  const subjectsTbody = document.querySelector("#portalSubjectsTable tbody");
  const subjectsEmpty = document.getElementById("portalSubjectsEmpty");
  const taught = data.subjects.filter(s => s.teacherIds.includes(teacher.id));
  if (taught.length) {
    subjectsEmpty.hidden = true;
    subjectsTbody.innerHTML = taught.map(s => `<tr><td>${s.code}</td><td>${s.name}</td><td>${s.units}</td></tr>`).join("");
  } else {
    subjectsEmpty.textContent = "No subjects assigned to you yet.";
    subjectsEmpty.hidden = false;
    subjectsTbody.innerHTML = "";
  }
}

function renderStudentPortal() {
  const student = data.students.find(s => s.id === currentUser.studentId);
  if (!student) return;

  // Undo any teacher-portal hiding, in case the same page markup was last used for a teacher.
  document.getElementById("portalBalancePanel").hidden = false;
  document.getElementById("portalGradesPanel").hidden = false;
  document.getElementById("portalSubjectsHeading").textContent = "My subjects";

  document.getElementById("portalStudentName").textContent = student.name;
  document.getElementById("portalStudentMeta").textContent = `${student.studentNo} · ${student.gradeLevel}${student.sectionId ? " · " + sectionName(student.sectionId) : ""}`;
  const balance = Number(student.balance || 0);
  document.getElementById("portalBalance").textContent = `₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const payBtn = document.getElementById("portalPayBtn");
  payBtn.hidden = balance <= 0;
  payBtn.dataset.balance = balance;

  // Subjects are assigned per grade level (every section within a grade shares
  // the same subject list), so a student's own gradeLevel is what scopes both
  // their subject list and which of their grade records are shown here.
  const gradeSubjects = data.subjects.filter(s => s.gradeLevel === student.gradeLevel);
  const gradeSubjectIds = new Set(gradeSubjects.map(s => s.id));

  const subjectsTbody = document.querySelector("#portalSubjectsTable tbody");
  const subjectsEmpty = document.getElementById("portalSubjectsEmpty");
  subjectsEmpty.textContent = "Subject visibility is currently turned off for your account. Ask an admin to enable it.";
  if (student.permissions.studentsViewSubjects && gradeSubjects.length) {
    subjectsEmpty.hidden = true;
    subjectsTbody.innerHTML = gradeSubjects.map(s => `<tr><td>${s.code}</td><td>${s.name}</td><td>${s.units}</td></tr>`).join("");
  } else {
    subjectsEmpty.hidden = false;
    subjectsTbody.innerHTML = "";
  }

  const gradesTbody = document.querySelector("#portalGradesTable tbody");
  const gradesEmpty = document.getElementById("portalGradesEmpty");
  const subjectIds = Object.keys(student.grades || {}).filter(idStr => gradeSubjectIds.has(Number(idStr)));
  if (student.permissions.studentsViewGradingCard && subjectIds.length) {
    gradesEmpty.hidden = true;
    gradesTbody.innerHTML = subjectIds.map(idStr => {
      const subjectId = Number(idStr);
      const subject = data.subjects.find(s => s.id === subjectId);
      const g = student.grades[idStr];
      const final = computeFinalRating(g);
      return `<tr>
        <td>${subject ? `${subject.code} — ${subject.name}` : "Subject"}</td>
        <td>${fmtGrade(g.q1)}</td><td>${fmtGrade(g.q2)}</td><td>${fmtGrade(g.q3)}</td><td>${fmtGrade(g.q4)}</td>
        <td>${fmtGrade(final)}</td>
      </tr>`;
    }).join("");
  } else {
    gradesEmpty.hidden = false;
    gradesTbody.innerHTML = "";
  }
}

/* ============================================
   SIDEBAR — collapse/hide toggle
   ============================================ */
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

sidebarToggle.addEventListener("click", () => {
  const collapsing = !sidebar.classList.contains("is-collapsed");
  sidebar.classList.toggle("is-collapsed");
  sidebarToggle.setAttribute("aria-expanded", String(!collapsing));
  sidebarToggle.title = collapsing ? "Expand navigation" : "Collapse navigation";
  sidebarToggle.setAttribute("aria-label", collapsing ? "Expand navigation" : "Collapse navigation");
});

/* ============================================
   LOGS PAGE
   ============================================ */
document.getElementById("logsFilterCategory").addEventListener("change", (e) => {
  logsFilter.category = e.target.value;
  renderLogs();
});

/* ============================================
   MODAL (shared add / edit / view)
   ============================================ */
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalFields = document.getElementById("modalFields");
const modalForm = document.getElementById("modalForm");
const modalSubmit = document.getElementById("modalSubmit");

let modalState = { entityKey: null, id: null, mode: null };

function openModal(entityKey, mode, id = null) {
  const config = entityConfig[entityKey];
  const row = id ? data[entityKey].find(r => r.id == id) : null;
  modalState = { entityKey, mode, id };

  modalTitle.textContent =
    mode === "add" ? `Add ${config.label}` :
    mode === "edit" ? `Edit ${config.label}` : `${config.label} details`;

  modalFields.innerHTML = "";

  const blankSubjectEdit = entityKey === "subjects" && mode === "edit";

  config.fields.forEach(field => {
    const wrap = document.createElement("label");
    wrap.className = field.type === "multiselect" ? "field field--full" : "field";
    wrap.dataset.fieldKey = field.key;
    const value = blankSubjectEdit
      ? (field.type === "multiselect" ? [] : "")
      : field.type === "multiselect" ? (row ? (row[field.key] || []) : []) : (row ? row[field.key] ?? "" : "");
    const disabled = (mode === "view" || field.locked) ? "disabled" : "";

    let inputHtml;
    if (field.type === "multiselect") {
      const opts = typeof field.options === "function" ? field.options() : field.options.map(o => ({ value: o, label: o }));
      const selected = value.map(String);
      inputHtml = `<div class="checkbox-list" data-key="${field.key}">` +
        opts.filter(o => o.value !== "").map(o => `
          <label class="checkbox-option">
            <input type="checkbox" value="${o.value}" ${selected.includes(String(o.value)) ? "checked" : ""} ${disabled}>
            <span>${o.label}</span>
          </label>`).join("") +
        `</div>`;
    } else if (field.type === "select") {
      const opts = typeof field.options === "function" ? field.options() : field.options.map(o => ({ value: o, label: o }));
      inputHtml = `<select data-key="${field.key}" ${disabled}>` +
        opts.map(o => `<option value="${o.value}" ${String(o.value) === String(value) ? "selected" : ""}>${o.label}</option>`).join("") +
        `</select>`;
    } else if (field.type === "password") {
      inputHtml = `<div class="field-with-action">
          <input type="text" data-key="${field.key}" value="${value}" ${disabled} autocomplete="off">
          <button type="button" class="btn-tiny" data-gen-password ${disabled}>Generate</button>
        </div>`;
    } else {
      inputHtml = `<input type="${field.type}" data-key="${field.key}" value="${value}" ${field.required ? "required" : ""} ${disabled}>`;
    }

    wrap.innerHTML = `<span>${field.label}</span>${inputHtml}`;
    modalFields.appendChild(wrap);
  });

  // Existing teacher records only have a combined `name` on file (no stored
  // firstName/middleName/lastName), so split it just to prefill these fields.
  if (entityKey === "teachers" && row) {
    const { firstName, middleName, lastName } = splitFullName(row.name);
    const firstInput = modalFields.querySelector('[data-key="firstName"]');
    const middleInput = modalFields.querySelector('[data-key="middleName"]');
    const lastInput = modalFields.querySelector('[data-key="lastName"]');
    if (firstInput) firstInput.value = firstName;
    if (middleInput) middleInput.value = middleName;
    if (lastInput) lastInput.value = lastName;
  }

  modalSubmit.style.display = mode === "view" ? "none" : "inline-block";
  modalSubmit.disabled = false;
  modalBackdrop.hidden = false;

  if (entityKey === "subjects" && mode !== "view") {
    const gradeSelect = modalFields.querySelector('[data-key="gradeLevel"]');
    const nameSelect = modalFields.querySelector('[data-key="name"]');
    const codeInput = modalFields.querySelector('[data-key="code"]');
    const unitsInput = modalFields.querySelector('[data-key="units"]');
    const teacherSelect = modalFields.querySelector('[data-key="teacherIds"]');

    function clearDerivedFields() {
      codeInput.value = "";
      unitsInput.value = "";
      teacherSelect.value = "";
    }

    gradeSelect.addEventListener("change", () => {
      const opts = subjectNameOptions(gradeSelect.value || null);
      nameSelect.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
      clearDerivedFields();
    });

    nameSelect.addEventListener("change", () => {
      const defaults = subjectDefaultsForName(nameSelect.value);
      if (!defaults) { clearDerivedFields(); return; }
      codeInput.value = defaults.code;
      unitsInput.value = defaults.units;
      gradeSelect.value = defaults.gradeLevel;
      if (mode === "add") {
        const opts = availableTeacherOptionsForSubject(nameSelect.value);
        teacherSelect.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
        teacherSelect.value = "";
      } else {
        teacherSelect.value = (defaults.teacherIds && defaults.teacherIds[0] != null) ? String(defaults.teacherIds[0]) : "";
      }
    });
  }

  if (entityKey === "sections" && mode !== "view") {
    const gradeSelect = modalFields.querySelector('[data-key="gradeLevel"]');
    const nameWrap = modalFields.querySelector('[data-field-key="name"]');
    const adviserWrap = modalFields.querySelector('[data-field-key="adviserId"]');

    function lockAdviser(adviserId) {
      adviserWrap.innerHTML = `<span>Adviser</span>
        <input type="text" value="${teacherName(adviserId)}" disabled>
        <input type="hidden" data-key="adviserId" value="${adviserId ?? ''}">`;
    }
    function unlockAdviser() {
      const opts = unassignedTeacherOptions(row ? row.id : null);
      adviserWrap.innerHTML = `<span>Adviser</span>
        <select data-key="adviserId">${opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}</select>`;
      if (row && row.adviserId != null) {
        adviserWrap.querySelector('[data-key="adviserId"]').value = row.adviserId;
      }
    }

    function syncAdviser() {
      const nameInput = nameWrap.querySelector('[data-key="name"]');
      const match = findSectionByGradeAndName(gradeSelect.value, nameInput.value.trim());
      if (match && (!row || match.id !== row.id)) lockAdviser(match.adviserId); else unlockAdviser();
    }

    function renderNameField(preferredName) {
      const grade = gradeSelect.value;
      const opts = mode === "edit" ? existingSectionNamesForGrade(grade) : sectionNameOptionsForGrade(grade, preferredName);
      const value = preferredName ?? (opts[0] ? opts[0].value : "");
      nameWrap.innerHTML = `<span>Section name</span>
        <input type="text" data-key="name" list="sectionNameSuggestions" value="${value}" autocomplete="off" required>
        <datalist id="sectionNameSuggestions">${opts.map(o => `<option value="${o.value}"></option>`).join("")}</datalist>`;
      nameWrap.querySelector('[data-key="name"]').addEventListener("input", syncAdviser);
    }

    renderNameField(row ? row.name : null);
    syncAdviser();

    gradeSelect.addEventListener("change", () => {
      renderNameField(null);
      syncAdviser();
    });
  }

  if (entityKey === "students" && mode !== "view") {
    const firstNameInput = modalFields.querySelector('[data-key="firstName"]');
    const middleNameInput = modalFields.querySelector('[data-key="middleName"]');
    const lastNameInput = modalFields.querySelector('[data-key="lastName"]');
    const gradeSelect = modalFields.querySelector('[data-key="gradeLevel"]');
    const sectionSelect = modalFields.querySelector('[data-key="sectionId"]');
    const birthDateInput = modalFields.querySelector('[data-key="birthDate"]');
    const studentNoInput = modalFields.querySelector('[data-key="studentNo"]');

    function namesFilled() {
      return firstNameInput.value.trim() !== "" && lastNameInput.value.trim() !== "";
    }

    function refreshStudentNo() {
      studentNoInput.value = birthDateInput.value
        ? generateStudentNo(firstNameInput.value, middleNameInput.value, lastNameInput.value, birthDateInput.value, id)
        : "";
    }

    function syncBirthDateAvailability() {
      const ready = namesFilled();
      birthDateInput.disabled = !ready;
      birthDateInput.title = ready ? "" : "Fill in the first and last name first.";
      if (!ready) {
        birthDateInput.value = "";
        studentNoInput.value = "";
      }
    }

    syncBirthDateAvailability();

    [firstNameInput, middleNameInput, lastNameInput].forEach(input => {
      input.addEventListener("input", () => {
        syncBirthDateAvailability();
        if (birthDateInput.value) refreshStudentNo();
      });
    });

    gradeSelect.addEventListener("change", () => {
      const currentSection = sectionSelect.value;
      const opts = sectionOptionsForGrade(gradeSelect.value || null);
      sectionSelect.innerHTML = opts.map(o =>
        `<option value="${o.value}" ${String(o.value) === String(currentSection) ? "selected" : ""}>${o.label}</option>`
      ).join("");
    });

    birthDateInput.addEventListener("change", refreshStudentNo);

    // A teacher (never an admin) can only ever place a student into their own
    // advisory section — added students go straight into it, and an existing
    // student they're editing can't be reassigned out of it. Lock both
    // fields down to that one section instead of leaving every grade/section
    // in the school pickable.
    if (currentUser && currentUser.role === "teacher") {
      const advisory = advisorySectionForTeacher(currentUser.teacherId);
      if (advisory) {
        gradeSelect.value = advisory.gradeLevel;
        gradeSelect.disabled = true;
        sectionSelect.innerHTML = `<option value="${advisory.id}" selected>${advisory.name}</option>`;
        sectionSelect.disabled = true;
      }
    }
  }
}

function closeModal() {
  modalBackdrop.hidden = true;
  modalForm.reset();
}

modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  modalSubmit.disabled = true;

  const { entityKey, mode, id } = modalState;
  const config = entityConfig[entityKey];
  const existingRecord = mode === "edit" ? data[entityKey].find(r => r.id == id) : null;
  const draft = mode === "edit" ? { ...existingRecord } : { id: newId() };

  config.fields.forEach(field => {
    if (field.type === "multiselect") {
      const container = modalFields.querySelector(`[data-key="${field.key}"]`);
      draft[field.key] = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => Number(cb.value));
      return;
    }
    const input = modalFields.querySelector(`[data-key="${field.key}"]`);
    let value = input.value;
    if (entityKey === "subjects" && field.key === "teacherIds") {
      draft.teacherIds = value !== "" ? [Number(value)] : [];
      return;
    }
    if (field.type === "number") value = Number(value);
    // Blank select on an *Id field means "none chosen" — must be null, not
    // "". Sending "" to a bigint column (adviser_id, section_id, ...) makes
    // Supabase reject the whole insert/update with a 400, which silently
    // discarded the record client-side thought it had saved.
    if (field.key.endsWith("Id")) value = value === "" ? null : Number(value);
    draft[field.key] = value;
  });

  for (const field of config.fields) {
    if (!field.required || field.type === "multiselect") continue;
    const value = draft[field.key];
    if (value === "" || value === null || typeof value === "undefined") {
      showToast(`Please fill in "${field.label}".`, "warning");
      modalSubmit.disabled = false;
      return;
    }
  }

  if (entityKey === "teachers") {
    draft.name = buildFullName(draft.firstName, draft.middleName, draft.lastName);
    // New teachers default to "Teacher 1" instead of "— None —". The position
    // isn't on this form — it's only ever set through the accounts modal in
    // Admin settings, whose dropdown still starts with "— None —" for anyone
    // this doesn't apply to (i.e. when editing later and clearing it back out).
    if (mode === "add" && !draft.position) {
      draft.position = "Teacher 1";
    }
  }

  if (entityKey === "students") {
    draft.name = buildFullName(draft.firstName, draft.middleName, draft.lastName);

    const duplicate = data.students.find(s => s.id !== draft.id && isDuplicateStudent(s, draft));
    if (duplicate) {
      showToast("An existing student information already exist.", "error");
      modalSubmit.disabled = false;
      return;
    }

    const duplicateNo = data.students.find(s => s.id !== draft.id && s.studentNo === draft.studentNo);
    if (duplicateNo) {
      draft.studentNo = generateStudentNo(draft.firstName, draft.middleName, draft.lastName, draft.birthDate, draft.id);
    }
  }

  if (entityKey === "subjects") {
    const newTeacherId = (draft.teacherIds && draft.teacherIds[0] != null) ? draft.teacherIds[0] : null;
    const duplicateSubject = data.subjects.find(s => {
      if (s.id === draft.id || s.code !== draft.code) return false;
      const existingTeacherId = (s.teacherIds && s.teacherIds[0] != null) ? s.teacherIds[0] : null;
      return existingTeacherId === newTeacherId;
    });
    if (duplicateSubject) {
      showToast("This subject is already assigned to that teacher.", "error");
      modalSubmit.disabled = false;
      return;
    }
  }

  if (entityKey === "sections") {
    const normalizedName = (draft.name || "").trim().toLowerCase();
    const duplicateSection = data.sections.find(s =>
      s.id !== draft.id &&
      s.gradeLevel === draft.gradeLevel &&
      (s.name || "").trim().toLowerCase() === normalizedName
    );
    if (duplicateSection) {
      showToast("That section name is already used in this grade level.", "error");
      modalSubmit.disabled = false;
      return;
    }
  }

  if (mode === "add" && (entityKey === "teachers" || entityKey === "students") && !draft.password) {
    draft.password = generatePassword();
  }

  const recordName = draft.name || draft.code || draft.studentNo || "—";
  const logCategory = entityLogCategory[entityKey] || "Admin";
  const label = config.label.charAt(0).toUpperCase() + config.label.slice(1);

  if (mode === "add") {
    data[entityKey].push(draft);
    logActivity(`Added a new ${config.label}: ${recordName}.`, logCategory, "Add", recordName);
    showToast(`${label} added.`, "success");
  } else {
    Object.assign(existingRecord, draft);
    logActivity(`Updated ${config.label} record: ${recordName}.`, logCategory, "Edit", recordName);
    showToast(`${label} updated.`, "success");
  }
  persistEntitySave(entityKey, mode, draft);

  renderAll();
  closeModal();
});

modalFields.addEventListener("click", (e) => {
  if (e.target.matches("[data-gen-password]")) {
    const input = modalFields.querySelector('[data-key="password"]');
    if (input) input.value = generatePassword();
  }
});

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalCancel").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

/* Add buttons */
document.querySelectorAll("[data-add]").forEach(btn => {
  btn.addEventListener("click", () => openModal(btn.dataset.add, "add"));
});

/* Table view/edit/delete (event delegation) */
document.querySelectorAll(".ledger-panel").forEach(panel => {
  panel.addEventListener("click", (e) => {
    const target = e.target.closest("[data-view],[data-edit],[data-delete],[data-load],[data-grades]");
    if (!target) return;
    const viewKey = target.dataset.view;
    const editKey = target.dataset.edit;
    const deleteKey = target.dataset.delete;
    const loadKey = target.dataset.load;
    const gradesKey = target.dataset.grades;

    if (gradesKey) {
      openGradesModal(Number(gradesKey));
      return;
    }

    if (loadKey) {
      openLoadModal(Number(loadKey));
      return;
    }

    if (viewKey) {
      const [entityKey, id] = viewKey.split(":");
      openModal(entityKey, "view", Number(id));
    }
    if (editKey) {
      const [entityKey, id] = editKey.split(":");
      openModal(entityKey, "edit", Number(id));
    }
    if (deleteKey) {
      const [entityKey, id] = deleteKey.split(":");
      openConfirm(entityKey, Number(id));
    }
  });
});

/* ============================================
   DELETE CONFIRM
   ============================================ */
const confirmBackdrop = document.getElementById("confirmBackdrop");
const confirmText = document.getElementById("confirmText");
let pendingDelete = null;

function openConfirm(entityKey, id) {
  const config = entityConfig[entityKey];
  const row = data[entityKey].find(r => r.id == id);
  const name = row.name || row.code || row.studentNo || "this record";
  confirmText.textContent = `"${name}" will be removed from ${config.label}s. This can't be undone.`;
  pendingDelete = { entityKey, id, name };
  document.getElementById("confirmDelete").disabled = false;
  confirmBackdrop.hidden = false;
}

document.getElementById("confirmCancel").addEventListener("click", () => {
  confirmBackdrop.hidden = true;
  pendingDelete = null;
});

document.getElementById("confirmDelete").addEventListener("click", (e) => {
  if (!pendingDelete) return;
  e.target.disabled = true;
  const { entityKey, id, name } = pendingDelete;
  const config = entityConfig[entityKey];
  data[entityKey] = data[entityKey].filter(r => r.id !== id);
  logActivity(`Deleted a ${config.label} record: ${name}.`, entityLogCategory[entityKey] || "Admin", "Delete", name);
  persistEntityDelete(entityKey, id);
  renderAll();
  confirmBackdrop.hidden = true;
  pendingDelete = null;
});

/* ============================================
   SUBJECT LOAD MODAL
   ============================================ */
const loadBackdrop = document.getElementById("loadBackdrop");
const loadTitle = document.getElementById("loadTitle");
const loadTableBody = document.querySelector("#loadTable tbody");
const loadEmpty = document.getElementById("loadEmpty");
const loadAddSelect = document.getElementById("loadAddSelect");
const loadAddBtn = document.getElementById("loadAddBtn");
const loadAdvisoryNote = document.getElementById("loadAdvisoryNote");

let currentLoadTeacherId = null;

function openLoadModal(teacherId) {
  currentLoadTeacherId = teacherId;
  const teacher = data.teachers.find(t => t.id === teacherId);
  loadTitle.textContent = `Subject load — ${teacher.name}`;
  renderLoadModal();
  loadBackdrop.hidden = false;
}

function normalizeGradeLevel(g) {
  return (g || "").trim().toLowerCase();
}

function renderLoadModal() {
  const assigned = data.subjects.filter(s => (s.teacherIds || []).includes(currentLoadTeacherId));
  // A teacher can only be given a subject load from the grade level they
  // advise — e.g. a Grade 7 adviser only sees Grade 7 subjects to add.
  const advisoryGrade = teacherAdvisoryGradeLevel(currentLoadTeacherId);
  const unassigned = data.subjects.filter(s =>
    !(s.teacherIds || []).includes(currentLoadTeacherId) &&
    normalizeGradeLevel(s.gradeLevel) === normalizeGradeLevel(advisoryGrade)
  );

  loadTableBody.innerHTML = "";
  loadEmpty.hidden = assigned.length > 0;

  assigned.forEach(sub => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sub.code}</td>
      <td>${sub.name}</td>
      <td class="row-actions">
        <button class="link-delete" data-remove-subject="${sub.id}">Remove</button>
      </td>`;
    loadTableBody.appendChild(tr);
  });

  if (!advisoryGrade) {
    loadAdvisoryNote.textContent = "This teacher isn't advising a section yet — assign them as a section adviser first to enable adding subjects.";
    loadAddSelect.innerHTML = `<option value="">No grade level assigned</option>`;
    loadAddSelect.disabled = true;
    loadAddBtn.disabled = true;
  } else {
    loadAdvisoryNote.textContent = `Only ${advisoryGrade} subjects can be added — this teacher advises a ${advisoryGrade} section.`;
    loadAddSelect.innerHTML = unassigned.length
      ? unassigned.map(s => `<option value="${s.id}">${s.code} — ${s.name}</option>`).join("")
      : `<option value="">No other ${advisoryGrade} subjects available</option>`;
    loadAddSelect.disabled = unassigned.length === 0;
    loadAddBtn.disabled = unassigned.length === 0;
  }
}

loadTableBody.addEventListener("click", (e) => {
  const subId = e.target.dataset.removeSubject;
  if (!subId) return;
  const subject = data.subjects.find(s => s.id === Number(subId));
  subject.teacherIds = (subject.teacherIds || []).filter(id => id !== currentLoadTeacherId);
  logActivity(`Removed ${subject.code} from ${teacherName(currentLoadTeacherId)}'s subject load.`, "Teacher", "Edit", teacherName(currentLoadTeacherId));
  supabaseClient.from("subject_teachers").delete().eq("subject_id", subject.id).eq("teacher_id", currentLoadTeacherId)
    .then(({ error }) => { if (error) { console.error(error); showToast("Couldn't update the database — check your connection.", "error"); } });
  renderLoadModal();
  renderAll();
});

document.getElementById("loadAddBtn").addEventListener("click", () => {
  const subId = loadAddSelect.value;
  if (!subId) return;
  const subject = data.subjects.find(s => s.id === Number(subId));
  if (!subject.teacherIds) subject.teacherIds = [];
  if (!subject.teacherIds.includes(currentLoadTeacherId)) subject.teacherIds.push(currentLoadTeacherId);
  logActivity(`Added ${subject.code} to ${teacherName(currentLoadTeacherId)}'s subject load.`, "Teacher", "Edit", teacherName(currentLoadTeacherId));
  supabaseClient.from("subject_teachers").insert({ subject_id: subject.id, teacher_id: currentLoadTeacherId })
    .then(({ error }) => { if (error) { console.error(error); showToast("Couldn't update the database — check your connection.", "error"); } });
  renderLoadModal();
  renderAll();
});

function closeLoadModal() {
  loadBackdrop.hidden = true;
  currentLoadTeacherId = null;
}

document.getElementById("loadClose").addEventListener("click", closeLoadModal);
document.getElementById("loadDone").addEventListener("click", closeLoadModal);
loadBackdrop.addEventListener("click", (e) => { if (e.target === loadBackdrop) closeLoadModal(); });

/* ============================================
   GRADING CARD SHEET MODAL
   ============================================ */
const gradesBackdrop = document.getElementById("gradesBackdrop");
const gradesTitle = document.getElementById("gradesTitle");
const gradesPeriodNote = document.getElementById("gradesPeriodNote");
const gradesTableBody = document.querySelector("#gradesTable tbody");
let currentGradesStudentId = null;

const QUARTER_ORDER = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];
const QUARTERS = [
  { label: "1st Quarter", key: "q1" },
  { label: "2nd Quarter", key: "q2" },
  { label: "3rd Quarter", key: "q3" },
  { label: "4th Quarter", key: "q4" },
];

function isQuarterLocked(quarterLabel) {
  const currentIdx = QUARTER_ORDER.indexOf(settings.period);
  const thisIdx = QUARTER_ORDER.indexOf(quarterLabel);
  if (currentIdx === -1 || thisIdx === -1) return false;
  return thisIdx < currentIdx;
}

function fmtGrade(value) {
  return typeof value === "number" ? value : `<span class="rating-pending">Pending</span>`;
}

// Set fresh each time the grading card sheet opens.
// Grades are a teacher's job, not an admin's — so an admin account is always
// view-only here regardless of the teacher permission checkboxes.
let currentGradesEditAllowed = true;
// Historically let a Principal/Vice Principal edit any quarter at any time.
// Now moot for them since seniorPosition blocks their editing outright (see
// openGradesModal) — kept for any future role that both edits grades and
// needs the quarter lock bypassed.
let currentQuarterLockBypassed = false;
// Why grade cells are disabled right now — shown in the disabled input's
// title. Only meaningful when currentGradesEditAllowed is false.
let currentGradesLockedReason = "";

function gradeCellHtml(quarterLabel, quarterKey, value) {
  const displayValue = typeof value === "number" ? value : "";
  if (!currentGradesEditAllowed) {
    return `<input type="number" class="grade-input" min="0" max="100" step="1"
      data-quarter="${quarterKey}" value="${displayValue}" placeholder="—"
      disabled title="${currentGradesLockedReason}">`;
  }
  const locked = !currentQuarterLockBypassed && isQuarterLocked(quarterLabel);
  return `<input type="number" class="grade-input" min="0" max="100" step="1"
    data-quarter="${quarterKey}" value="${displayValue}" placeholder="—"
    ${locked ? `disabled title="Locked — ${quarterLabel} has already passed."` : ""}>`;
}

function openGradesModal(studentId) {
  currentGradesStudentId = studentId;
  const role = currentUser ? currentUser.role : "admin";
  // Grades: teachers only (and only if their "Edit grades" checkbox is on).
  // Admin accounts can look, but never edit, a student's grades here.
  const student0 = data.students.find(s => s.id === studentId);
  const teacherRecord = currentTeacherRecord();
  const seniorPosition = isSeniorTeacherPosition(teacherRecord);
  const fullAccess = hasFullGradesAccess();
  // Principal, Vice Principal, and Dean can look at any student's grades but
  // never edit them, regardless of the "Edit grades" checkbox or whether
  // they're that student's section adviser.
  currentGradesEditAllowed = role === "teacher" && !seniorPosition && teacherCan("teachersEditGrades") && (fullAccess || isSectionAdviser(student0 && student0.sectionId));
  currentQuarterLockBypassed = role === "teacher" && fullAccess && !seniorPosition;
  currentGradesLockedReason = seniorPosition
    ? `Locked — ${teacherRecord.position} accounts can view grades but not edit them.`
    : "Locked — your account's Edit grades access is turned off.";

  const student = data.students.find(s => s.id === studentId);
  gradesTitle.textContent = `Grading card sheet — ${student.name}`;
  if (role === "admin") {
    gradesPeriodNote.textContent = "Viewing only — grades are entered and edited by teachers, not admin accounts.";
  } else if (seniorPosition) {
    gradesPeriodNote.textContent = `Viewing only — ${teacherRecord.position} accounts can view grades but not edit them.`;
  } else if (currentGradesEditAllowed) {
    gradesPeriodNote.textContent = `Currently on ${settings.period}. Earlier quarters are locked and can no longer be edited.`;
  } else {
    gradesPeriodNote.textContent = "Grades are locked for your account — ask an admin to turn on Edit grades access.";
  }
  const gradesSaveBtnEl = document.getElementById("gradesSaveBtn");
  gradesSaveBtnEl.hidden = !currentGradesEditAllowed;
  gradesSaveBtnEl.disabled = false;

  // Outstanding balance, shown top-most in the sheet — read-only here. The
  // actual balance figure is set on the Students Account page (admin only).
  const outstandingBadge = document.getElementById("gradesOutstandingBadge");
  const tag = outstandingBalanceTagHtml(student.balance);
  outstandingBadge.textContent = tag.label;
  outstandingBadge.className = `status-tag ${tag.cls}`;

  if (!student.grades) student.grades = {};

  // Every subject assigned to this student's grade level (sections within a
  // grade all share the same subject list), not just the ones that already
  // happen to have a grade recorded — so a freshly-added subject still shows.
  const subjectIds = data.subjects
    .filter(su => su.gradeLevel === student.gradeLevel)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(su => su.id);

  gradesTableBody.innerHTML = subjectIds.map(subjectId => {
    const subject = data.subjects.find(s => s.id === subjectId);
    const g = student.grades[subjectId] || {};
    const final = computeFinalRating(g);
    return `
      <tr data-subject-row="${subjectId}">
        <td>${subject ? `${subject.code} — ${subject.name}` : "Unknown subject"}</td>
        ${QUARTERS.map(q => `<td>${gradeCellHtml(q.label, q.key, g[q.key])}</td>`).join("")}
        <td class="final-rating-cell">${fmtGrade(final)}</td>
      </tr>`;
  }).join("") + (subjectIds.length ? "" : `
    <tr><td colspan="6" class="empty-note-cell">No subjects assigned to ${student.gradeLevel} yet.</td></tr>`) + `
    <tr class="row-final">
      <td colspan="5">General average</td>
      <td class="general-average-cell">${fmtGrade(computeGeneralAverage(student))}</td>
    </tr>`;

  gradesBackdrop.hidden = false;
}

gradesTableBody.addEventListener("input", (e) => {
  if (!e.target.matches(".grade-input")) return;
  const row = e.target.closest("tr[data-subject-row]");
  if (!row) return;
  const g = {};
  row.querySelectorAll(".grade-input").forEach(inp => {
    const v = inp.value.trim();
    if (v !== "") g[inp.dataset.quarter] = Number(v);
  });
  const cell = row.querySelector(".final-rating-cell");
  if (cell) cell.innerHTML = fmtGrade(computeFinalRating(g));
});

document.getElementById("gradesSaveBtn").addEventListener("click", () => {
  const saveBtn = document.getElementById("gradesSaveBtn");
  saveBtn.disabled = true;

  const student = data.students.find(s => s.id === currentGradesStudentId);
  if (!student) { saveBtn.disabled = false; return; }

  let outOfRange = false;
  gradesTableBody.querySelectorAll("tr[data-subject-row]").forEach(row => {
    const subjectId = row.dataset.subjectRow;
    if (!student.grades[subjectId]) student.grades[subjectId] = {};
    row.querySelectorAll(".grade-input:not(:disabled)").forEach(inp => {
      const quarter = inp.dataset.quarter;
      const raw = inp.value.trim();
      if (raw === "") {
        delete student.grades[subjectId][quarter];
        return;
      }
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0 || num > 100) { outOfRange = true; return; }
      student.grades[subjectId][quarter] = num;
    });
  });

  if (outOfRange) {
    showToast("Grades must be between 0 and 100.", "warning");
    saveBtn.disabled = false;
    return;
  }

  logActivity(`Updated grades for ${student.name} (${settings.period}).`, "Student", "Edit", student.name);
  showToast("Grades saved.", "success");

  const gradeRows = Object.keys(student.grades).map(subjectId => ({
    student_id: student.id,
    subject_id: Number(subjectId),
    q1: student.grades[subjectId].q1 ?? null,
    q2: student.grades[subjectId].q2 ?? null,
    q3: student.grades[subjectId].q3 ?? null,
    q4: student.grades[subjectId].q4 ?? null,
  }));
  if (gradeRows.length) {
    supabaseClient.from("grades").upsert(gradeRows, { onConflict: "student_id,subject_id" }).then(({ error }) => {
      if (error) { console.error(error); showToast("Couldn't save grades to the database.", "error"); }
    });
  }

  openGradesModal(currentGradesStudentId);
  // A successful save locks the button grey — reopening the grading sheet
  // (openGradesModal, just above) is what resets it, not a timer, so the
  // user has to close and reopen it to save again.
  saveBtn.disabled = true;
});

function closeGradesModal() { gradesBackdrop.hidden = true; }
document.getElementById("gradesClose").addEventListener("click", closeGradesModal);
document.getElementById("gradesDone").addEventListener("click", closeGradesModal);
gradesBackdrop.addEventListener("click", (e) => { if (e.target === gradesBackdrop) closeGradesModal(); });

/* ============================================
   TEACHER FILTER BAR WIRING
   ============================================ */
const teacherSearchInput = document.getElementById("teacherSearchInput");

teacherSearchInput.addEventListener("input", () => {
  teacherFilter.term = teacherSearchInput.value;
  renderTable("teachers");
});

document.getElementById("teacherFilterAdvisory").addEventListener("change", (e) => {
  teacherFilter.advisoryGrade = e.target.value;
  renderTable("teachers");
});

document.getElementById("teacherSearchClear").addEventListener("click", () => {
  teacherSearchInput.value = "";
  teacherFilter = { term: "", advisoryGrade: "all" };
  document.getElementById("teacherFilterAdvisory").value = "all";
  renderTable("teachers");
});

/* ============================================
   STUDENT SEARCH BAR WIRING
   ============================================ */
const studentFilterField = document.getElementById("studentFilterField");
const studentSearchInput = document.getElementById("studentSearchInput");

studentFilterField.addEventListener("change", () => {
  studentFilter.field = studentFilterField.value;
  studentSearchInput.placeholder = studentFilter.field === "studentNo" ? "Type a student no.…" : "Type a name…";
  renderTable("students");
});

studentSearchInput.addEventListener("input", () => {
  studentFilter.term = studentSearchInput.value;
  renderTable("students");
});

document.getElementById("studentFilterGrade").addEventListener("change", (e) => {
  studentFilter.gradeLevel = e.target.value;
  refreshStudentSectionFilterOptions();
  renderTable("students");
});

document.getElementById("studentFilterSection").addEventListener("change", (e) => {
  studentFilter.sectionId = e.target.value;
  if (studentFilter.sectionId !== "all") {
    const section = data.sections.find(s => String(s.id) === studentFilter.sectionId);
    if (section) {
      studentFilter.gradeLevel = section.gradeLevel;
      document.getElementById("studentFilterGrade").value = section.gradeLevel;
      refreshStudentSectionFilterOptions();
    }
  } else {
    studentFilter.gradeLevel = "all";
    document.getElementById("studentFilterGrade").value = "all";
    refreshStudentSectionFilterOptions();
  }
  renderTable("students");
});

document.getElementById("studentSearchClear").addEventListener("click", () => {
  studentFilterField.value = "name";
  studentFilter.field = "name";
  studentSearchInput.value = "";
  studentSearchInput.placeholder = "Type a name…";
  studentFilter.term = "";
  studentFilter.gradeLevel = "all";
  studentFilter.sectionId = "all";
  document.getElementById("studentFilterGrade").value = "all";
  document.getElementById("studentFilterSection").value = "all";
  refreshStudentSectionFilterOptions();
  renderTable("students");
});

/* ============================================
   SUBJECT FILTER BAR WIRING
   ============================================ */
const subjectSearchInput = document.getElementById("subjectSearchInput");

subjectSearchInput.addEventListener("input", () => {
  subjectFilter.term = subjectSearchInput.value;
  renderTable("subjects");
});

document.getElementById("subjectFilterGrade").addEventListener("change", (e) => {
  subjectFilter.gradeLevel = e.target.value;
  renderTable("subjects");
});

document.getElementById("subjectFilterTeacher").addEventListener("change", (e) => {
  subjectFilter.teacherId = e.target.value;
  renderTable("subjects");
});

document.getElementById("subjectSearchClear").addEventListener("click", () => {
  subjectSearchInput.value = "";
  subjectFilter = { term: "", gradeLevel: "all", teacherId: "all" };
  document.getElementById("subjectFilterGrade").value = "all";
  document.getElementById("subjectFilterTeacher").value = "all";
  renderTable("subjects");
});

document.getElementById("sectionFilterSection").addEventListener("change", (e) => {
  sectionFilter.sectionId = e.target.value;
  renderTable("sections");
});

document.getElementById("sectionFilterGrade").addEventListener("change", (e) => {
  sectionFilter.gradeLevel = e.target.value;
  refreshSectionFilterOptions();
  renderTable("sections");
});

document.getElementById("sectionFilterAdviser").addEventListener("change", (e) => {
  sectionFilter.adviserId = e.target.value;
  renderTable("sections");
});

document.getElementById("sectionSearchClear").addEventListener("click", () => {
  sectionFilter = { sectionId: "all", gradeLevel: "all", adviserId: "all" };
  document.getElementById("sectionFilterSection").value = "all";
  document.getElementById("sectionFilterGrade").value = "all";
  document.getElementById("sectionFilterAdviser").value = "all";
  renderTable("sections");
});

/* ============================================
   USER ACCOUNTS MODALS (Admin Settings)
   ============================================ */
function renderTeacherAccountsModal() {
  const tbody = document.querySelector("#teacherAccountsTable tbody");
  tbody.innerHTML = data.teachers.length ? data.teachers.map(t => {
    if (!t.permissions) t.permissions = { ...DEFAULT_TEACHER_PERMISSIONS };
    return `
    <tr>
      <td>${t.name}</td>
      <td>${t.username || "—"}</td>
      <td>${statusTag(t.status)}</td>
      <td>
        <select data-position="${t.id}">
          <option value="">— None —</option>
          ${TEACHER_POSITIONS.map(p => `<option value="${p}" ${t.position === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </td>
      <td>
        <div class="checkbox-list checkbox-list--inline">
          ${TEACHER_PERMS.map(p => `
            <label class="checkbox-option">
              <input type="checkbox" data-teacher-cred="${t.id}" data-teacher-cred-key="${p.key}" ${t.permissions[p.key] ? "checked" : ""}>
              <span>${p.label}</span>
            </label>`).join("")}
        </div>
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="5">No teacher accounts yet.</td></tr>`;

  tbody.querySelectorAll("[data-position]").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const teacher = data.teachers.find(t => t.id === Number(e.target.dataset.position));
      teacher.position = e.target.value;
      logActivity(`${e.target.value ? `Set position for ${teacher.name} to ${e.target.value}.` : `Cleared position for ${teacher.name}.`}`, "Admin", "Edit", teacher.name);
      supabaseClient.from("teachers").update({ position: teacher.position || null }).eq("id", teacher.id).then(({ error }) => {
        if (error) { console.error(error); showToast("Couldn't save position to the database.", "error"); }
      });
    });
  });

  tbody.querySelectorAll("[data-teacher-cred]").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const teacher = data.teachers.find(t => t.id === Number(e.target.dataset.teacherCred));
      if (!teacher) return;
      const key = e.target.dataset.teacherCredKey;
      teacher.permissions[key] = e.target.checked;
      const label = TEACHER_PERMS.find(p => p.key === key).label;
      logActivity(`${e.target.checked ? "Granted" : "Removed"} access for ${teacher.name}: ${label}.`, "Admin", "Edit", teacher.name);
      const column = TEACHER_PERM_COLUMNS[key];
      supabaseClient.from("teachers").update({ [column]: e.target.checked }).eq("id", teacher.id).then(({ error }) => {
        if (error) { console.error(error); showToast("Couldn't save access to the database.", "error"); }
      });
      // If this admin is looking at the account of the teacher currently signed in
      // (rare, but possible with two tabs), reflect the change immediately.
      if (currentUser && currentUser.role === "teacher" && currentUser.teacherId === teacher.id) {
        applyRoleRestrictions();
        renderAll();
      }
    });
  });
}

function renderStudentAccountsModal() {
  const tbody = document.querySelector("#studentAccountsTable tbody");
  tbody.innerHTML = data.students.length ? data.students.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.studentNo}</td>
      <td>${s.gradeLevel}</td>
      <td>${statusTag(s.status)}</td>
      <td><button type="button" class="icon-btn" data-edit-student="${s.id}" title="Edit" aria-label="Edit">${ROW_ICONS.edit}</button></td>
    </tr>`).join("") : `<tr><td colspan="5">No student accounts yet.</td></tr>`;

  tbody.querySelectorAll("[data-edit-student]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.dataset.editStudent);
      openStudentCredentialsModal(id);
    });
  });
}

/* ============================================
   STUDENTS ACCOUNT PAGE (admin-only balance editing)
   ============================================ */
let studentsAccountFilter = { term: "" };

function getFilteredStudentsAccount() {
  const term = studentsAccountFilter.term.trim().toLowerCase();
  return data.students.filter(s => !term || s.name.toLowerCase().includes(term));
}

function renderStudentsAccountPage() {
  const tbody = document.querySelector("#table-studentsAccount tbody");
  const emptyNote = document.getElementById("empty-studentsAccount");
  if (!tbody) return;
  const rows = getFilteredStudentsAccount();

  tbody.innerHTML = rows.map(s => `
    <tr data-student-account-row="${s.id}">
      <td>${s.name}</td>
      <td>${s.studentNo}</td>
      <td>${s.gradeLevel}</td>
      <td>
        <div class="balance-input-wrap">
          <span class="balance-currency">₱</span>
          <input type="number" class="balance-input" min="0" step="0.01" placeholder="0.00"
            data-account-balance-input="${s.id}" value="${s.balance != null ? Number(s.balance) : ""}">
        </div>
      </td>
      <td><button type="button" class="icon-btn" data-save-account-balance="${s.id}" title="Save balance" aria-label="Save balance">${ROW_ICONS.edit}</button></td>
    </tr>`).join("");

  emptyNote.hidden = rows.length !== 0;

  tbody.querySelectorAll("[data-save-account-balance]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.dataset.saveAccountBalance);
      saveStudentAccountBalance(id);
    });
  });
}

function saveStudentAccountBalance(id) {
  const student = data.students.find(s => s.id === id);
  if (!student) return;
  const input = document.querySelector(`[data-account-balance-input="${id}"]`);
  if (!input) return;

  const raw = input.value.trim();
  let newBalance;
  if (raw === "") {
    newBalance = 0;
  } else {
    const num = Number(raw);
    if (Number.isNaN(num) || num < 0) {
      showToast("Balance must be a valid non-negative number.", "warning");
      return;
    }
    newBalance = num;
  }

  student.balance = newBalance;
  input.value = newBalance;

  logActivity(`Updated account balance for ${student.name}.`, "Student", "Edit", student.name);
  showToast("Account balance saved.", "success");

  supabaseClient.from("students").update({ balance: newBalance }).eq("id", student.id).then(({ error }) => {
    if (error) { console.error(error); showToast("Couldn't save balance to the database.", "error"); }
  });

  // Keep the grading card sheet's Yes/No badge in sync if it's open on this student.
  if (currentGradesStudentId === id) {
    const badge = document.getElementById("gradesOutstandingBadge");
    if (badge) {
      const tag = outstandingBalanceTagHtml(newBalance);
      badge.textContent = tag.label;
      badge.className = `status-tag ${tag.cls}`;
    }
  }
}

const studentsAccountSearchInput = document.getElementById("studentsAccountSearchInput");
if (studentsAccountSearchInput) {
  studentsAccountSearchInput.addEventListener("input", () => {
    studentsAccountFilter.term = studentsAccountSearchInput.value;
    renderStudentsAccountPage();
  });
}
const studentsAccountSearchClear = document.getElementById("studentsAccountSearchClear");
if (studentsAccountSearchClear) {
  studentsAccountSearchClear.addEventListener("click", () => {
    studentsAccountFilter.term = "";
    studentsAccountSearchInput.value = "";
    renderStudentsAccountPage();
  });
}

const STUDENT_PERMS = [
  { key: "studentsViewSubjects", label: "View the subjects assigned to them" },
  { key: "studentsViewGradingCard", label: "View their own grading card" },
];
const STUDENT_PERM_COLUMNS = {
  studentsViewSubjects: "can_view_subjects",
  studentsViewGradingCard: "can_view_grading_card",
};

function openStudentCredentialsModal(id) {
  const student = data.students.find(s => s.id === id);
  if (!student) return;
  if (!student.permissions) {
    student.permissions = { studentsViewSubjects: true, studentsViewGradingCard: true };
  }

  document.getElementById("studentCredentialsTitle").textContent = student.name;
  document.getElementById("studentCredentialsSubtitle").textContent = `What ${student.name}'s login can do:`;

  const list = document.getElementById("studentCredentialsList");
  list.innerHTML = STUDENT_PERMS.map(p => `
    <label class="checkbox-option">
      <input type="checkbox" data-cred="${p.key}" ${student.permissions[p.key] ? "checked" : ""}>
      <span>${p.label}</span>
    </label>`).join("");

  list.querySelectorAll("[data-cred]").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const key = e.target.dataset.cred;
      student.permissions[key] = e.target.checked;
      const label = STUDENT_PERMS.find(p => p.key === key).label;
      logActivity(`${e.target.checked ? "Granted" : "Removed"} access for ${student.name}: ${label}.`, "Admin", "Edit", student.name);
      const column = STUDENT_PERM_COLUMNS[key];
      supabaseClient.from("students").update({ [column]: e.target.checked }).eq("id", student.id).then(({ error }) => {
        if (error) { console.error(error); showToast("Couldn't save access to the database.", "error"); }
      });
    });
  });

  document.getElementById("studentCredentialsBackdrop").hidden = false;
}

function wireSimpleModalClose(backdropId, closeId, doneId) {
  const backdrop = document.getElementById(backdropId);
  const close = () => { backdrop.hidden = true; };
  document.getElementById(closeId).addEventListener("click", close);
  document.getElementById(doneId).addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
}

document.getElementById("logsBtn").addEventListener("click", () => {
  renderLogs();
  document.getElementById("logsBackdrop").hidden = false;
});
document.getElementById("viewTeacherAccountsBtn").addEventListener("click", () => {
  renderTeacherAccountsModal();
  document.getElementById("teacherAccountsBackdrop").hidden = false;
});
document.getElementById("viewStudentAccountsBtn").addEventListener("click", () => {
  renderStudentAccountsModal();
  document.getElementById("studentAccountsBackdrop").hidden = false;
});

wireSimpleModalClose("logsBackdrop", "logsClose", "logsDone");
wireSimpleModalClose("teacherAccountsBackdrop", "teacherAccountsClose", "teacherAccountsDone");
wireSimpleModalClose("studentAccountsBackdrop", "studentAccountsClose", "studentAccountsDone");
wireSimpleModalClose("studentCredentialsBackdrop", "studentCredentialsClose", "studentCredentialsDone");

/* ============================================
   PAY BALANCE (presentation only — no real payment wiring)
   ============================================ */
const PAYMENT_METHODS = [
  { icon: "📱", name: "GCash", desc: "Pay via GCash e-wallet" },
  { icon: "💠", name: "Maya", desc: "Pay via Maya (PayMaya) e-wallet or card" },
  { icon: "🚗", name: "GrabPay", desc: "Pay via your GrabPay wallet" },
  { icon: "🏦", name: "Online banking", desc: "BPI, BDO, UnionBank, Metrobank & more" },
  { icon: "💳", name: "Credit / Debit card", desc: "Visa, Mastercard, JCB" },
  { icon: "🏪", name: "Over-the-counter", desc: "7-Eleven, Cebuana Lhuillier, Bayad Center" },
  { icon: "🌐", name: "PayPal", desc: "Pay using your PayPal balance or card" },
];

let selectedPaymentMethod = null;

function openPaymentMethodsModal() {
  const student = data.students.find(s => s.id === currentUser.studentId);
  if (!student) return;
  const balance = Number(student.balance || 0);

  selectedPaymentMethod = null;
  document.getElementById("paymentBalanceFigure").textContent = `₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const grid = document.getElementById("paymentMethodGrid");
  grid.innerHTML = PAYMENT_METHODS.map(m => `
    <button type="button" class="payment-method-card" data-method="${m.name}">
      <span class="payment-method-icon">${m.icon}</span>
      <span class="payment-method-name">${m.name}</span>
      <span class="payment-method-desc">${m.desc}</span>
    </button>`).join("");

  const proceedBtn = document.getElementById("paymentMethodsProceed");
  proceedBtn.disabled = true;

  grid.querySelectorAll("[data-method]").forEach(card => {
    card.addEventListener("click", () => {
      grid.querySelectorAll(".payment-method-card").forEach(c => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      selectedPaymentMethod = card.dataset.method;
      proceedBtn.disabled = false;
    });
  });

  document.getElementById("paymentMethodsBackdrop").hidden = false;
}

document.getElementById("portalPayBtn").addEventListener("click", openPaymentMethodsModal);

document.getElementById("paymentMethodsProceed").addEventListener("click", () => {
  if (!selectedPaymentMethod) return;
  showToast(`This is a preview — ${selectedPaymentMethod} isn't connected yet.`, "warning");
  document.getElementById("paymentMethodsBackdrop").hidden = true;
});

wireSimpleModalClose("paymentMethodsBackdrop", "paymentMethodsClose", "paymentMethodsCancel");

/* ============================================
   ADMIN SETTINGS
   ============================================ */
function loadSettingsForm() {
  const schoolYearSelect = document.getElementById("set-schoolYear");
  const currentSchoolYear = computeCurrentSchoolYear();
  const currentStartYear = Number(currentSchoolYear.split("–")[0]);
  let options = "";
  for (let y = 1990; y <= 2050; y++) {
    const value = `${y}–${y + 1}`;
    options += `<option value="${value}" ${y > currentStartYear ? "disabled" : ""}>${value}</option>`;
  }
  schoolYearSelect.innerHTML = options;
  schoolYearSelect.disabled = false;
  schoolYearSelect.value = settings.schoolYear || currentSchoolYear;
  schoolYearSelect.title = "School years later than the current one can't be selected.";

  document.getElementById("set-period").value = settings.period;
  document.getElementById("set-scale").value = settings.scale;
  document.getElementById("set-passing").value = settings.passing;
  document.getElementById("sidebarYear").textContent = settings.schoolYear;
  document.getElementById("saveSettingsBtn").disabled = false;
}

document.getElementById("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  saveSettingsBtn.disabled = true;

  const schoolYear = document.getElementById("set-schoolYear").value;
  const passing = document.getElementById("set-passing").value;

  if (!schoolYear || passing === "") {
    showToast("Please fill in all required settings fields.", "warning");
    saveSettingsBtn.disabled = false;
    return;
  }

  const currentStartYear = Number(computeCurrentSchoolYear().split("–")[0]);
  const chosenStartYear = Number(schoolYear.split("–")[0]);
  if (chosenStartYear > currentStartYear) {
    showToast("You can't set the school year ahead of the current one.", "warning");
    saveSettingsBtn.disabled = false;
    loadSettingsForm();
    return;
  }

  settings.schoolYear = schoolYear;
  settings.period = document.getElementById("set-period").value;
  settings.scale = document.getElementById("set-scale").value;
  settings.passing = Number(passing);
  document.getElementById("sidebarYear").textContent = settings.schoolYear;

  const flash = document.getElementById("saveFlash");
  flash.hidden = false;
  logActivity("Updated admin settings.", "Admin", "Edit", settings.schoolName || "School settings");
  showToast("Settings saved.", "success");
  supabaseClient.from("settings").update({
    school_year: settings.schoolYear,
    period: settings.period,
    scale: settings.scale,
    passing: settings.passing,
  }).eq("id", true).then(({ error }) => {
    if (error) { console.error(error); showToast("Couldn't save settings to the database.", "error"); }
  });
  // A successful save locks the button grey — leaving Settings and coming
  // back (loadSettingsForm, called from the nav click) is what resets it,
  // not a timer.
  setTimeout(() => { flash.hidden = true; }, 2000);
});

document.getElementById("resetDataBtn").addEventListener("click", () => {
  if (confirm("Reload all lists from the database? Any unsaved changes on screen will be discarded.")) {
    location.reload();
  }
});

/* ============================================
   INIT
   ============================================ */
(async function init() {
  const user = await requireAuth();
  if (!user) return; // requireAuth() already redirected to index.html
  await loadAllData();
  loadSettingsForm();
  renderAll();
  renderLogs();
  applyRoleRestrictions();
})();