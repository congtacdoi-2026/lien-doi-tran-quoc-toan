"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ClassItem = {
  id: string;
  class_name: string;
  grade: number;
  campus: string;
  competition_enabled: boolean;
  is_active: boolean;
};

type Student = {
  id: string;
  student_code: string | null;
  full_name: string;
  class_id: string;
  date_of_birth: string | null;
  gender: "Nam" | "Nữ" | null;
  ethnicity: string | null;
  address: string | null;
  is_union_member: boolean;
  team_position: string;
  notes: string | null;
};

type StudentForm = {
  student_code: string;
  full_name: string;
  class_id: string;
  date_of_birth: string;
  gender: "" | "Nam" | "Nữ";
  ethnicity: string;
  address: string;
  is_union_member: boolean;
  team_position: string;
  notes: string;
};

const POSITION_OPTIONS = [
  "Không",
  "Chi đội trưởng",
  "Chi đội phó",
  "Ủy viên",
  "Phân đội trưởng",
  "Phân đội phó",
  "Chức vụ khác",
];

const emptyForm: StudentForm = {
  student_code: "",
  full_name: "",
  class_id: "",
  date_of_birth: "",
  gender: "",
  ethnicity: "",
  address: "",
  is_union_member: false,
  team_position: "Không",
  notes: "",
};

