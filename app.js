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
       const name = `${first} ${last}`;
       const baseQ1 = 74 + (studentSeq % 21);
       const baseQ2 = baseQ1 + ((studentSeq % 5) - 2);
       data.students.push({
         id: newId(),
         studentNo: `MG-2026-${String(1 + studentSeq).padStart(4, "0")}`,
         name,
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
   
   let settings = {
     schoolName: "Meridian Grade School",
     schoolYear: "2026–2027",
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
         { key: "studentNo", label: "Student no.", type: "text", required: true },
         { key: "name", label: "Full name", type: "text", required: true },
         { key: "gradeLevel", label: "Grade level", type: "select", options: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
         { key: "sectionId", label: "Section", type: "select", options: () => sectionOptions() },
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
         { key: "name", label: "Section name", type: "select", options: () => sectionNameOptionsForGrade("Grade 7") },
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
   function sectionOptions() {
     return [{ value: "", label: "— none —" }, ...data.sections.map(s => ({ value: s.id, label: s.name }))];
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
   
     const unitsSelect = document.getElementById("subjectFilterUnits");
     const currentUnits = unitsSelect.value;
     const uniqueUnits = [...new Set(data.subjects.map(s => s.units))].sort((a, b) => a - b);
     unitsSelect.innerHTML = `<option value="all">All units</option>` +
       uniqueUnits.map(u => `<option value="${u}">${u}</option>`).join("");
     const unitsStillExists = currentUnits === "all" || uniqueUnits.some(u => String(u) === currentUnits);
     unitsSelect.value = unitsStillExists ? currentUnits : "all";
     if (!unitsStillExists) subjectFilter.units = "all";
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
   
   let subjectFilter = { term: "", gradeLevel: "all", teacherId: "all", units: "all" };
   
   function getFilteredSubjects() {
     const term = subjectFilter.term.trim().toLowerCase();
     return data.subjects.filter(s => {
       const matchesTerm = !term || s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term);
       const matchesGrade = subjectFilter.gradeLevel === "all" || s.gradeLevel === subjectFilter.gradeLevel;
       const matchesUnits = subjectFilter.units === "all" || String(s.units) === String(subjectFilter.units);
       const matchesTeacher = subjectFilter.teacherId === "all" ||
         (subjectFilter.teacherId === "none" ? !(s.teacherIds && s.teacherIds.length) : (s.teacherIds || []).includes(Number(subjectFilter.teacherId)));
       return matchesTerm && matchesGrade && matchesUnits && matchesTeacher;
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
   
   function buildRowActions(entityKey, row) {
     if (entityKey === "subjects" || entityKey === "sections") return null; // managed via the header buttons above the table
     const parts = [];
     if (entityKey === "students") {
       parts.push(`<button data-grades="${row.id}">Grading card sheet</button>`);
     }
     parts.push(`<button data-edit="${entityKey}:${row.id}">Edit</button>`);
     parts.push(`<button class="link-delete" data-delete="${entityKey}:${row.id}">Delete</button>`);
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
       // units, the matching grade level, and whichever single teacher currently
       // teaches that subject.
       nameSelect.addEventListener("change", () => {
         const defaults = subjectDefaultsForName(nameSelect.value);
         if (!defaults) { clearDerivedFields(); return; }
         codeInput.value = defaults.code;
         unitsInput.value = defaults.units;
         gradeSelect.value = defaults.gradeLevel;
         teacherSelect.value = (defaults.teacherIds && defaults.teacherIds[0] != null) ? String(defaults.teacherIds[0]) : "";
       });
     }
   
     if (entityKey === "sections" && mode !== "view") {
       const gradeSelect = modalFields.querySelector('[data-key="gradeLevel"]');
       const nameWrap = modalFields.querySelector('[data-field-key="name"]');
       const adviserWrap = modalFields.querySelector('[data-field-key="adviserId"]');
   
       // "pick": choose among sections that already exist for the grade (lets the
       // adviser auto-fill). "custom": free-text rename of *this* section — only
       // offered in edit mode.
       let nameMode = "pick";
   
       function lockAdviser(adviserId) {
         adviserWrap.innerHTML = `<span>Adviser</span>
           <input type="text" value="${teacherName(adviserId)}" disabled>
           <input type="hidden" data-key="adviserId" value="${adviserId ?? ''}">`;
       }
       function unlockAdviser() {
         const opts = teacherOptions();
         adviserWrap.innerHTML = `<span>Adviser</span>
           <select data-key="adviserId">${opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}</select>`;
       }
   
       function syncAdviser() {
         if (nameMode === "custom") {
           // Renaming doesn't change who advises the section.
           lockAdviser(row ? row.adviserId : null);
           return;
         }
         const nameInput = nameWrap.querySelector('[data-key="name"]');
         const match = findSectionByGradeAndName(gradeSelect.value, nameInput.value);
         if (match) lockAdviser(match.adviserId); else unlockAdviser();
       }
   
       function renderNameField(preferredName) {
         const grade = gradeSelect.value;
         if (nameMode === "custom") {
           nameWrap.innerHTML = `<span>Section name</span>
             <div class="field-with-action">
               <input type="text" data-key="name" value="${preferredName ?? ""}" required>
               <button type="button" class="btn-tiny" data-name-mode="pick">Choose existing</button>
             </div>`;
         } else {
           const opts = mode === "edit" ? existingSectionNamesForGrade(grade) : sectionNameOptionsForGrade(grade, preferredName);
           const selectHtml = `<select data-key="name">${opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}</select>`;
           nameWrap.innerHTML = mode === "edit"
             ? `<span>Section name</span><div class="field-with-action">${selectHtml}<button type="button" class="btn-tiny" data-name-mode="custom">Rename</button></div>`
             : `<span>Section name</span>${selectHtml}`;
           const nameSelect = nameWrap.querySelector('[data-key="name"]');
           if (preferredName && opts.some(o => o.value === preferredName)) nameSelect.value = preferredName;
           nameSelect.addEventListener("change", syncAdviser);
         }
         const toggleBtn = nameWrap.querySelector("[data-name-mode]");
         if (toggleBtn) {
           toggleBtn.addEventListener("click", () => {
             nameMode = toggleBtn.dataset.nameMode;
             renderNameField(nameMode === "custom" ? (row ? row.name : "") : null);
             syncAdviser();
           });
         }
       }
   
       renderNameField(row ? row.name : null);
       syncAdviser();
   
       gradeSelect.addEventListener("change", () => {
         if (nameMode === "pick") renderNameField(null);
         syncAdviser();
       });
     }
   }
   
   function closeModal() {
     modalBackdrop.hidden = true;
     modalForm.reset();
   }
   
   modalForm.addEventListener("submit", (e) => {
     e.preventDefault();
     const { entityKey, mode, id } = modalState;
     const config = entityConfig[entityKey];
     const record = mode === "edit" ? data[entityKey].find(r => r.id == id) : { id: newId() };
   
     config.fields.forEach(field => {
       if (field.type === "multiselect") {
         const container = modalFields.querySelector(`[data-key="${field.key}"]`);
         record[field.key] = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => Number(cb.value));
         return;
       }
       const input = modalFields.querySelector(`[data-key="${field.key}"]`);
       let value = input.value;
       if (entityKey === "subjects" && field.key === "teacherIds") {
         record.teacherIds = value !== "" ? [Number(value)] : [];
         return;
       }
       if (field.type === "number") value = Number(value);
       if (field.key.endsWith("Id") && value !== "") value = Number(value);
       record[field.key] = value;
     });
   
     if (mode === "add" && (entityKey === "teachers" || entityKey === "students") && !record.password) {
       record.password = generatePassword();
     }
   
     const recordName = record.name || record.code || record.studentNo || "—";
     const logCategory = entityLogCategory[entityKey] || "Admin";
   
     if (mode === "add") {
       data[entityKey].push(record);
       logActivity(`Added a new ${config.label}: ${recordName}.`, logCategory, "Add", recordName);
     } else {
       logActivity(`Updated ${config.label} record: ${recordName}.`, logCategory, "Edit", recordName);
     }
   
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
       const viewKey = e.target.dataset.view;
       const editKey = e.target.dataset.edit;
       const deleteKey = e.target.dataset.delete;
       const loadKey = e.target.dataset.load;
       const gradesKey = e.target.dataset.grades;
   
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
      DELETE SUBJECT MODAL
      A single, centralized place to remove a subject —
      type its code or pick it from the dropdown (either
      one fills in the other), then confirm the delete.
      Reachable only from the Subjects page.
      ============================================ */
   const deleteSubjectBackdrop = document.getElementById("deleteSubjectBackdrop");
   const dsCodeInput = document.getElementById("ds-code");
   const dsSubjectSelect = document.getElementById("ds-subject");
   
   function refreshDeleteSubjectOptions(selectedId) {
     const sorted = [...data.subjects].sort((a, b) =>
       a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name)
     );
     dsSubjectSelect.innerHTML = `<option value="">— Select subject —</option>` +
       sorted.map(s => `<option value="${s.id}">${s.code} — ${s.name}</option>`).join("");
     dsSubjectSelect.value = selectedId != null ? selectedId : "";
   }
   
   function openDeleteSubjectModal() {
     if (data.subjects.length === 0) {
       alert("No subjects yet to delete.");
       return;
     }
     dsCodeInput.value = "";
     refreshDeleteSubjectOptions();
     deleteSubjectBackdrop.hidden = false;
   }
   
   // Typing a code looks up and selects the matching subject in the dropdown.
   dsCodeInput.addEventListener("input", () => {
     const typed = dsCodeInput.value.trim().toLowerCase();
     if (!typed) { dsSubjectSelect.value = ""; return; }
     const match = data.subjects.find(s => s.code.toLowerCase() === typed);
     dsSubjectSelect.value = match ? match.id : "";
   });
   
   // Picking a subject from the dropdown fills in its code.
   dsSubjectSelect.addEventListener("change", () => {
     const subject = data.subjects.find(s => s.id === Number(dsSubjectSelect.value));
     dsCodeInput.value = subject ? subject.code : "";
   });
   
   document.getElementById("deleteSubjectConfirm").addEventListener("click", () => {
     const subject = data.subjects.find(s => s.id === Number(dsSubjectSelect.value));
     if (!subject) {
       alert("Pick a subject (or type its code) first.");
       return;
     }
     if (!confirm(`Delete "${subject.code} — ${subject.name}"? This can't be undone.`)) return;
     data.subjects = data.subjects.filter(s => s.id !== subject.id);
     logActivity(`Deleted a subject: ${subject.code} — ${subject.name}.`, "Admin", "Delete", `${subject.code} — ${subject.name}`);
     renderAll();
     closeDeleteSubjectModal();
   });
   
   function closeDeleteSubjectModal() { deleteSubjectBackdrop.hidden = true; }
   document.getElementById("deleteSubjectClose").addEventListener("click", closeDeleteSubjectModal);
   document.getElementById("deleteSubjectCancel").addEventListener("click", closeDeleteSubjectModal);
   deleteSubjectBackdrop.addEventListener("click", (e) => { if (e.target === deleteSubjectBackdrop) closeDeleteSubjectModal(); });
   document.getElementById("deleteSubjectBtn").addEventListener("click", openDeleteSubjectModal);
   
   /* ============================================
      RENAME SUBJECT MODAL
      Same picker pattern as Delete subject — type its
      code or choose it from the dropdown, either one
      fills in the other. Once a subject is picked, its
      code, subject name, units, grade level and teacher
      all become editable and can be saved in one go.
      Reachable only from the Subjects page.
      ============================================ */
   const renameSubjectBackdrop = document.getElementById("renameSubjectBackdrop");
   const rsCodeInput = document.getElementById("rs-code");
   const rsSubjectSelect = document.getElementById("rs-subject");
   const renameSubjectFields = document.getElementById("renameSubjectFields");
   const rsNewCodeInput = document.getElementById("rs-newCode");
   const rsNewNameInput = document.getElementById("rs-newName");
   const rsNewUnitsInput = document.getElementById("rs-newUnits");
   const rsNewGradeSelect = document.getElementById("rs-newGrade");
   const rsNewTeacherSelect = document.getElementById("rs-newTeacher");
   const renameSubjectSaveBtn = document.getElementById("renameSubjectSave");
   
   function refreshRenameSubjectOptions(selectedId) {
     const sorted = [...data.subjects].sort((a, b) =>
       a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name)
     );
     rsSubjectSelect.innerHTML = `<option value="">— Select subject —</option>` +
       sorted.map(s => `<option value="${s.id}">${s.code} — ${s.name}</option>`).join("");
     rsSubjectSelect.value = selectedId != null ? selectedId : "";
   }
   
   function clearRenameSubjectFields() {
     renameSubjectFields.hidden = true;
     renameSubjectSaveBtn.disabled = true;
     rsNewCodeInput.value = "";
     rsNewNameInput.value = "";
     rsNewUnitsInput.value = "";
     rsNewGradeSelect.value = "";
     rsNewTeacherSelect.innerHTML = "";
   }
   
   function loadSubjectIntoRenameForm(subject) {
     rsNewCodeInput.value = subject.code;
     rsNewNameInput.value = subject.name;
     rsNewUnitsInput.value = subject.units;
     rsNewGradeSelect.value = subject.gradeLevel;
     const teacherOpts = teacherOptions();
     rsNewTeacherSelect.innerHTML = teacherOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
     rsNewTeacherSelect.value = (subject.teacherIds && subject.teacherIds[0] != null) ? String(subject.teacherIds[0]) : "";
     renameSubjectFields.hidden = false;
     renameSubjectSaveBtn.disabled = false;
   }
   
   function openRenameSubjectModal() {
     if (data.subjects.length === 0) {
       alert("No subjects yet to rename.");
       return;
     }
     rsCodeInput.value = "";
     refreshRenameSubjectOptions();
     clearRenameSubjectFields();
     renameSubjectBackdrop.hidden = false;
   }
   
   // Typing a code looks up and selects the matching subject in the dropdown.
   rsCodeInput.addEventListener("input", () => {
     const typed = rsCodeInput.value.trim().toLowerCase();
     if (!typed) { rsSubjectSelect.value = ""; clearRenameSubjectFields(); return; }
     const match = data.subjects.find(s => s.code.toLowerCase() === typed);
     rsSubjectSelect.value = match ? match.id : "";
     if (match) loadSubjectIntoRenameForm(match); else clearRenameSubjectFields();
   });
   
   // Picking a subject from the dropdown fills in its code and loads the edit form.
   rsSubjectSelect.addEventListener("change", () => {
     const subject = data.subjects.find(s => s.id === Number(rsSubjectSelect.value));
     rsCodeInput.value = subject ? subject.code : "";
     if (subject) loadSubjectIntoRenameForm(subject); else clearRenameSubjectFields();
   });
   
   renameSubjectSaveBtn.addEventListener("click", () => {
     const subject = data.subjects.find(s => s.id === Number(rsSubjectSelect.value));
     if (!subject) {
       alert("Pick a subject (or type its code) first.");
       return;
     }
     const newCode = rsNewCodeInput.value.trim();
     const newName = rsNewNameInput.value.trim();
     if (!newCode || !newName) {
       alert("Subject code and subject name can't be empty.");
       return;
     }
     if (!rsNewGradeSelect.value) {
       alert("Pick a grade level.");
       return;
     }
     const codeTaken = data.subjects.some(s => s.id !== subject.id && s.code.toLowerCase() === newCode.toLowerCase());
     if (codeTaken) {
       alert("That code is already used by another subject.");
       return;
     }
     const oldLabel = `${subject.code} — ${subject.name}`;
     subject.code = newCode;
     subject.name = newName;
     subject.units = Number(rsNewUnitsInput.value) || subject.units;
     subject.gradeLevel = rsNewGradeSelect.value;
     subject.teacherIds = rsNewTeacherSelect.value !== "" ? [Number(rsNewTeacherSelect.value)] : [];
     logActivity(`Renamed a subject: ${oldLabel} → ${subject.code} — ${subject.name}.`, "Admin", "Edit", `${subject.code} — ${subject.name}`);
     renderAll();
     closeRenameSubjectModal();
   });
   
   function closeRenameSubjectModal() {
     renameSubjectBackdrop.hidden = true;
     rsCodeInput.value = "";
     rsSubjectSelect.value = "";
     clearRenameSubjectFields();
   }
   document.getElementById("renameSubjectClose").addEventListener("click", closeRenameSubjectModal);
   document.getElementById("renameSubjectCancel").addEventListener("click", closeRenameSubjectModal);
   renameSubjectBackdrop.addEventListener("click", (e) => { if (e.target === renameSubjectBackdrop) closeRenameSubjectModal(); });
   document.getElementById("renameSubjectBtn").addEventListener("click", openRenameSubjectModal);
   
   /* ============================================
      SECTION PICKER HELPERS (shared by Delete/Edit)
      ============================================ */
   function sortedSections() {
     return [...data.sections].sort((a, b) =>
       a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name)
     );
   }
   
   // Teachers who currently advise no section, plus whichever teacher already
   // advises *this* section (so their existing assignment stays selectable).
   function availableAdviserOptions(currentAdviserId) {
     const advisedIds = new Set(data.sections.map(s => s.adviserId).filter(id => id != null));
     const opts = data.teachers
       .filter(t => !advisedIds.has(t.id) || t.id === currentAdviserId)
       .map(t => ({ value: t.id, label: t.name }));
     return [{ value: "", label: "— none —" }, ...opts];
   }
   
   /* ============================================
      DELETE SECTION MODAL
      Pick a section from the dropdown, then confirm.
      Reachable only from the Sections page.
      ============================================ */
   const deleteSectionBackdrop = document.getElementById("deleteSectionBackdrop");
   const delsecSelect = document.getElementById("delsec-section");
   
   function refreshDeleteSectionOptions() {
     delsecSelect.innerHTML = `<option value="">— Select section —</option>` +
       sortedSections().map(s => `<option value="${s.id}">${s.name}</option>`).join("");
     delsecSelect.value = "";
   }
   
   function openDeleteSectionModal() {
     if (data.sections.length === 0) {
       alert("No sections yet to delete.");
       return;
     }
     refreshDeleteSectionOptions();
     deleteSectionBackdrop.hidden = false;
   }
   
   document.getElementById("deleteSectionConfirm").addEventListener("click", () => {
     const section = data.sections.find(s => s.id === Number(delsecSelect.value));
     if (!section) {
       alert("Pick a section first.");
       return;
     }
     if (!confirm(`Delete "${section.name}"? This can't be undone.`)) return;
     data.sections = data.sections.filter(s => s.id !== section.id);
     logActivity(`Deleted a section: ${section.name}.`, "Admin", "Delete", section.name);
     renderAll();
     closeDeleteSectionModal();
   });
   
   function closeDeleteSectionModal() {
     deleteSectionBackdrop.hidden = true;
     delsecSelect.value = "";
   }
   document.getElementById("deleteSectionClose").addEventListener("click", closeDeleteSectionModal);
   document.getElementById("deleteSectionCancel").addEventListener("click", closeDeleteSectionModal);
   deleteSectionBackdrop.addEventListener("click", (e) => { if (e.target === deleteSectionBackdrop) closeDeleteSectionModal(); });
   document.getElementById("deleteSectionBtn").addEventListener("click", openDeleteSectionModal);
   
   /* ============================================
      EDIT SECTION MODAL
      Pick a section, then its grade level, name and
      adviser become editable. The picker and the edit
      fields always start blank on open (and reset again
      on close) so nothing carries over between visits.
      The adviser dropdown only lists teachers with no
      advisory yet, plus this section's current adviser.
      Reachable only from the Sections page.
      ============================================ */
   const editSectionBackdrop = document.getElementById("editSectionBackdrop");
   const esSectionSelect = document.getElementById("es-section");
   const editSectionFields = document.getElementById("editSectionFields");
   const esNewGradeSelect = document.getElementById("es-newGrade");
   const esNewNameInput = document.getElementById("es-newName");
   const esNewAdviserSelect = document.getElementById("es-newAdviser");
   const editSectionSaveBtn = document.getElementById("editSectionSave");
   
   function refreshEditSectionOptions() {
     esSectionSelect.innerHTML = `<option value="">— Select section —</option>` +
       sortedSections().map(s => `<option value="${s.id}">${s.name}</option>`).join("");
     esSectionSelect.value = "";
   }
   
   function clearEditSectionFields() {
     editSectionFields.hidden = true;
     editSectionSaveBtn.disabled = true;
     esNewGradeSelect.value = "";
     esNewNameInput.value = "";
     esNewAdviserSelect.innerHTML = "";
   }
   
   function loadSectionIntoEditForm(section) {
     esNewGradeSelect.value = section.gradeLevel;
     esNewNameInput.value = section.name;
     const opts = availableAdviserOptions(section.adviserId);
     esNewAdviserSelect.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
     esNewAdviserSelect.value = section.adviserId != null ? String(section.adviserId) : "";
     editSectionFields.hidden = false;
     editSectionSaveBtn.disabled = false;
   }
   
   function openEditSectionModal() {
     if (data.sections.length === 0) {
       alert("No sections yet to edit.");
       return;
     }
     refreshEditSectionOptions();
     clearEditSectionFields();
     editSectionBackdrop.hidden = false;
   }
   
   esSectionSelect.addEventListener("change", () => {
     const section = data.sections.find(s => s.id === Number(esSectionSelect.value));
     if (section) loadSectionIntoEditForm(section); else clearEditSectionFields();
   });
   
   editSectionSaveBtn.addEventListener("click", () => {
     const section = data.sections.find(s => s.id === Number(esSectionSelect.value));
     if (!section) {
       alert("Pick a section first.");
       return;
     }
     const newName = esNewNameInput.value.trim();
     if (!newName) {
       alert("Section name can't be empty.");
       return;
     }
     if (!esNewGradeSelect.value) {
       alert("Pick a grade level.");
       return;
     }
     const nameTaken = data.sections.some(s => s.id !== section.id && s.name.toLowerCase() === newName.toLowerCase());
     if (nameTaken) {
       alert("That section name is already used by another section.");
       return;
     }
     const oldName = section.name;
     section.gradeLevel = esNewGradeSelect.value;
     section.name = newName;
     section.adviserId = esNewAdviserSelect.value !== "" ? Number(esNewAdviserSelect.value) : null;
     logActivity(`Updated section: ${oldName} → ${section.name}.`, "Admin", "Edit", section.name);
     renderAll();
     closeEditSectionModal();
   });
   
   function closeEditSectionModal() {
     editSectionBackdrop.hidden = true;
     esSectionSelect.value = "";
     clearEditSectionFields();
   }
   document.getElementById("editSectionClose").addEventListener("click", closeEditSectionModal);
   document.getElementById("editSectionCancel").addEventListener("click", closeEditSectionModal);
   editSectionBackdrop.addEventListener("click", (e) => { if (e.target === editSectionBackdrop) closeEditSectionModal(); });
   document.getElementById("editSectionBtn").addEventListener("click", openEditSectionModal);
   
   /* ============================================
      GRADING CARD SHEET MODAL
      ============================================ */
   const gradesBackdrop = document.getElementById("gradesBackdrop");
   const gradesTitle = document.getElementById("gradesTitle");
   const gradesPeriodNote = document.getElementById("gradesPeriodNote");
   const gradesTableBody = document.querySelector("#gradesTable tbody");
   
   function fmtGrade(value) {
     return typeof value === "number" ? value : `<span class="rating-pending">Pending</span>`;
   }
   
   function openGradesModal(studentId) {
     const student = data.students.find(s => s.id === studentId);
     gradesTitle.textContent = `Grading card sheet — ${student.name}`;
     gradesPeriodNote.textContent = `Currently on ${settings.period}.`;
   
     const subjectIds = Object.keys(student.grades || {});
   
     gradesTableBody.innerHTML = subjectIds.map(idStr => {
       const subjectId = Number(idStr);
       const subject = data.subjects.find(s => s.id === subjectId);
       const g = student.grades[idStr];
       const final = computeFinalRating(g);
       return `
         <tr>
           <td>${subject ? `${subject.code} — ${subject.name}` : "Unknown subject"}</td>
           <td>${fmtGrade(g.q1)}</td>
           <td>${fmtGrade(g.q2)}</td>
           <td>${fmtGrade(g.q3)}</td>
           <td>${fmtGrade(g.q4)}</td>
           <td>${fmtGrade(final)}</td>
         </tr>`;
     }).join("") + `
       <tr class="row-final">
         <td colspan="5">General average</td>
         <td>${fmtGrade(computeGeneralAverage(student))}</td>
       </tr>`;
   
     gradesBackdrop.hidden = false;
   }
   
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
   
   document.getElementById("subjectFilterUnits").addEventListener("change", (e) => {
     subjectFilter.units = e.target.value;
     renderTable("subjects");
   });
   
   document.getElementById("subjectFilterTeacher").addEventListener("change", (e) => {
     subjectFilter.teacherId = e.target.value;
     renderTable("subjects");
   });
   
   document.getElementById("subjectSearchClear").addEventListener("click", () => {
     subjectSearchInput.value = "";
     subjectFilter = { term: "", gradeLevel: "all", teacherId: "all", units: "all" };
     document.getElementById("subjectFilterGrade").value = "all";
     document.getElementById("subjectFilterUnits").value = "all";
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
   
   function renderAdminAccountsModal() {
     const tbody = document.querySelector("#adminAccountsTable tbody");
     const adminRows = data.admins.map(a => ({ name: a.name, role: a.role, username: a.username, status: a.status }));
     const teacherAdminRows = data.teachers
       .filter(t => t.adminAccess)
       .map(t => ({ name: t.name, role: "Teacher", username: t.username, status: t.status }));
     const rows = [...adminRows, ...teacherAdminRows];
   
     tbody.innerHTML = rows.length ? rows.map(r => `
       <tr>
         <td>${r.name}</td>
         <td>${r.role}</td>
         <td>${r.username || "—"}</td>
         <td>${statusTag(r.status)}</td>
       </tr>`).join("") : `<tr><td colspan="4">No admin accounts yet.</td></tr>`;
   }
   
   function wireSimpleModalClose(backdropId, closeId, doneId) {
     const backdrop = document.getElementById(backdropId);
     const close = () => { backdrop.hidden = true; };
     document.getElementById(closeId).addEventListener("click", close);
     document.getElementById(doneId).addEventListener("click", close);
     backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
   }
   
   document.getElementById("viewTeacherAccountsBtn").addEventListener("click", () => {
     renderTeacherAccountsModal();
     document.getElementById("teacherAccountsBackdrop").hidden = false;
   });
   document.getElementById("viewStudentAccountsBtn").addEventListener("click", () => {
     renderStudentAccountsModal();
     document.getElementById("studentAccountsBackdrop").hidden = false;
   });
   document.getElementById("viewAdminAccountsBtn").addEventListener("click", () => {
     renderAdminAccountsModal();
     document.getElementById("adminAccountsBackdrop").hidden = false;
   });
   
   wireSimpleModalClose("teacherAccountsBackdrop", "teacherAccountsClose", "teacherAccountsDone");
   wireSimpleModalClose("studentAccountsBackdrop", "studentAccountsClose", "studentAccountsDone");
   wireSimpleModalClose("adminAccountsBackdrop", "adminAccountsClose", "adminAccountsDone");
   
   /* ============================================
      ADMIN SETTINGS
      ============================================ */
   function loadSettingsForm() {
     document.getElementById("set-schoolName").value = settings.schoolName;
     document.getElementById("set-schoolYear").value = settings.schoolYear;
     document.getElementById("set-period").value = settings.period;
     document.getElementById("set-scale").value = settings.scale;
     document.getElementById("set-passing").value = settings.passing;
     document.getElementById("sidebarYear").textContent = settings.schoolYear;
   }
   
   document.getElementById("settingsForm").addEventListener("submit", (e) => {
     e.preventDefault();
     settings.schoolName = document.getElementById("set-schoolName").value;
     settings.schoolYear = document.getElementById("set-schoolYear").value;
     settings.period = document.getElementById("set-period").value;
     settings.scale = document.getElementById("set-scale").value;
     settings.passing = Number(document.getElementById("set-passing").value);
     document.getElementById("sidebarYear").textContent = settings.schoolYear;
   
     const flash = document.getElementById("saveFlash");
     flash.hidden = false;
     logActivity("Updated admin settings.", "Admin", "Edit", settings.schoolName || "School settings");
     setTimeout(() => { flash.hidden = true; }, 2000);
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