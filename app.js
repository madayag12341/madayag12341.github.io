/* ============================================
   SAMPLE DATA
   In-memory only for this phase — resets on page
   reload. Swap this for localStorage or a real
   backend in a later phase.
   ============================================ */
   let nextId = 100;
   const newId = () => nextId++;
   
   /* ---- name pools + small helpers used only to seed sample records ---- */
   function slugify(str) {
     return str.toLowerCase().replace(/[^a-z]/g, "");
   }
   const usedUsernames = new Set();
   function usernameFor(fullName) {
     const parts = fullName.split(" ");
     const base = slugify(parts[0][0] + parts[parts.length - 1]);
     let candidate = base;
     let n = 2;
     while (usedUsernames.has(candidate)) {
       candidate = `${base}${n}`;
       n++;
     }
     usedUsernames.add(candidate);
     return candidate;
   }
   function phoneFor(seed) {
     const mid = String(200 + (seed * 37) % 800).padStart(3, "0");
     const last = String(1000 + (seed * 91) % 9000).padStart(4, "0");
     return `09${(10 + (seed % 8))}-${mid}-${last}`;
   }

   const TEACHER_FIRST_NAMES = [
     "Marisol", "Daniel", "Priya", "Louie", "Ramon", "Cecilia", "Arturo", "Beatriz",
     "Ernesto", "Felicia", "Gregorio", "Herminia", "Ignacio", "Josefina", "Leandro",
     "Milagros", "Norberto", "Ofelia", "Pablo", "Remedios",
   ];
   const TEACHER_LAST_NAMES = [
     "Andrade", "Reyes", "Kapoor", "Fernandez", "Aguilar", "Belmonte", "Concepcion",
     "Delgado", "Espino", "Feliciano", "Guanzon", "Hilario", "Isip", "Jimenez",
     "Katigbak", "Lozada", "Medina", "Nazario", "Orosa", "Panganiban",
   ];

   const STUDENT_FIRST_NAMES = [
     "Ava", "Noah", "Isla", "Mateo", "Lian", "Sofia", "Diego", "Mika", "Rafael", "Elena",
     "Gabriel", "Camille", "Joshua", "Andrea", "Marco", "Bianca", "Enzo", "Nadia", "Julian",
     "Theresa", "Xander", "Lourdes", "Rico", "Angelica", "Miguel", "Faith", "Julio",
     "Charmaine", "Adrian", "Kristine", "Paolo", "Michelle", "Vince", "Angela", "Carlo",
     "Patricia", "Nathaniel", "Cassandra", "Emmanuel", "Bea", "Christian", "Danica",
     "Jerome", "Alyssa", "Kevin", "Trisha", "Aaron", "Jasmine", "Ryan", "Kimberly",
   ];
   const STUDENT_LAST_NAMES = [
     "Bernal", "Villanueva", "Domingo", "Cruz", "Ocampo", "Santos", "Garcia", "Torres",
     "Mercado", "Aquino", "Bautista", "Castillo", "De Leon", "Gonzales", "Herrera",
     "Ibarra", "Javier", "Lacson", "Manalo", "Navarro", "Ongsiako", "Pineda", "Quimpo",
     "Ramos", "Salazar", "Tolentino", "Uy", "Valdez",
   ];

   const SECTION_NAME_POOL = [
     "Narra", "Molave", "Acacia", "Mahogany", "Ipil", "Yakal", "Kamagong", "Banaba",
     "Kalachuchi", "Sampaguita", "Ilang-Ilang", "Camia", "Waling-Waling", "Champaca",
     "Dapdap", "Tanguile",
   ];
   const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
   // Typical starting age per grade level, used only to generate plausible
   // sample birthdates (e.g. a Grade 7 student is usually ~12–13 years old).
   const GRADE_BIRTH_YEAR_BASE = { "Grade 7": 2014, "Grade 8": 2013, "Grade 9": 2012, "Grade 10": 2011 };
   const SECTIONS_PER_GRADE = { "Grade 7": 4, "Grade 8": 4, "Grade 9": 3, "Grade 10": 4 };
   const STUDENTS_PER_SECTION = 10;

   let data = { teachers: [], students: [], subjects: [], sections: [], admins: [] };

   /* ---- 20 teachers ---- */
   for (let i = 0; i < 20; i++) {
     const first = TEACHER_FIRST_NAMES[i];
     const last = TEACHER_LAST_NAMES[i];
     const name = `${first} ${last}`;
     data.teachers.push({
       id: newId(),
       name,
       email: `${slugify(first[0] + last)}@meridian.edu`,
       contact: phoneFor(i),
       status: (i > 0 && i % 9 === 0) ? "Inactive" : "Active",
       username: usernameFor(name),
       password: generatePassword(),
       adminAccess: false,
     });
   }

   /* ---- 15 sections (3-4 per grade level) ---- */
   let sectionPoolCursor = 0;
   let adviserCursor = 0;
   GRADE_LEVELS.forEach(grade => {
     for (let i = 0; i < SECTIONS_PER_GRADE[grade]; i++) {
       const treeName = SECTION_NAME_POOL[sectionPoolCursor % SECTION_NAME_POOL.length];
       sectionPoolCursor++;
       const adviser = data.teachers[adviserCursor % data.teachers.length];
       adviserCursor++;
       data.sections.push({
         id: newId(),
         name: `${grade} – ${treeName}`,
         gradeLevel: grade,
         adviserId: adviser.id,
       });
     }
   });

   /* ---- subjects: full DepEd Junior High School core subject list, every grade ---- */
   const JHS_CORE_SUBJECTS = [
     { prefix: "FIL", subject: "Filipino" },
     { prefix: "ENG", subject: "English" },
     { prefix: "MTH", subject: "Mathematics" },
     { prefix: "SCI", subject: "Science" },
     { prefix: "AP", subject: "Araling Panlipunan" },
     { prefix: "ESP", subject: "Edukasyon sa Pagpapakatao" },
     { prefix: "MAPEH", subject: "MAPEH" },
     { prefix: "TLE", subject: "Technology and Livelihood Education" },
   ];
   GRADE_LEVELS.forEach((grade, gi) => {
     const gradeNum = 7 + gi;
     JHS_CORE_SUBJECTS.forEach(def => {
       data.subjects.push({
         id: newId(),
         code: `${def.prefix}-${gradeNum}01`,
         name: `${def.subject} ${gradeNum}`,
         units: 1,
         gradeLevel: grade,
         teacherIds: [],
       });
     });
   });
   data.subjects.forEach((subject, i) => {
     subject.teacherIds = [data.teachers[i % data.teachers.length].id];
   });

   /* ---- 150 students, ~10 per section ---- */
   let studentSeq = 0;
   data.sections.forEach(section => {
     for (let i = 0; i < STUDENTS_PER_SECTION; i++) {
       const first = STUDENT_FIRST_NAMES[studentSeq % STUDENT_FIRST_NAMES.length];
       const last = STUDENT_LAST_NAMES[(studentSeq * 7 + Math.floor(studentSeq / STUDENT_FIRST_NAMES.length)) % STUDENT_LAST_NAMES.length];
       const middle = STUDENT_LAST_NAMES[(studentSeq * 11 + 5) % STUDENT_LAST_NAMES.length];
       const name = buildStudentFullName(first, middle, last);
       const baseYear = GRADE_BIRTH_YEAR_BASE[section.gradeLevel] - (studentSeq % 2);
       const birthMonth = String(1 + (studentSeq * 7) % 12).padStart(2, "0");
       const birthDay = String(1 + (studentSeq * 13) % 28).padStart(2, "0");
       const birthDate = `${baseYear}-${birthMonth}-${birthDay}`;
       const baseQ1 = 74 + (studentSeq % 21);
       const baseQ2 = baseQ1 + ((studentSeq % 5) - 2);
       data.students.push({
         id: newId(),
         studentNo: generateStudentNo(first, middle, last, birthDate),
         firstName: first,
         middleName: middle,
         lastName: last,
         name,
         birthDate,
         gradeLevel: section.gradeLevel,
         sectionId: section.id,
         status: (studentSeq % 13 === 0) ? "Inactive" : "Active",
         username: usernameFor(name),
         password: generatePassword(),
         _baseQ1: baseQ1,
         _baseQ2: baseQ2,
       });
       studentSeq++;
     }
   });

   data.admins = [
     { id: newId(), name: "Corazon Villareal", role: "Principal", username: "cvillareal", password: "Ht8@nQe1Zm", status: "Active" },
     { id: newId(), name: "Bien Santos", role: "Administrator", username: "bsantos", password: "Lp4#wRc9Ty", status: "Active" },
   ];

   // Seed each student's per-subject grades from their subjects' grade level.
   // The school is currently on 2nd Grading, so only Q1 and Q2 are filled in.
   function subjectsForGradeLevel(level) {
     return data.subjects.filter(s => s.gradeLevel === level);
   }
   function clampGrade(n) {
     return Math.max(60, Math.min(100, Math.round(n)));
   }
   
   const subjectOffsets = [0, -3, 2]; // slight variation across a student's subjects
   
   data.students.forEach(student => {
     const subs = subjectsForGradeLevel(student.gradeLevel);
     student.grades = {};
     subs.forEach((sub, i) => {
       const offset = subjectOffsets[i % subjectOffsets.length];
       student.grades[sub.id] = {
         q1: clampGrade(student._baseQ1 + offset),
         q2: clampGrade(student._baseQ2 + offset),
         q3: null,
         q4: null,
       };
     });
     delete student._baseQ1;
     delete student._baseQ2;
   });
   
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
   
   // Role permissions, managed from the admin/principal accounts modal.
   let permissions = {
     studentsViewSubjects: true,
     studentsViewGradingCard: true,
     studentsViewTeachersPage: true,
   };
   
   let activityLog = [
     { timestamp: new Date(), what: "Sample data loaded for this session.", category: "Admin", action: "Add", name: "Sample data" },
   ];
   
   function logActivity(text, category, action, name) {
     activityLog.unshift({ timestamp: new Date(), what: text, category, action, name });
     renderLogs();
   }
   
   /* ============================================
      TOASTS
      Small, auto-dismissing confirmation shown top-right
      whenever something is saved.
      ============================================ */
   const toastContainer = document.getElementById("toastContainer");
   
   function showToast(message, type = "success") {
     const toast = document.createElement("div");
     toast.className = `toast toast--${type}`;
     toast.textContent = message;
     toastContainer.appendChild(toast);
   
     // Next frame, so the transition from the initial (hidden) state actually animates in.
     requestAnimationFrame(() => toast.classList.add("is-visible"));
   
     setTimeout(() => {
       toast.classList.remove("is-visible");
       toast.classList.add("is-leaving");
       toast.addEventListener("transitionend", () => toast.remove(), { once: true });
     }, 2500);
   }
   
   /* ============================================
      ENTITY CONFIG
      Describes the fields + table columns for each
      entity so add/edit/view/delete can share one
      generic modal and renderer.
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
   // Teachers not already assigned to teach this exact subject (by name) — so
   // adding another instance of the same subject (e.g. a second section)
   // can't offer a teacher who's already on it.
   function availableTeacherOptionsForSubject(name, excludeId = null) {
     const takenBy = new Set(
       data.subjects.filter(s => s.name === name && s.id !== excludeId).flatMap(s => s.teacherIds || [])
     );
     const pool = data.teachers.filter(t => !takenBy.has(t.id));
     return [{ value: "", label: "— none —" }, ...pool.map(t => ({ value: t.id, label: t.name }))];
   }
   // Teachers who aren't already the adviser of some other section — so the
   // Adviser dropdown on Add/Edit Section doesn't offer someone already
   // spoken for. `keepId` (the section being edited, if any) makes sure its
   // own current adviser still shows up in its own dropdown.
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
   // Philippine naming convention: First name, middle-initial (from the middle
   // name), then last name — e.g. "Ava R. Bernal".
   function buildStudentFullName(firstName, middleName, lastName) {
     const first = (firstName || "").trim();
     const middle = (middleName || "").trim();
     const last = (lastName || "").trim();
     const middlePart = middle ? ` ${middle.charAt(0).toUpperCase()}.` : "";
     return `${first}${middlePart} ${last}`.replace(/\s+/g, " ").trim();
   }
   // Student numbers are built from the student's own initials (first + middle +
   // last) plus their birthdate — e.g. Ava R. Bernal born 2014-01-15 becomes
   // "ARB-20140115-01". If that exact number is already taken (e.g. another
   // student shares the same initials and birthdate), the sequence suffix
   // increments until a free one is found — so generated numbers can never collide.
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
   // Duplicate = same first, middle, AND last name, AND same birthdate.
   function isDuplicateStudent(a, b) {
     return normalizeNamePart(a.firstName) === normalizeNamePart(b.firstName) &&
       normalizeNamePart(a.middleName) === normalizeNamePart(b.middleName) &&
       normalizeNamePart(a.lastName) === normalizeNamePart(b.lastName) &&
       (a.birthDate || "") === (b.birthDate || "");
   }
   // When gradeLevel is passed, only subject names that belong to that grade are
   // listed (e.g. picking "Grade 7" narrows this to English 7, Math 7, etc.).
   // With no gradeLevel, every subject name across Grade 7–10 is shown.
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
   // Section-name choices for a given grade level: existing tree-name slots already
   // used by OTHER sections in that grade are excluded (no duplicates); the record's
   // own current name (if editing) is always kept available so it stays selected.
   function sectionNameOptionsForGrade(gradeLevel, currentName) {
     const usedNames = new Set(
       data.sections.filter(s => s.gradeLevel === gradeLevel && s.name !== currentName).map(s => s.name)
     );
     const names = SECTION_NAME_POOL.map(n => `${gradeLevel} – ${n}`).filter(n => !usedNames.has(n));
     if (currentName && currentName.startsWith(gradeLevel) && !names.includes(currentName)) {
       names.unshift(currentName);
     }
     // Safety net: if every tree name in the pool is already taken for this
     // grade, still guarantee at least one usable suggestion so the field is
     // never left blank, for every grade level.
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
   // The real, already-existing sections for a grade level — used when EDITING,
   // so picking a grade lists the actual sections assigned to it.
   function existingSectionNamesForGrade(gradeLevel) {
     return data.sections.filter(s => s.gradeLevel === gradeLevel).map(s => ({ value: s.name, label: s.name }));
   }
   // All sections sorted by grade level then name — used to populate the
   // Sections page's "All sections" filter dropdown.
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
   
   /* Small inline icon set used for row actions — pen (edit), trash can
      (delete), and a document/paper icon (grading card sheet). */
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

   function buildRowActions(entityKey, row) {
     const parts = [];
     if (entityKey === "students") {
       parts.push(`<button class="icon-btn icon-btn--grades" data-grades="${row.id}" title="Grading card sheet" aria-label="Grading card sheet">${ROW_ICONS.grades}</button>`);
     }
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
   
   // Which entity types map to which log category, for the generic
   // add/edit/delete flows shared by teachers, students, subjects and sections.
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
   document.querySelectorAll(".nav-item").forEach(btn => {
     btn.addEventListener("click", () => {
       document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("is-active"));
       document.querySelectorAll(".page").forEach(p => p.classList.remove("is-active"));
       btn.classList.add("is-active");
       document.getElementById(`page-${btn.dataset.page}`).classList.add("is-active");
     });
   });
   
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
   
     // Editing a subject always starts from a blank slate — picking the subject
     // name (or grade level) is what fills in the rest, rather than the record's
     // existing values showing up pre-filled.
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
   
       // Picking a grade level narrows the subject-name list down to just that
       // grade's subjects (e.g. Grade 7 → English 7, Math 7, …).
       gradeSelect.addEventListener("change", () => {
         const opts = subjectNameOptions(gradeSelect.value || null);
         nameSelect.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
         clearDerivedFields();
       });
   
       // Picking a subject name fills in everything else: the locked code and
       // units, and the matching grade level. In add mode, the teacher list
       // narrows to just teachers not already assigned to this subject, since
       // this is adding another instance of it (e.g. a second section) —
       // whoever's already on it shouldn't be offered again.
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
   
       // If what's currently typed exactly matches another already-existing
       // section for this grade, lock the adviser to that section's adviser
       // (renaming/re-picking a section shouldn't silently reassign advisers).
       function syncAdviser() {
         const nameInput = nameWrap.querySelector('[data-key="name"]');
         const match = findSectionByGradeAndName(gradeSelect.value, nameInput.value.trim());
         if (match && (!row || match.id !== row.id)) lockAdviser(match.adviserId); else unlockAdviser();
       }
   
       // A single text field with datalist suggestions — the admin can pick a
       // suggested name or type any custom name directly, no separate
       // "Rename"/"Choose existing" toggle needed. In add mode, it starts
       // pre-filled with the first suggested name (still fully editable).
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
   
       // Birthdate can't be picked until first and last name are filled in —
       // the generated student number is built from those names' initials.
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
           // Keep the generated number's initials in sync if a birthdate is already set.
           if (birthDateInput.value) refreshStudentNo();
         });
       });
   
       // Picking a grade level narrows the section list down to just that
       // grade's sections. If the currently selected section doesn't belong to
       // the new grade, it naturally resets to "— none —".
       gradeSelect.addEventListener("change", () => {
         const currentSection = sectionSelect.value;
         const opts = sectionOptionsForGrade(gradeSelect.value || null);
         sectionSelect.innerHTML = opts.map(o =>
           `<option value="${o.value}" ${String(o.value) === String(currentSection) ? "selected" : ""}>${o.label}</option>`
         ).join("");
       });
   
       // Picking a birthdate auto-generates the student number from the
       // student's initials + birthdate, guaranteed not to collide with any
       // existing student's number.
       birthDateInput.addEventListener("change", refreshStudentNo);
     }
   }
   
   function closeModal() {
     modalBackdrop.hidden = true;
     modalForm.reset();
   }
   
   modalForm.addEventListener("submit", (e) => {
     e.preventDefault();
     modalSubmit.disabled = true; // one click per instance — re-enabled below on validation failure, or on next openModal() call after a successful save
   
     const { entityKey, mode, id } = modalState;
     const config = entityConfig[entityKey];
     const existingRecord = mode === "edit" ? data[entityKey].find(r => r.id == id) : null;
     // Build into a fresh draft object first (never the live record) so that if
     // validation fails below, nothing already on screen/in data gets mutated.
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
   
     // Generic required-field check (native browser validation is disabled on
     // this form so every error/warning can be shown as a toast instead).
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
   
       // Safety net: if the generated/typed student number somehow collides
       // with another student's, silently regenerate a fresh, unique one.
       const duplicateNo = data.students.find(s => s.id !== draft.id && s.studentNo === draft.studentNo);
       if (duplicateNo) {
         draft.studentNo = generateStudentNo(draft.firstName, draft.middleName, draft.lastName, draft.birthDate, draft.id);
       }
     }
   
     if (entityKey === "subjects") {
       // Same code showing up twice is only a real duplicate if it's also the
       // same teacher — a different teacher on the same subject is a
       // legitimate second assignment (e.g. two sections of the same subject).
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
       // Section names must be unique across the WHOLE school, not just within
       // their own grade level — no two sections, in any grade, may share a name.
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
   
     renderAll();
     closeModal();
     // modalSubmit stays disabled (greyed out) — openModal() re-enables it the
     // next time this form is opened for a new add/edit instance.
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
   
   // Once the school has moved on to a later quarter, earlier quarters'
   // grades are locked and can no longer be edited.
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
   
   // Live-update a row's Final rating as its own quarter inputs change (the
   // General average only gets recomputed on Save, once everything commits).
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
     openGradesModal(currentGradesStudentId); // refresh with recomputed values
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
       // Returning to "All sections" also resets the grade level filter back to "all".
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
     tbody.innerHTML = data.teachers.length ? data.teachers.map(t => `
       <tr>
         <td>${t.name}</td>
         <td>${t.username || "—"}</td>
         <td>${statusTag(t.status)}</td>
         <td>
           <label class="checkbox-option">
             <input type="checkbox" data-admin-access="${t.id}" ${t.adminAccess ? "checked" : ""}>
             <span>Administrator access</span>
           </label>
         </td>
       </tr>`).join("") : `<tr><td colspan="4">No teacher accounts yet.</td></tr>`;
   
     tbody.querySelectorAll("[data-admin-access]").forEach(cb => {
       cb.addEventListener("change", (e) => {
         const teacher = data.teachers.find(t => t.id === Number(e.target.dataset.adminAccess));
         teacher.adminAccess = e.target.checked;
         logActivity(`${e.target.checked ? "Granted" : "Removed"} administrator access for ${teacher.name}.`, "Admin", "Edit", teacher.name);
       });
     });
   }
   
   function renderStudentAccountsModal() {
     const list = document.getElementById("studentPermissionsList");
     const perms = [
       { key: "studentsViewSubjects", label: "View the subjects assigned to them" },
       { key: "studentsViewGradingCard", label: "View their own grading card" },
       { key: "studentsViewTeachersPage", label: "View the Teachers page" },
     ];
     list.innerHTML = perms.map(p => `
       <label class="checkbox-option">
         <input type="checkbox" data-student-perm="${p.key}" ${permissions[p.key] ? "checked" : ""}>
         <span>${p.label}</span>
       </label>`).join("");
   
     list.querySelectorAll("[data-student-perm]").forEach(cb => {
       cb.addEventListener("change", (e) => {
         const key = e.target.dataset.studentPerm;
         permissions[key] = e.target.checked;
         const label = perms.find(p => p.key === key).label;
         logActivity(`${e.target.checked ? "Allowed" : "Removed"} student access: ${label}.`, "Admin", "Edit", label);
       });
     });
   
     const tbody = document.querySelector("#studentAccountsTable tbody");
     tbody.innerHTML = data.students.length ? data.students.map(s => `
       <tr>
         <td>${s.name}</td>
         <td>${s.studentNo}</td>
         <td>${s.gradeLevel}</td>
         <td>${statusTag(s.status)}</td>
       </tr>`).join("") : `<tr><td colspan="4">No student accounts yet.</td></tr>`;
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
   
   /* ============================================
      ADMIN SETTINGS
      ============================================ */
   function loadSettingsForm() {
     const schoolYearSelect = document.getElementById("set-schoolYear");
     const currentSchoolYear = computeCurrentSchoolYear();
     let options = "";
     for (let y = 1990; y <= 2050; y++) {
       options += `<option value="${y}–${y + 1}">${y}–${y + 1}</option>`;
     }
     schoolYearSelect.innerHTML = options;
     // Locked to whatever school year today's date actually falls in — the
     // full 1990–2050 range exists in the list, but it can't be changed away
     // from the current one.
     schoolYearSelect.value = currentSchoolYear;
     schoolYearSelect.title = "School year is set automatically from today's date and can't be changed.";
     settings.schoolYear = currentSchoolYear;
   
     document.getElementById("set-period").value = settings.period;
     document.getElementById("set-scale").value = settings.scale;
     document.getElementById("set-passing").value = settings.passing;
     document.getElementById("sidebarYear").textContent = settings.schoolYear;
   }
   
   document.getElementById("settingsForm").addEventListener("submit", (e) => {
     e.preventDefault();
     const saveSettingsBtn = document.getElementById("saveSettingsBtn");
     saveSettingsBtn.disabled = true;
   
     // School year is locked to today's date, not admin-editable, so it's
     // always recomputed fresh here rather than read from the (disabled) select.
     const schoolYear = computeCurrentSchoolYear();
     const passing = document.getElementById("set-passing").value;
   
     if (passing === "") {
       showToast("Please fill in all required settings fields.", "warning");
       saveSettingsBtn.disabled = false;
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
     setTimeout(() => {
       flash.hidden = true;
       saveSettingsBtn.disabled = false; // reactivate for the next save instance
     }, 2000);
   });
   
   document.getElementById("resetDataBtn").addEventListener("click", () => {
     if (confirm("Reset all lists back to sample data? This can't be undone.")) {
       location.reload();
     }
   });
   
   /* ============================================
      INIT
      ============================================ */
   loadSettingsForm();
   renderAll();
