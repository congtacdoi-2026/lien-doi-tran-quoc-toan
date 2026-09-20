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

const POSITION_OPTIONS = [
  "Không",
  "Chi đội trưởng",
  "Chi đội phó",
  "Ủy viên",
  "Phân đội trưởng",
  "Phân đội phó",
  "Chức vụ khác",
];

export default function StudentsModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const emptyForm = {
    student_code: "",
    full_name: "",
    class_id: "",
    date_of_birth: "",
    gender: "" as "" | "Nam" | "Nữ",
    ethnicity: "",
    address: "",
    is_union_member: false,
    team_position: "Không",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

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
      setErrorMessage("Không tải được danh sách lớp: " + error.message);
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
      setErrorMessage("Không tải được danh sách học sinh: " + error.message);
      setLoading(false);
      return;
    }

    setStudents((data ?? []) as Student[]);
    setLoading(false);
  }

  const classMap = useMemo(() => {
    const map: Record<string, ClassItem> = {};

    for (const item of classes) {
      map[item.id] = item;
    }

    return map;
  }, [classes]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      const classItem = classMap[student.class_id];

      const matchSearch =
        !keyword ||
        student.full_name.toLowerCase().includes(keyword) ||
        (student.student_code ?? "").toLowerCase().includes(keyword);

      const matchClass =
        !filterClass || student.class_id === filterClass;

      const matchGrade =
        !filterGrade ||
        String(classItem?.grade ?? "") === filterGrade;

      return matchSearch && matchClass && matchGrade;
    });
  }, [students, classMap, search, filterClass, filterGrade]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function openEditForm(student: Student) {
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

    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveStudent() {
    setMessage("");
    setErrorMessage("");

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
      student_code: form.student_code.trim() || null,
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

    let error;

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
          "Mã học sinh đã tồn tại. Vui lòng kiểm tra lại."
        );
      } else {
        setErrorMessage(
          "Không lưu được học sinh: " + error.message
        );
      }

      return;
    }

    setMessage(
      editingId
        ? "Đã cập nhật thông tin học sinh."
        : "Đã thêm học sinh mới."
    );

    await loadStudents();

    setTimeout(() => {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setMessage("");
    }, 700);
  }

  async function deleteStudent(student: Student) {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa học sinh "${student.full_name}" không?`
    );

    if (!ok) return;

    setErrorMessage("");
    setMessage("");

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      setErrorMessage("Không thể xóa học sinh: " + error.message);
      return;
    }

    setMessage("Đã xóa học sinh.");
    await loadStudents();

    setTimeout(() => setMessage(""), 1500);
  }

  function formatDate(date: string | null) {
    if (!date) return "";

    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function exportCSV() {
    const headers = [
      "STT",
      "Mã học sinh",
      "Họ và tên",
      "Lớp",
      "Ngày sinh",
      "Giới tính",
      "Dân tộc",
      "Nơi ở",
      "Đội viên",
      "Chức vụ Đội",
      "Ghi chú",
    ];

    const rows = filteredStudents.map((student, index) => {
      const classItem = classMap[student.class_id];

      return [
        index + 1,
        student.student_code ?? "",
        student.full_name,
        classItem?.class_name ?? "",
        formatDate(student.date_of_birth),
        student.gender ?? "",
        student.ethnicity ?? "",
        student.address ?? "",
        student.is_union_member ? "Có" : "Không",
        student.team_position,
        student.notes ?? "",
      ];
    });

    const escapeCSV = (value: unknown) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "Danh_sach_hoc_sinh.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setSearch("");
    setFilterClass("");
    setFilterGrade("");
  }

  const mainClasses = classes.filter(
    (item) => item.campus === "Trường chính"
  );

  const pointClasses = classes.filter(
    (item) => item.campus === "Điểm trường"
  );

  return (
    <div className="students-module">
      <div className="students-header">
        <div>
          <h2>👨‍🎓 Danh sách học sinh</h2>

          <p>
            Quản lý hồ sơ học sinh của Liên đội
          </p>
        </div>

        <div className="students-header-actions">
          <button
            className="outline-button"
            onClick={exportCSV}
          >
            📤 Xuất danh sách
          </button>

          <button
            className="primary"
            onClick={openAddForm}
          >
            ➕ Thêm học sinh
          </button>
        </div>
      </div>

      {(message || errorMessage) && (
        <div
          className={
            errorMessage
              ? "students-alert error"
              : "students-alert success"
          }
        >
          {errorMessage || message}
        </div>
      )}

      <div className="students-stats">
        <div>
          <span>Tổng học sinh</span>
          <strong>{students.length}</strong>
        </div>

        <div>
          <span>Đang hiển thị</span>
          <strong>{filteredStudents.length}</strong>
        </div>

        <div>
          <span>Trường chính</span>
          <strong>{mainClasses.length}</strong>
        </div>

        <div>
          <span>Điểm trường</span>
          <strong>{pointClasses.length}</strong>
        </div>
      </div>

      <div className="students-filter">
        <div className="student-search">
          <label>Tìm kiếm</label>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tên hoặc mã học sinh..."
          />
        </div>

        <div>
          <label>Khối</label>

          <select
            value={filterGrade}
            onChange={(e) => {
              setFilterGrade(e.target.value);
              setFilterClass("");
            }}
          >
            <option value="">Tất cả khối</option>
            <option value="1">Khối 1</option>
            <option value="2">Khối 2</option>
            <option value="3">Khối 3</option>
            <option value="4">Khối 4</option>
            <option value="5">Khối 5</option>
          </select>
        </div>

        <div>
          <label>Lớp</label>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">Tất cả lớp</option>

            {classes
              .filter(
                (item) =>
                  !filterGrade ||
                  String(item.grade) === filterGrade
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name}
                </option>
              ))}
          </select>
        </div>

        <button
          className="outline-button filter-reset"
          onClick={resetFilters}
        >
          ↻ Xóa lọc
        </button>
      </div>

      <div className="students-table-card">
        {loading ? (
          <div className="students-loading">
            Đang tải danh sách học sinh...
          </div>
        ) : (
          <div className="students-table-wrap">
            <table className="students-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã học sinh</th>
                  <th>Họ và tên</th>
                  <th>Lớp</th>
                  <th>Ngày sinh</th>
                  <th>Giới tính</th>
                  <th>Dân tộc</th>
                  <th>Nơi ở</th>
                  <th>Đội viên</th>
                  <th>Chức vụ Đội</th>
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
                      Chưa có học sinh phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => {
                    const classItem =
                      classMap[student.class_id];

                    return (
                      <tr key={student.id}>
                        <td>{index + 1}</td>

                        <td>
                          {student.student_code || "—"}
                        </td>

                        <td>
                          <strong>{student.full_name}</strong>
                        </td>

                        <td>
                          <span className="class-badge">
                            {classItem?.class_name || "—"}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            student.date_of_birth
                          )}
                        </td>

                        <td>
                          {student.gender || "—"}
                        </td>

                        <td>
                          {student.ethnicity || "—"}
                        </td>

                        <td>
                          {student.address || "—"}
                        </td>

                        <td>
                          {student.is_union_member ? (
                            <span className="member-yes">
                              ✓ Có
                            </span>
                          ) : (
                            <span className="member-no">
                              Không
                            </span>
                          )}
                        </td>

                        <td>
                          {student.team_position || "Không"}
                        </td>

                        <td>
                          {student.notes || "—"}
                        </td>

                        <td>
                          <div className="student-actions">
                            <button
                              onClick={() =>
                                openEditForm(student)
                              }
                              title="Sửa"
                            >
                              ✏️
                            </button>

                            <button
                              onClick={() =>
                                deleteStudent(student)
                              }
                              title="Xóa"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  Nhập đầy đủ thông tin học sinh
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeForm}
                disabled={saving}
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
                      student_code: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: HS0001"
                />
              </div>

              <div>
                <label>Họ và tên *</label>

                <input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name: e.target.value,
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
                      class_id: e.target.value,
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
                      {" · "}
                      {item.campus}
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
                      date_of_birth: e.target.value,
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
                      gender: e.target.value as
                        | ""
                        | "Nam"
                        | "Nữ",
                    })
                  }
                >
                  <option value="">
                    — Chọn —
                  </option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <label>Dân tộc</label>

                <input
                  value={form.ethnicity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ethnicity: e.target.value,
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
                      address: e.target.value,
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
                      team_position: e.target.value,
                    })
                  }
                >
                  {POSITION_OPTIONS.map((position) => (
                    <option
                      key={position}
                      value={position}
                    >
                      {position}
                    </option>
                  ))}
                </select>
              </div>

              <div className="student-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_union_member}
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
                  placeholder="Nhập ghi chú nếu có..."
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
                  : "💾 Lưu học sinh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
