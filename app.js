/* ============================================
   SAMPLE DATA
   In-memory only for this phase — resets on page
   reload. Swap this for localStorage or a real
   backend in a later phase.
   ============================================ */
   let nextId = 100;
   const newId = () => nextId++;
   
   let data = {
     teachers: [
       { id: newId(), name: "Marisol Andrade", email: "m.andrade@meridian.edu", contact: "0917-224-6610", status: "Active", username: "mandrade", password: "Cx9!qLp2Rz", adminAccess: false },
       { id: newId(), name: "Daniel Reyes", email: "d.reyes@meridian.edu", contact: "0928-880-1123", status: "Active", username: "dreyes", password: "Kt4#mWv8Bn", adminAccess: false },
       { id: newId(), name: "Priya Kapoor", email: "p.kapoor@meridian.edu", contact: "0933-410-7742", status: "Active", username: "pkapoor", password: "Rf7@hLd3Sy", adminAccess: false },
       { id: newId(), name: "Louie Fernandez", email: "l.fernandez@meridian.edu", contact: "0905-771-2290", status: "Inactive", username: "lfernandez", password: "Vp2$nZq6Tm", adminAccess: false },
     ],
     students: [
       { id: newId(), studentNo: "MG-2026-0142", name: "Ava Bernal", gradeLevel: "Grade 8", sectionId: null, status: "Active", username: "abernal", password: "Qz8!vRk4Pd", _baseQ1: 88, _baseQ2: 90 },
       { id: newId(), studentNo: "MG-2026-0143", name: "Noah Villanueva", gradeLevel: "Grade 8", sectionId: null, status: "Active", username: "nvillanueva", password: "Jm3#tYb7Ln", _baseQ1: 85, _baseQ2: 87 },
       { id: newId(), studentNo: "MG-2026-0144", name: "Isla Domingo", gradeLevel: "Grade 7", sectionId: null, status: "Active", username: "idomingo", password: "Wc6@sFq2Hx", _baseQ1: 91, _baseQ2: 93 },
       { id: newId(), studentNo: "MG-2026-0145", name: "Mateo Cruz", gradeLevel: "Grade 7", sectionId: null, status: "Active", username: "mcruz", password: "Bn5$dGw9Ez", _baseQ1: 79, _baseQ2: 82 },
       { id: newId(), studentNo: "MG-2026-0146", name: "Lian Ocampo", gradeLevel: "Grade 9", sectionId: null, status: "Inactive", username: "locampo", password: "Ty1%rXe4Cq", _baseQ1: 75, _baseQ2: 78 },
     ],
     subjects: [
       { id: newId(), code: "MTH-701", name: "Mathematics 7", units: 1, gradeLevel: "Grade 7", teacherIds: [] },
       { id: newId(), code: "ENG-701", name: "English 7", units: 1, gradeLevel: "Grade 7", teacherIds: [] },
       { id: newId(), code: "SCI-701", name: "Science 7", units: 1, gradeLevel: "Grade 7", teacherIds: [] },
       { id: newId(), code: "MTH-801", name: "Mathematics 8", units: 1, gradeLevel: "Grade 8", teacherIds: [] },
       { id: newId(), code: "ENG-801", name: "English 8", units: 1, gradeLevel: "Grade 8", teacherIds: [] },
       { id: newId(), code: "SCI-801", name: "Science 8", units: 1, gradeLevel: "Grade 8", teacherIds: [] },
       { id: newId(), code: "MTH-901", name: "Mathematics 9", units: 1, gradeLevel: "Grade 9", teacherIds: [] },
       { id: newId(), code: "ENG-901", name: "English 9", units: 1, gradeLevel: "Grade 9", teacherIds: [] },
       { id: newId(), code: "SCI-901", name: "Science 9", units: 1, gradeLevel: "Grade 9", teacherIds: [] },
     ],
     sections: [
       { id: newId(), name: "Grade 7 – Narra", gradeLevel: "Grade 7", adviserId: null },
       { id: newId(), name: "Grade 8 – Molave", gradeLevel: "Grade 8", adviserId: null },
       { id: newId(), name: "Grade 9 – Acacia", gradeLevel: "Grade 9", adviserId: null },
     ],
     admins: [
       { id: newId(), name: "Corazon Villareal", role: "Principal", username: "cvillareal", password: "Ht8@nQe1Zm", status: "Active" },
       { id: newId(), name: "Bien Santos", role: "Administrator", username: "bsantos", password: "Lp4#wRc9Ty", status: "Active" },
     ],
   };
   
   // Wire up sample foreign keys now that every record has an id
   data.students[0].sectionId = data.sections[1].id;
   data.students[1].sectionId = data.sections[1].id;
   data.students[2].sectionId = data.sections[0].id;
   data.students[3].sectionId = data.sections[0].id;
   data.students[4].sectionId = data.sections[2].id;
   
   data.subjects[0].teacherIds = [data.teachers[1].id]; // Mathematics 7 -> Daniel Reyes
   data.subjects[1].teacherIds = [data.teachers[1].id]; // English 7 -> Daniel Reyes
   data.subjects[2].teacherIds = [data.teachers[2].id]; // Science 7 -> Priya Kapoor
   data.subjects[3].teacherIds = [data.teachers[0].id]; // Mathematics 8 -> Marisol Andrade
   data.subjects[4].teacherIds = [data.teachers[3].id]; // English 8 -> Louie Fernandez
   data.subjects[5].teacherIds = [data.teachers[2].id]; // Science 8 -> Priya Kapoor
   data.subjects[6].teacherIds = [data.teachers[0].id]; // Mathematics 9 -> Marisol Andrade
   data.subjects[7].teacherIds = [data.teachers[1].id]; // English 9 -> Daniel Reyes
   data.subjects[8].teacherIds = [data.teachers[2].id]; // Science 9 -> Priya Kapoor
   
   data.sections[0].adviserId = data.teachers[1].id;
   data.sections[1].adviserId = data.teachers[0].id;
   data.sections[2].adviserId = data.teachers[2].id;
   
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
     { when: "Today", what: "Sample data loaded for this session." },
   ];
   
   function logActivity(text) {
     activityLog.unshift({ when: "Just now", what: text });
     activityLog = activityLog.slice(0, 6);
     renderActivity();
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
         { key: "code", label: "Subject code", type: "text", required: true },
         { key: "name", label: "Subject name", type: "select", options: () => subjectNameOptions(), required: true },
         { key: "units", label: "Units", type: "number" },
         { key: "gradeLevel", label: "Grade level", type: "select", options: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
         { key: "teacherIds", label: "Teachers", type: "multiselect", options: () => teacherOptions() },
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
         { key: "name", label: "Section name", type: "text", required: true },
         { key: "gradeLevel", label: "Grade level", type: "select", options: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
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
   function subjectNameOptions() {
     const uniqueNames = [...new Set(data.subjects.map(s => s.name))];
     return uniqueNames.map(n => ({ value: n, label: n }));
   }
   function subjectDefaultsForName(name) {
     const match = data.subjects.find(s => s.name === name);
     return match ? { code: match.code, gradeLevel: match.gradeLevel } : null;
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
     renderActivity();
     refreshStudentSectionFilterOptions();
     refreshSubjectFilterOptions();
   }
   
   function refreshStudentSectionFilterOptions() {
     const select = document.getElementById("studentFilterSection");
     const current = select.value;
     select.innerHTML = `<option value="all">All sections</option>` +
       data.sections.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
     const stillExists = current === "all" || data.sections.some(s => String(s.id) === current);
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
   
   function renderTable(entityKey) {
     const config = entityConfig[entityKey];
     const tbody = document.querySelector(`#table-${entityKey} tbody`);
     const emptyNote = document.getElementById(`empty-${entityKey}`);
     const rows = entityKey === "students" ? getFilteredStudents() :
       entityKey === "subjects" ? getFilteredSubjects() : data[entityKey];
   
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
     } else {
       emptyNote.hidden = rows.length > 0;
     }
   
     rows.forEach(row => {
       const tr = document.createElement("tr");
       const cells = config.columns(row).map(c => `<td>${c}</td>`).join("");
       tr.innerHTML = `
         ${cells}
         <td class="row-actions">
           ${buildRowActions(entityKey, row)}
         </td>`;
       tbody.appendChild(tr);
     });
   }
   
   function buildRowActions(entityKey, row) {
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
   
   function renderActivity() {
     const tbody = document.querySelector("#activityTable tbody");
     tbody.innerHTML = activityLog.map(a => `<tr><td>${a.when}</td><td>${a.what}</td></tr>`).join("");
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
   
     config.fields.forEach(field => {
       const wrap = document.createElement("label");
       wrap.className = field.type === "multiselect" ? "field field--full" : "field";
       const value = field.type === "multiselect" ? (row ? (row[field.key] || []) : []) : (row ? row[field.key] ?? "" : "");
       const disabled = mode === "view" ? "disabled" : "";
   
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
       const nameSelect = modalFields.querySelector('[data-key="name"]');
       if (nameSelect) {
         nameSelect.addEventListener("change", () => {
           const defaults = subjectDefaultsForName(nameSelect.value);
           if (!defaults) return;
           const codeInput = modalFields.querySelector('[data-key="code"]');
           const gradeSelect = modalFields.querySelector('[data-key="gradeLevel"]');
           if (codeInput) codeInput.value = defaults.code;
           if (gradeSelect) gradeSelect.value = defaults.gradeLevel;
         });
       }
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
       if (field.type === "number") value = Number(value);
       if (field.key.endsWith("Id") && value !== "") value = Number(value);
       record[field.key] = value;
     });
   
     if (mode === "add" && (entityKey === "teachers" || entityKey === "students") && !record.password) {
       record.password = generatePassword();
     }
   
     if (mode === "add") {
       data[entityKey].push(record);
       logActivity(`Added a new ${config.label}: ${record.name || record.code || record.studentNo}.`);
     } else {
       logActivity(`Updated ${config.label} record.`);
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
     pendingDelete = { entityKey, id };
     confirmBackdrop.hidden = false;
   }
   
   document.getElementById("confirmCancel").addEventListener("click", () => {
     confirmBackdrop.hidden = true;
     pendingDelete = null;
   });
   
   document.getElementById("confirmDelete").addEventListener("click", () => {
     if (!pendingDelete) return;
     const { entityKey, id } = pendingDelete;
     const config = entityConfig[entityKey];
     data[entityKey] = data[entityKey].filter(r => r.id !== id);
     logActivity(`Deleted a ${config.label} record.`);
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
     logActivity(`Removed ${subject.code} from a teacher's subject load.`);
     renderLoadModal();
     renderAll();
   });
   
   document.getElementById("loadAddBtn").addEventListener("click", () => {
     const subId = loadAddSelect.value;
     if (!subId) return;
     const subject = data.subjects.find(s => s.id === Number(subId));
     if (!subject.teacherIds) subject.teacherIds = [];
     if (!subject.teacherIds.includes(currentLoadTeacherId)) subject.teacherIds.push(currentLoadTeacherId);
     logActivity(`Added ${subject.code} to a teacher's subject load.`);
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
     renderTable("students");
   });
   
   document.getElementById("studentFilterSection").addEventListener("change", (e) => {
     studentFilter.sectionId = e.target.value;
     renderTable("students");
   });
   
   document.getElementById("studentSearchClear").addEventListener("click", () => {
     studentSearchInput.value = "";
     studentFilter.term = "";
     studentFilter.gradeLevel = "all";
     studentFilter.sectionId = "all";
     document.getElementById("studentFilterGrade").value = "all";
     document.getElementById("studentFilterSection").value = "all";
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
         logActivity(`${e.target.checked ? "Granted" : "Removed"} administrator access for ${teacher.name}.`);
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
         logActivity(`${e.target.checked ? "Allowed" : "Removed"} student access: ${label}.`);
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
     logActivity("Updated admin settings.");
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