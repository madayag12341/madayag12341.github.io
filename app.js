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
  return { id: r.id, name: r.name, email: r.email, contact: r.contact, status: r.status, username: r.username, position: r.position || "" };
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
      studentsViewTeachersPage: r.can_view_teachers_page,
    },
    grades: {},
  };
}
function rowToAdmin(r) {
  return { id: r.id, name: r.name, role: r.role, username: r.username, status: r.status };
}

function teacherToRow(t) {
  return { name: t.name, email: t.email, contact: t.contact || null, status: t.status, username: t.username || null, position: t.position || null };
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
    can_view_teachers_page: s.permissions ? s.permissions.studentsViewTeachersPage : true,
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
      { key: "name", label: "Full name", type: "text", required: true },
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
function buildStudentFullName(firstName, middleName, lastName) {
  const first = (firstName || "").trim();
  const middle = (middleName || "").trim();
  const last = (lastName || "").trim();
  const middlePart = middle ? ` ${middle.charAt(0).toUpperCase()}.` : "";
  return `${first}${middlePart} ${last}`.replace(/\s+/g, " ").trim();
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
function advisoryCell(teacherId) {
  const section = data.sections.find(s => s.adviserId == teacherId);
  return section ? section.name : `<span class="advisory-none">None assigned</span>`;
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
  const finals = Object.values(student.grades || {}).map(computeFinalRating);
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
    <path d="M14 2v6h6"></path>
    <path d="M9 13h6"></path>
    <path d="M9 17h6"></path>
  </svg>`,
};

function isSectionAdviser(sectionId) {
  const section = data.sections.find(s => s.id === sectionId);
  return !!section && !!currentUser && section.adviserId === currentUser.teacherId;
}

function buildRowActions(entityKey, row) {
  const role = currentUser ? currentUser.role : "admin";
  const parts = [];

  if (entityKey === "students") {
    parts.push(`<button class="icon-btn icon-btn--grades" data-grades="${row.id}" title="Grading card sheet" aria-label="Grading card sheet">${ROW_ICONS.grades}</button>`);
    const canEdit = role === "admin" || (role === "teacher" && isSectionAdviser(row.sectionId));
    if (canEdit) {
      parts.push(`<button class="icon-btn" data-edit="${entityKey}:${row.id}" title="Edit" aria-label="Edit">${ROW_ICONS.edit}</button>`);
    }
    if (role === "admin") {
      parts.push(`<button class="icon-btn link-delete" data-delete="${entityKey}:${row.id}" title="Delete" aria-label="Delete">${ROW_ICONS.delete}</button>`);
    }
    return parts.length ? parts.join("") : null;
  }

  // Teachers / subjects / sections: only admin may edit or delete.
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
  return data.students.filter(s => {
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
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("is-active"));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("is-active"));
  const navBtn = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  const page = document.getElementById(`page-${pageName}`);
  if (navBtn) navBtn.classList.add("is-active");
  if (page) page.classList.add("is-active");
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => activateNavPage(btn.dataset.page));
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

/* ---- lock the UI down to what this role is allowed to see/do ---- */
function applyRoleRestrictions() {
  const accountLabel = document.getElementById("accountLabel");
  accountLabel.textContent = `${currentUser.username} · ${currentUser.role}`;

  const teachersNav = document.querySelector('.nav-item[data-page="teachers"]');
  const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
  const studentsNav = document.querySelector('.nav-item[data-page="students"]');
  const subjectsNav = document.querySelector('.nav-item[data-page="subjects"]');
  const sectionsNav = document.querySelector('.nav-item[data-page="sections"]');
  const portalNav = document.getElementById("navPortal");

  if (currentUser.role === "admin") {
    return; // full access, nothing to hide
  }

  if (currentUser.role === "teacher") {
    teachersNav.hidden = true;
    settingsNav.hidden = true;
    document.querySelectorAll("[data-add]").forEach(btn => { btn.hidden = true; });
    return;
  }

  if (currentUser.role === "student") {
    teachersNav.hidden = !data.teachers.length;
    settingsNav.hidden = true;
    studentsNav.hidden = true;
    subjectsNav.hidden = true;
    sectionsNav.hidden = true;
    portalNav.hidden = false;
    document.querySelectorAll("[data-add]").forEach(btn => { btn.hidden = true; });
    renderStudentPortal();
    activateNavPage("portal");
  }
}

function renderStudentPortal() {
  const student = data.students.find(s => s.id === currentUser.studentId);
  if (!student) return;

  document.getElementById("portalStudentName").textContent = student.name;
  document.getElementById("portalStudentMeta").textContent = `${student.studentNo} · ${student.gradeLevel}`;
  document.getElementById("portalBalance").textContent = `₱${Number(student.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const subjectsTbody = document.querySelector("#portalSubjectsTable tbody");
  const subjectsEmpty = document.getElementById("portalSubjectsEmpty");
  if (student.permissions.studentsViewSubjects && data.subjects.length) {
    subjectsEmpty.hidden = true;
    subjectsTbody.innerHTML = data.subjects.map(s => `<tr><td>${s.code}</td><td>${s.name}</td><td>${s.units}</td></tr>`).join("");
  } else {
    subjectsEmpty.hidden = false;
    subjectsTbody.innerHTML = "";
  }

  const gradesTbody = document.querySelector("#portalGradesTable tbody");
  const gradesEmpty = document.getElementById("portalGradesEmpty");
  const subjectIds = Object.keys(student.grades || {});
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
    if (field.key.endsWith("Id") && value !== "") value = Number(value);
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

  if (entityKey === "students") {
    draft.name = buildStudentFullName(draft.firstName, draft.middleName, draft.lastName);

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
    const duplicateSection = data.sections.find(s => s.id !== draft.id && (s.name || "").trim().toLowerCase() === normalizedName);
    if (duplicateSection) {
      showToast("That section name is already used, even in another grade level.", "error");
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
  confirmBackdrop.hidden = false;
}

document.getElementById("confirmCancel").addEventListener("click", () => {
  confirmBackdrop.hidden = true;
  pendingDelete = null;
});

document.getElementById("confirmDelete").addEventListener("click", () => {
  if (!pendingDelete) return;
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

let currentLoadTeacherId = null;

function openLoadModal(teacherId) {
  currentLoadTeacherId = teacherId;
  const teacher = data.teachers.find(t => t.id === teacherId);
  loadTitle.textContent = `Subject load — ${teacher.name}`;
  renderLoadModal();
  loadBackdrop.hidden = false;
}

function renderLoadModal() {
  const assigned = data.subjects.filter(s => (s.teacherIds || []).includes(currentLoadTeacherId));
  const unassigned = data.subjects.filter(s => !(s.teacherIds || []).includes(currentLoadTeacherId));

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

  loadAddSelect.innerHTML = unassigned.length
    ? unassigned.map(s => `<option value="${s.id}">${s.code} — ${s.name}</option>`).join("")
    : `<option value="">No other subjects available</option>`;
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

function gradeCellHtml(quarterLabel, quarterKey, value) {
  const locked = isQuarterLocked(quarterLabel);
  const displayValue = typeof value === "number" ? value : "";
  return `<input type="number" class="grade-input" min="0" max="100" step="1"
    data-quarter="${quarterKey}" value="${displayValue}" placeholder="—"
    ${locked ? `disabled title="Locked — ${quarterLabel} has already passed."` : ""}>`;
}

function openGradesModal(studentId) {
  currentGradesStudentId = studentId;
  const student = data.students.find(s => s.id === studentId);
  gradesTitle.textContent = `Grading card sheet — ${student.name}`;
  gradesPeriodNote.textContent = `Currently on ${settings.period}. Earlier quarters are locked and can no longer be edited.`;

  const subjectIds = Object.keys(student.grades || {});

  gradesTableBody.innerHTML = subjectIds.map(idStr => {
    const subjectId = Number(idStr);
    const subject = data.subjects.find(s => s.id === subjectId);
    const g = student.grades[idStr];
    const final = computeFinalRating(g);
    return `
      <tr data-subject-row="${subjectId}">
        <td>${subject ? `${subject.code} — ${subject.name}` : "Unknown subject"}</td>
        ${QUARTERS.map(q => `<td>${gradeCellHtml(q.label, q.key, g[q.key])}</td>`).join("")}
        <td class="final-rating-cell">${fmtGrade(final)}</td>
      </tr>`;
  }).join("") + `
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
  setTimeout(() => { saveBtn.disabled = false; }, 400);
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
const TEACHER_POSITIONS = ["Dean", "Vice Principal", "Guidance Counselor", "Disciplinary Officer"];

function renderTeacherAccountsModal() {
  const tbody = document.querySelector("#teacherAccountsTable tbody");
  tbody.innerHTML = data.teachers.length ? data.teachers.map(t => `
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
    </tr>`).join("") : `<tr><td colspan="4">No teacher accounts yet.</td></tr>`;

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

const STUDENT_PERMS = [
  { key: "studentsViewSubjects", label: "View the subjects assigned to them" },
  { key: "studentsViewGradingCard", label: "View their own grading card" },
  { key: "studentsViewTeachersPage", label: "View the Teachers page" },
];
const STUDENT_PERM_COLUMNS = {
  studentsViewSubjects: "can_view_subjects",
  studentsViewGradingCard: "can_view_grading_card",
  studentsViewTeachersPage: "can_view_teachers_page",
};

function openStudentCredentialsModal(id) {
  const student = data.students.find(s => s.id === id);
  if (!student) return;
  if (!student.permissions) {
    student.permissions = { studentsViewSubjects: true, studentsViewGradingCard: true, studentsViewTeachersPage: true };
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
  setTimeout(() => {
    flash.hidden = true;
    saveSettingsBtn.disabled = false;
  }, 2000);
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