export default function StudentsModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<StudentForm>(emptyForm);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadClasses();
    loadStudents();
  }, []);

  async function loadClasses() {
    const { data, error } = await supabase
      .from("classes")
      .select(
        "id,class_name,grade,campus,competition_enabled,is_active"
      )
      .eq("is_active", true)
      .order("grade", { ascending: true })
      .order("class_name", { ascending: true });

    if (error) {
      setErrorMessage(
        "Không tải được danh sách lớp: " + error.message
      );
      return;
    }

    setClasses((data ?? []) as ClassItem[]);
  }

  async function loadStudents() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("students")
      .select(
        "id,student_code,full_name,class_id,date_of_birth,gender,ethnicity,address,is_union_member,team_position,notes"
      )
      .order("full_name", { ascending: true });

    if (error) {
      setErrorMessage(
        "Không tải được danh sách học sinh: " + error.message
      );
      setLoading(false);
      return;
    }

    setStudents((data ?? []) as Student[]);
    setLoading(false);
  }

  const classMap = useMemo(() => {
    const map: Record<string, ClassItem> = {};

    classes.forEach((item) => {
      map[item.id] = item;
    });

    return map;
  }, [classes]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchSearch =
        !keyword ||
        student.full_name.toLowerCase().includes(keyword) ||
        (student.student_code ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchClass =
        !filterClass || student.class_id === filterClass;

      return matchSearch && matchClass;
    });
  }, [students, search, filterClass]);

  function generateStudentCode() {
    const now = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 90 + 10);

    return `HS${now}${random}`;
  }

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function openAddForm() {
    clearMessages();
    setEditingId(null);
    setForm({
      ...emptyForm,
      student_code: generateStudentCode(),
    });
    setShowForm(true);
  }

  function openEditForm(student: Student) {
    clearMessages();

    setEditingId(student.id);

    setForm({
      student_code: student.student_code ?? "",
      full_name: student.full_name,
      class_id: student.class_id,
      date_of_birth: student.date_of_birth ?? "",
      gender: student.gender ?? "",
      ethnicity: student.ethnicity ?? "",
      address: student.address ?? "",
      is_union_member: student.is_union_member,
      team_position: student.team_position || "Không",
      notes: student.notes ?? "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveStudent() {
    clearMessages();

    if (!form.full_name.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên.");
      return;
    }

    if (!form.class_id) {
      setErrorMessage("Vui lòng chọn lớp.");
      return;
    }

    setSaving(true);

    const payload = {
      student_code:
        form.student_code.trim() || generateStudentCode(),
      full_name: form.full_name.trim(),
      class_id: form.class_id,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      ethnicity: form.ethnicity.trim() || null,
      address: form.address.trim() || null,
      is_union_member: form.is_union_member,
      team_position: form.team_position || "Không",
      notes: form.notes.trim() || null,
    };

    let error = null;

    if (editingId) {
      const result = await supabase
        .from("students")
        .update(payload)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("students")
        .insert(payload);

      error = result.error;
    }

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage(
          "Mã học sinh đã tồn tại. Vui lòng nhập mã khác."
        );
      } else {
        setErrorMessage(
          "Không lưu được học sinh: " + error.message
        );
      }

      return;
    }

    await loadStudents();

    setMessage(
      editingId
        ? "Đã cập nhật học sinh."
        : "Đã thêm học sinh."
    );

    setTimeout(() => {
      closeForm();
      setMessage("");
    }, 700);
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa học sinh "${student.full_name}" không?`
    );

    if (!confirmed) return;

    clearMessages();

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      setErrorMessage(
        "Không thể xóa học sinh: " + error.message
      );
      return;
    }

    setStudents((current) =>
      current.filter((item) => item.id !== student.id)
    );

    setMessage("Đã xóa học sinh.");

    setTimeout(() => setMessage(""), 1500);
  }

  function formatDate(date: string | null) {
    if (!date) return "";

    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function excelDateToISO(value: unknown): string | null {
    if (!value) return null;

    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    if (typeof value === "number") {
      const excelEpoch = new Date(
        Date.UTC(1899, 11, 30)
      );

      const date = new Date(
        excelEpoch.getTime() +
          value * 24 * 60 * 60 * 1000
      );

      const year = date.getUTCFullYear();
      const month = String(
        date.getUTCMonth() + 1
      ).padStart(2, "0");
      const day = String(
        date.getUTCDate()
      ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    const text = String(value).trim();

    if (!text) return null;

    const slash = text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (slash) {
      return `${slash[3]}-${slash[2].padStart(
        2,
        "0"
      )}-${slash[1].padStart(2, "0")}`;
    }

    const dash = text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

    if (dash) {
      return `${dash[1]}-${dash[2].padStart(
        2,
        "0"
      )}-${dash[3].padStart(2, "0")}`;
    }

    return null;
  }

  function normalizeHeader(value: unknown) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function getExcelValue(
    row: Record<string, unknown>,
    names: string[]
  ) {
    const keys = Object.keys(row);

    for (const name of names) {
      const wanted = normalizeHeader(name);

      const key = keys.find(
        (item) => normalizeHeader(item) === wanted
      );

      if (key !== undefined) {
        return row[key];
      }
    }

    return "";
  }

  function valueIsYes(value: unknown) {
    const text = String(value ?? "")
      .trim()
      .toLowerCase();

    return [
      "có",
      "co",
      "x",
      "✓",
      "✔",
      "true",
      "1",
      "đội viên",
      "doi vien",
    ].includes(text);
  }

  async function importExcel(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    clearMessages();
    setImporting(true);

    try {
      const XLSX = await import("xlsx");

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "File Excel không có trang tính."
        );
      }

      const worksheet =
        workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(worksheet, {
        defval: "",
      });

      if (rows.length === 0) {
        throw new Error(
          "File Excel không có dữ liệu."
        );
      }

      const classByName: Record<string, ClassItem> = {};

      classes.forEach((item) => {
        classByName[
          normalizeHeader(item.class_name)
        ] = item;
      });

      const imported: Array<{
        student_code: string;
        full_name: string;
        class_id: string;
        date_of_birth: string | null;
        gender: "Nam" | "Nữ" | null;
        ethnicity: string | null;
        address: string | null;
        is_union_member: boolean;
        team_position: string;
        notes: string | null;
      }> = [];

      const errors: string[] = [];

      rows.forEach((row, index) => {
        const line = index + 2;

        const fullName = String(
          getExcelValue(row, [
            "Họ và tên",
            "Họ tên",
            "Họ và Tên",
          ]) ?? ""
        ).trim();

        const className = String(
          getExcelValue(row, ["Lớp"]) ?? ""
        ).trim();

        if (!fullName) {
          errors.push(
            `Dòng ${line}: thiếu Họ và tên`
          );
          return;
        }

        if (!className) {
          errors.push(
            `Dòng ${line}: thiếu Lớp`
          );
          return;
        }

        const classItem =
          classByName[normalizeHeader(className)];

        if (!classItem) {
          errors.push(
            `Dòng ${line}: không tìm thấy lớp "${className}" trong hệ thống`
          );
          return;
        }

        const genderText = String(
          getExcelValue(row, ["Giới tính"]) ?? ""
        )
          .trim()
          .toLowerCase();

        let gender: "Nam" | "Nữ" | null = null;

        if (genderText === "nam") gender = "Nam";
        if (genderText === "nữ" || genderText === "nu")
          gender = "Nữ";

        const position = String(
          getExcelValue(row, [
            "Chức vụ Đội",
            "Chức vụ",
          ]) ?? ""
        ).trim();

        imported.push({
          student_code:
            String(
              getExcelValue(row, [
                "Mã học sinh",
                "Mã HS",
                "Ma hoc sinh",
                "Ma HS",
              ]) ?? ""
            ).trim() || generateStudentCode(),

          full_name: fullName,

          class_id: classItem.id,

          date_of_birth: excelDateToISO(
            getExcelValue(row, [
              "Ngày sinh",
              "Ngay sinh",
            ])
          ),

          gender,

          ethnicity:
            String(
              getExcelValue(row, [
                "Dân tộc",
                "Dan toc",
              ]) ?? ""
            ).trim() || null,

          address:
            String(
              getExcelValue(row, [
                "Nơi ở",
                "Noi o",
                "Địa chỉ",
                "Dia chi",
              ]) ?? ""
            ).trim() || null,

          is_union_member: valueIsYes(
            getExcelValue(row, [
              "Đội viên",
              "Doi vien",
            ])
          ),

          team_position:
            position || "Không",

          notes:
            String(
              getExcelValue(row, ["Ghi chú", "Ghi chu"]) ??
                ""
            ).trim() || null,
        });
      });

      if (errors.length > 0) {
        const preview = errors.slice(0, 8).join("\n");

        throw new Error(
          `Có ${errors.length} dòng chưa thể nhập:\n${preview}${
            errors.length > 8
              ? "\n..."
              : ""
          }`
        );
      }

      if (imported.length === 0) {
        throw new Error(
          "Không có học sinh hợp lệ để nhập."
        );
      }

      const { error } = await supabase
        .from("students")
        .insert(imported);

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Có mã học sinh bị trùng với dữ liệu đã có trong hệ thống."
          );
        }

        throw new Error(
          "Không thể nhập dữ liệu: " +
            error.message
        );
      }

      await loadStudents();

      setMessage(
        `Đã nhập thành công ${imported.length} học sinh.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể đọc file Excel."
      );
    } finally {
      setImporting(false);
    }
  }

  async function exportExcel() {
    clearMessages();

    if (filteredStudents.length === 0) {
      setErrorMessage(
        "Không có dữ liệu để xuất."
      );
      return;
    }

    const XLSX = await import("xlsx");

    const data = filteredStudents.map(
      (student, index) => {
        const classItem =
          classMap[student.class_id];

        return {
          STT: index + 1,
          "Mã học sinh":
            student.student_code ?? "",
          "Họ và tên": student.full_name,
          Lớp: classItem?.class_name ?? "",
          "Ngày sinh": formatDate(
            student.date_of_birth
          ),
          "Giới tính": student.gender ?? "",
          "Dân tộc": student.ethnicity ?? "",
          "Nơi ở": student.address ?? "",
          "Đội viên":
            student.is_union_member ? "Có" : "",
          "Chức vụ Đội":
            student.team_position || "Không",
          "Ghi chú": student.notes ?? "",
        };
      }
    );

    const worksheet =
      XLSX.utils.json_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 7 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
      { wch: 30 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Hoc sinh"
    );

    XLSX.writeFile(
      workbook,
      "Danh_sach_hoc_sinh.xlsx"
    );
  }

  return (
    <div className="students-module">
      <div className="students-header">
        <div className="students-title">
          <h2>👨‍🎓 Học sinh</h2>
        </div>

        <div className="students-header-actions">
          <div className="student-search-box">
            <span>🔎</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Tìm học sinh..."
            />
          </div>

          <select
            className="student-class-filter"
            value={filterClass}
            onChange={(e) =>
              setFilterClass(e.target.value)
            }
          >
            <option value="">
              Tất cả lớp
            </option>

            {classes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.class_name}
              </option>
            ))}
          </select>

          <button
            className="primary student-top-button"
            onClick={openAddForm}
          >
            + Thêm
          </button>

          <label className="excel-button">
  {importing ? "⏳ Đang nhập..." : "📥 Nhập Excel"}
  <input
    type="file"
    accept=".xlsx,.xls"
    onChange={importExcel}
    disabled={importing}
    style={{ display: "none" }}
  />
</label>

          <button
            className="excel-button"
            onClick={exportExcel}
          >
            📤 Xuất Excel
          </button>
        </div>
      </div>

      {message && (
        <div className="students-alert success">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="students-alert error">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="students-loading">
          Đang tải danh sách học sinh...
        </div>
      ) : (
        <div className="students-table-card">
          <div className="students-table-wrap">
            <table className="students-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã HS</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Ngày sinh</th>
                  <th>Giới tính</th>
                  <th>Dân tộc</th>
                  <th>Nơi ở</th>
                  <th>Đội viên</th>
                  <th>Chức vụ</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="students-empty"
                    >
                      Không có học sinh phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(
                    (student, index) => {
                      const classItem =
                        classMap[
                          student.class_id
                        ];

                      return (
                        <tr key={student.id}>
                          <td>{index + 1}</td>

                          <td>
                            {student.student_code ||
                              "—"}
                          </td>

                          <td>
                            <strong>
                              {student.full_name}
                            </strong>
                          </td>

                          <td>
                            <span className="class-badge">
                              {classItem?.class_name ||
                                "—"}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              student.date_of_birth
                            )}
                          </td>

                          <td>
                            {student.gender ||
                              "—"}
                          </td>

                          <td>
                            {student.ethnicity ||
                              "—"}
                          </td>

                          <td>
                            {student.address ||
                              "—"}
                          </td>

                          <td>
                            {student.is_union_member
                              ? "✓"
                              : ""}
                          </td>

                          <td>
                            {student.team_position ||
                              "Không"}
                          </td>

                          <td>
                            {student.notes || ""}
                          </td>

                          <td>
                            <div className="student-actions">
                              <button
                                className="student-edit-button"
                                onClick={() =>
                                  openEditForm(
                                    student
                                  )
                                }
                              >
                                ✏️ Sửa
                              </button>

                              <button
                                className="student-delete-button"
                                onClick={() =>
                                  deleteStudent(
                                    student
                                  )
                                }
                              >
                                🗑️ Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="student-modal-overlay">
          <div className="student-modal">
            <div className="student-modal-header">
              <div>
                <h2>
                  {editingId
                    ? "✏️ Sửa học sinh"
                    : "➕ Thêm học sinh"}
                </h2>

                <p>
                  Nhập thông tin học sinh
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <div className="student-form-grid">
              <div>
                <label>Mã học sinh</label>

                <input
                  value={form.student_code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      student_code:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Họ và tên *</label>

                <input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name:
                        e.target.value,
                    })
                  }
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div>
                <label>Lớp *</label>

                <select
                  value={form.class_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      class_id:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    — Chọn lớp —
                  </option>

                  {classes.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Ngày sinh</label>

                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      date_of_birth:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Giới tính</label>

                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gender:
                        e.target.value as
                          | ""
                          | "Nam"
                          | "Nữ",
                    })
                  }
                >
                  <option value="">
                    — Chọn —
                  </option>
                  <option value="Nam">
                    Nam
                  </option>
                  <option value="Nữ">
                    Nữ
                  </option>
                </select>
              </div>

              <div>
                <label>Dân tộc</label>

                <input
                  value={form.ethnicity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ethnicity:
                        e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Kinh"
                />
              </div>

              <div className="student-form-full">
                <label>Nơi ở</label>

                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address:
                        e.target.value,
                    })
                  }
                  placeholder="Nhập nơi ở"
                />
              </div>

              <div>
                <label>Chức vụ Đội</label>

                <select
                  value={form.team_position}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      team_position:
                        e.target.value,
                    })
                  }
                >
                  {POSITION_OPTIONS.map(
                    (position) => (
                      <option
                        key={position}
                        value={position}
                      >
                        {position}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="student-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={
                      form.is_union_member
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_union_member:
                          e.target.checked,
                      })
                    }
                  />

                  <span>Đội viên</span>
                </label>
              </div>

              <div className="student-form-full">
                <label>Ghi chú</label>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="students-alert error">
                {errorMessage}
              </div>
            )}

            <div className="student-modal-footer">
              <button
                className="outline-button"
                onClick={closeForm}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="primary"
                onClick={saveStudent}
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
