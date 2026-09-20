 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StudentsModule from "./StudentsModule";
import StudentStatistics from "./StudentStatistics";
import WeeklyCompetition from "./WeeklyCompetition";

type Role = "TPT" | "CLASS" | null;

type MenuItem = {
  name: string;
  icon: string;
};

const menu: MenuItem[] = [
  { name: "Tổng quan", icon: "🏠" },
  { name: "Học sinh", icon: "👨‍🎓" },
  { name: "Thống kê học sinh", icon: "📊" },
  { name: "Thi đua tuần", icon: "🏆" },
  { name: "Hoạt động Đội", icon: "🎯" },
  { name: "Vi phạm", icon: "⚠️" },
  { name: "Khen thưởng", icon: "🎁" },
  { name: "RLĐV", icon: "⭐" },
  { name: "Cài đặt", icon: "⚙️" },
];

const ranking = [
  { rank: 1, className: "1A1", total: 0 },
  { rank: 2, className: "1A2", total: 0 },
  { rank: 3, className: "1A3", total: 0 },
  { rank: 4, className: "1A4", total: 0 },
  { rank: 5, className: "1A5", total: 0 },
];

const activities = [
  {
    icon: "🎯",
    title: "Hoạt động Đội",
    text: "Chưa có hoạt động mới",
    date: "",
  },
  {
    icon: "📚",
    title: "Sinh hoạt Đội",
    text: "Sẵn sàng cập nhật",
    date: "",
  },
  {
    icon: "🌱",
    title: "Phong trào",
    text: "Chưa có dữ liệu",
    date: "",
  },
];


type TeamActivityRole = "TPT" | "CLASS";

type Activity = {
  id: string;
  activity_date: string;
  activity_name: string;
  participants: string | null;
  notes: string | null;
};

type FormState = {
  activity_date: string;
  activity_name: string;
  participants: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  activity_date: "",
  activity_name: "",
  participants: "",
  notes: "",
};

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function toInputDate(value: string) {
  return value || new Date().toISOString().slice(0, 10);
}

function TeamActivities({
  role = "TPT",
}: {
  role?: Role;
}) {
  const canEdit = role === "TPT";

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadActivities() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("team_activities")
      .select("id, activity_date, activity_name, participants, notes")
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(`Không tải được hoạt động: ${queryError.message}`);
      setActivities([]);
    } else {
      setActivities((data as Activity[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadActivities();
  }, []);

  const title = useMemo(
    () => (editingId ? "Sửa hoạt động Đội" : "Thêm hoạt động Đội"),
    [editingId]
  );

  function openAdd() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      activity_date: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEdit(activity: Activity) {
    setEditingId(activity.id);
    setForm({
      activity_date: toInputDate(activity.activity_date),
      activity_name: activity.activity_name,
      participants: activity.participants ?? "",
      notes: activity.notes ?? "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveActivity() {
    if (!canEdit) return;

    setError("");
    setMessage("");

    if (!form.activity_date) {
      setError("Vui lòng chọn thời gian.");
      return;
    }

    if (!form.activity_name.trim()) {
      setError("Vui lòng nhập tên hoạt động.");
      return;
    }

    setSaving(true);

    const payload = {
      activity_date: form.activity_date,
      activity_name: form.activity_name.trim(),
      participants: form.participants.trim() || null,
      notes: form.notes.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("team_activities")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("team_activities").insert(payload);

    if (result.error) {
      setError(
        `${editingId ? "Không sửa được" : "Không thêm được"} hoạt động: ${
          result.error.message
        }`
      );
      setSaving(false);
      return;
    }

    setMessage(editingId ? "Đã cập nhật hoạt động." : "Đã thêm hoạt động.");
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    await loadActivities();
  }

  async function deleteActivity(activity: Activity) {
    if (!canEdit) return;

    const ok = window.confirm(
      `Bạn có chắc muốn xóa hoạt động "${activity.activity_name}" ngày ${formatDate(
        activity.activity_date
      )}?`
    );

    if (!ok) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("team_activities")
      .delete()
      .eq("id", activity.id);

    if (deleteError) {
      setError(`Không xóa được hoạt động: ${deleteError.message}`);
      return;
    }

    setMessage("Đã xóa hoạt động.");
    await loadActivities();
  }

  return (
    <section className="team-activities-page">
      <div className="team-activities-card">
        <div className="team-activities-heading">
          <div className="team-activities-title">
            <span className="team-activities-title-icon">🎯</span>
            <h2>Hoạt động Đội</h2>
          </div>

          {canEdit && (
            <button className="team-activities-add" onClick={openAdd}>
              + Thêm hoạt động
            </button>
          )}
        </div>

        <div className="team-activities-notice">
          {canEdit
            ? "Tổng phụ trách có thể thêm, sửa và xóa các hoạt động."
            : "Tài khoản lớp chỉ được xem danh sách hoạt động."}
        </div>

        {message && (
          <div className="team-activities-message">{message}</div>
        )}

        {error && <div className="team-activities-error">{error}</div>}

        <div className="team-activities-table-wrap">
          <table className="team-activities-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Ngày</th>
                <th>Hoạt động</th>
                <th>Đối tượng</th>
                <th>Ghi chú</th>
                {canEdit && <th>Thao tác</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="team-activities-empty"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="team-activities-empty"
                  >
                    Chưa có hoạt động.
                  </td>
                </tr>
              ) : (
                activities.map((activity, index) => (
                  <tr key={activity.id}>
                    <td>{index + 1}</td>
                    <td>{formatDate(activity.activity_date)}</td>
                    <td className="activity-name">
                      {activity.activity_name}
                    </td>
                    <td>{activity.participants || ""}</td>
                    <td>{activity.notes || ""}</td>

                    {canEdit && (
                      <td className="team-activities-actions">
                        <button
                          className="team-activities-edit"
                          onClick={() => openEdit(activity)}
                        >
                          ✏️ Sửa
                        </button>

                        <button
                          className="team-activities-delete"
                          onClick={() => deleteActivity(activity)}
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && canEdit && (
        <div className="team-activities-modal-overlay">
          <div className="team-activities-modal">
            <div className="team-activities-modal-header">
              <div>
                <span>🎯</span>
                <h3>{title}</h3>
              </div>

              <button
                className="team-activities-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="team-activities-form">
              <label>
                Thời gian
                <input
                  type="date"
                  value={form.activity_date}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      activity_date: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Tên hoạt động
                <input
                  value={form.activity_name}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      activity_name: e.target.value,
                    }))
                  }
                  placeholder="Nhập tên hoạt động"
                />
              </label>

              <label>
                Đối tượng tham gia
                <input
                  value={form.participants}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      participants: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Học sinh toàn trường"
                />
              </label>

              <label>
                Ghi chú
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Nhập ghi chú"
                  rows={4}
                />
              </label>
            </div>

            <div className="team-activities-modal-footer">
              <button
                className="team-activities-cancel"
                onClick={closeForm}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="team-activities-save"
                onClick={saveActivity}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu hoạt động"}
              </button>
            </div>
          </div>
        </div>
      )}
\n      <style jsx global>{`\n
/* =========================================================
   HOẠT ĐỘNG ĐỘI
   ========================================================= */

.team-activities-page {
  padding: 24px 28px 36px;
}

.team-activities-card {
  width: 100%;
  box-sizing: border-box;
  padding: 28px;
  border: 1px solid #e1e7ef;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, .07);
}

.team-activities-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.team-activities-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.team-activities-title-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 14px;
  background: #eef7ff;
  font-size: 26px;
}

.team-activities-title h2 {
  margin: 0;
  color: #17233c;
  font-size: 27px;
  font-weight: 850;
}

.team-activities-add {
  border: 0;
  border-radius: 14px;
  padding: 13px 20px;
  color: #fff;
  background: #1976d2;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 5px 12px rgba(25,118,210,.18);
}

.team-activities-add:hover {
  background: #1266bd;
}

.team-activities-notice {
  margin-bottom: 28px;
  padding: 17px 20px;
  border: 1px solid #f3cf58;
  border-radius: 15px;
  color: #23344f;
  background: #fff9df;
  font-size: 16px;
}

.team-activities-message,
.team-activities-error {
  margin-bottom: 16px;
  padding: 12px 15px;
  border-radius: 12px;
  font-size: 14px;
}

.team-activities-message {
  color: #087443;
  background: #eafaf2;
  border: 1px solid #b9efd3;
}

.team-activities-error {
  color: #b42318;
  background: #fff1f0;
  border: 1px solid #ffc8c3;
}

.team-activities-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #dfe5ec;
  border-radius: 17px;
}

.team-activities-table {
  width: 100%;
  min-width: 900px;
  border-collapse: separate;
  border-spacing: 0;
  color: #26344c;
  font-size: 16px;
}

.team-activities-table th {
  padding: 16px 14px;
  border-right: 1px solid #dfe5ec;
  border-bottom: 1px solid #dfe5ec;
  background: #f7f9fc;
  color: #182c4c;
  text-align: center;
  font-weight: 850;
  white-space: nowrap;
}

.team-activities-table th:last-child {
  border-right: 0;
}

.team-activities-table td {
  padding: 15px 14px;
  border-right: 1px solid #e1e6ec;
  border-bottom: 1px solid #e1e6ec;
  vertical-align: middle;
}

.team-activities-table tbody tr:last-child td {
  border-bottom: 0;
}

.team-activities-table td:last-child {
  border-right: 0;
}

.team-activities-table td:first-child,
.team-activities-table td:nth-child(2),
.team-activities-table th:first-child,
.team-activities-table th:nth-child(2) {
  text-align: center;
}

.team-activities-table .activity-name {
  font-weight: 800;
  color: #17233c;
}

.team-activities-empty {
  padding: 36px !important;
  color: #75839a;
  text-align: center !important;
}

.team-activities-actions {
  white-space: nowrap;
  text-align: center;
}

.team-activities-edit,
.team-activities-delete {
  margin: 2px;
  padding: 10px 14px;
  border: 0;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.team-activities-edit {
  color: #1267b3;
  background: #edf5ff;
}

.team-activities-delete {
  color: #b42318;
  background: #fff0ef;
}

.team-activities-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, .52);
}

.team-activities-modal {
  width: min(560px, 100%);
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 25px 70px rgba(15,23,42,.28);
}

.team-activities-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 19px 22px;
  border-bottom: 1px solid #e6ebf1;
}

.team-activities-modal-header > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.team-activities-modal-header h3 {
  margin: 0;
  color: #17233c;
  font-size: 19px;
}

.team-activities-modal-close {
  width: 34px;
  height: 34px;
  border: 1px solid #dce3eb;
  border-radius: 9px;
  background: #fff;
  color: #64748b;
  font-size: 24px;
  cursor: pointer;
}

.team-activities-form {
  display: grid;
  gap: 15px;
  padding: 22px;
}

.team-activities-form label {
  display: grid;
  gap: 7px;
  color: #26344c;
  font-size: 14px;
  font-weight: 800;
}

.team-activities-form input,
.team-activities-form textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #d5dee8;
  border-radius: 10px;
  outline: none;
  color: #17233c;
  background: #fff;
  font: inherit;
}

.team-activities-form input:focus,
.team-activities-form textarea:focus {
  border-color: #2788dc;
  box-shadow: 0 0 0 3px rgba(39,136,220,.1);
}

.team-activities-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 22px 20px;
  border-top: 1px solid #e6ebf1;
}

.team-activities-cancel,
.team-activities-save {
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
}

.team-activities-cancel {
  border: 1px solid #d7dfe8;
  background: #fff;
  color: #526174;
}

.team-activities-save {
  border: 0;
  background: #1976d2;
  color: #fff;
}

@media (max-width: 700px) {
  .team-activities-page {
    padding: 14px;
  }

  .team-activities-card {
    padding: 16px;
    border-radius: 16px;
  }

  .team-activities-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .team-activities-add {
    width: 100%;
  }

  .team-activities-title h2 {
    font-size: 23px;
  }
}
\n      `}</style>
    </section>
  );
}


export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"TPT" | "CLASS">("TPT");

  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<any>(null);
  const [active, setActive] = useState("Tổng quan");
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [studentCount, setStudentCount] = useState(0);
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [childCounts, setChildCounts] = useState([0, 0, 0, 0, 0]);
  const [classCount, setClassCount] = useState(0);
  const [competitionClassCount, setCompetitionClassCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadProfile(data.session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadProfile(session.user.id);
        } else {
          setRole(null);
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (role && active === "Tổng quan") {
      loadDashboardData();
    }
  }, [role, active]);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      setMessage("Đăng nhập được nhưng chưa đọc được hồ sơ người dùng.");
      return;
    }

    setProfile(data);
    setRole(data.role);
  }

  async function loadDashboardData() {
    const [studentsResult, classesResult, settingResult] = await Promise.all([
      supabase
        .from("students")
        .select("id,class_id,is_union_member"),
      supabase
        .from("classes")
        .select("id,grade,campus,competition_enabled")
        .eq("is_active", true),
      supabase
        .from("system_settings")
        .select("current_week")
        .limit(1)
        .maybeSingle(),
    ]);

    const students = (studentsResult.data ?? []) as {
      id: string;
      class_id: string;
      is_union_member: boolean;
    }[];
    const classes = (classesResult.data ?? []) as {
      id: string;
      grade: number;
      campus: string;
      competition_enabled: boolean;
    }[];

    setStudentCount(students.length);
    setTeamMemberCount(students.filter((item) => item.is_union_member).length);
    setClassCount(classes.length);
    setCompetitionClassCount(classes.filter((item) => item.competition_enabled).length);

    const gradeByClass = new Map(classes.map((item) => [item.id, item.grade]));
    const counts = [0, 0, 0, 0, 0];
    students.forEach((student) => {
      const grade = gradeByClass.get(student.class_id);
      if (grade && grade >= 1 && grade <= 5) counts[grade - 1] += 1;
    });
    setChildCounts(counts);

    if (typeof settingResult.data?.current_week === "number") {
      setCurrentWeek(settingResult.data.current_week);
    }
  }

  async function handleTptLogin(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("Đăng nhập thất bại: " + error.message);
    }
  }

  async function handleClassLogin(e: FormEvent) {
    e.preventDefault();

    setMessage(
      "Đăng nhập tài khoản lớp sẽ được kết nối sau khi hoàn thiện hệ thống 47 tài khoản lớp."
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    setActive("Tổng quan");
  }

  if (!role) {
    return (
      <main className="login-page">
        <div className="login-decoration decoration-one">⭐</div>
        <div className="login-decoration decoration-two">🌼</div>

        <section className="login-card">
          <div className="login-logo">
            <div className="login-logo-inner">Đ</div>
          </div>

          <div className="login-title">
            <span>LIÊN ĐỘI</span>
            <strong>TRƯỜNG TIỂU HỌC</strong>
            <strong>TRẦN QUỐC TOẢN</strong>
          </div>

          <p className="login-subtitle">
            Quản lý công tác Đội trực tuyến
          </p>

          <div className="login-tabs">
            <button
              className={loginMode === "TPT" ? "tab active" : "tab"}
              onClick={() => setLoginMode("TPT")}
            >
              👩‍🏫 Tổng phụ trách
            </button>

            <button
              className={loginMode === "CLASS" ? "tab active" : "tab"}
              onClick={() => setLoginMode("CLASS")}
            >
              👥 Tài khoản lớp
            </button>
          </div>

          {loginMode === "TPT" ? (
            <form onSubmit={handleTptLogin} className="form">
              <label>Email TPT</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email TPT"
                required
              />

              <label>Mật khẩu</label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />

              <button className="primary login-button" type="submit">
                🔐 Đăng nhập
              </button>
            </form>
          ) : (
            <form onSubmit={handleClassLogin} className="form">
              <label>Tên lớp</label>

              <input
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Ví dụ: 1A1"
                required
              />

              <label>Mật khẩu</label>

              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />

              <button className="primary login-button" type="submit">
                🔐 Đăng nhập
              </button>
            </form>
          )}

          {message && <div className="message">{message}</div>}

          <div className="login-footer">
            <span>🌟 Đoàn kết</span>
            <span>⭐ Kỷ luật</span>
            <span>💡 Sáng tạo</span>
            <span>🚀 Vươn lên</span>
          </div>

          <p className="safe-note">
            Hệ thống mới sử dụng Supabase riêng, không kết nối dữ liệu ứng dụng
            cũ.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style jsx global>{`
        /* ===== GIAO DIỆN SIDEBAR + TỔNG QUAN GỌN HƠN ===== */
        .sidebar {
          min-height: 100vh !important;
          height: 100vh !important;
          box-sizing: border-box !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }

        .sidebar-bottom {
          margin-top: auto !important;
          padding-bottom: 18px !important;
        }

        .nav-item {
          min-height: 48px !important;
          height: 48px !important;
          padding: 8px 14px !important;
          margin-bottom: 3px !important;
        }

        .nav-icon {
          line-height: 1 !important;
        }

        .logout {
          color: #ffffff !important;
          background: rgba(255,255,255,0.10) !important;
          border: 1px solid rgba(255,255,255,0.16) !important;
          border-radius: 12px !important;
          min-height: 44px !important;
          padding: 9px 14px !important;
        }

        .logout:hover {
          color: #ffffff !important;
          background: rgba(255,255,255,0.18) !important;
        }

        .side-slogan,
        .side-slogan strong,
        .side-slogan span {
          color: rgba(255,255,255,0.92) !important;
        }

        /* Tổng quan: giảm chiều cao và khoảng cách một chút */
        .dashboard {
          padding-top: 8px !important;
        }

        .dashboard .hero {
          padding: 18px 24px !important;
          margin-bottom: 12px !important;
          min-height: 108px !important;
        }

        .dashboard .hero-icon {
          width: 62px !important;
          height: 62px !important;
        }

        .dashboard .hero h2 {
          margin: 0 0 5px !important;
        }

        .dashboard .hero p {
          margin: 0 !important;
          line-height: 1.35 !important;
        }

        .dashboard .quote-card {
          padding: 13px 22px !important;
          margin-bottom: 14px !important;
          min-height: 72px !important;
        }

        .dashboard .stat-grid {
          gap: 12px !important;
          margin-bottom: 14px !important;
        }

        .dashboard .stat-card {
          min-height: 108px !important;
          padding: 13px 15px !important;
        }

        .dashboard .stat-icon {
          width: 54px !important;
          height: 54px !important;
        }

        .dashboard .dashboard-grid {
          gap: 14px !important;
        }

        .dashboard .panel {
          padding: 16px !important;
        }

        .dashboard .activity-row {
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          font: inherit;
          cursor: pointer;
        }

        .dashboard .activity-row:hover {
          background: #f7fbff;
          border-radius: 12px;
        }

        .dashboard .text-button:not(:disabled) {
          cursor: pointer;
        }

        .dashboard .text-button:disabled {
          cursor: default;
          opacity: 1;
        }

        .dashboard .dashboard-nav-button {
          position: relative;
          z-index: 5;
          pointer-events: auto !important;
        }

        .dashboard .dashboard-ranking-position .ranking-head,
        .dashboard .dashboard-ranking-position .ranking-row {
          grid-template-columns: 1fr 120px !important;
        }

        .dashboard .dashboard-ranking-position .ranking-head span:last-child,
        .dashboard .dashboard-ranking-position .ranking-row span:last-child {
          text-align: center;
        }

        @media (max-height: 850px) {
          .nav-item {
            min-height: 44px !important;
            height: 44px !important;
            padding: 6px 14px !important;
          }

          .sidebar-bottom {
            padding-bottom: 10px !important;
          }
        }

        @media (max-width: 900px) {
          .sidebar {
            height: 100vh !important;
          }
        }
      `}</style>

      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="side-brand">
          <div className="side-logo">Đ</div>

          <div className="side-brand-text">
            <strong>LIÊN ĐỘI</strong>
            <span>TRƯỜNG TIỂU HỌC</span>
            <span>TRẦN QUỐC TOẢN</span>
          </div>
        </div>

        <div className="school-motto">
          <span>Thiếu nhi hôm nay</span>
          <strong>Thế giới ngày mai</strong>
        </div>

        <nav className="main-nav">
          {menu.map((item) => (
            <button
              key={item.name}
              className={
                active === item.name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => {
                setActive(item.name);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="side-decoration">🌻</div>

          <div className="side-slogan">
            <strong>Đoàn kết - Kỷ luật</strong>
            <span>Sáng tạo - Vươn lên</span>
          </div>

          <button className="logout" onClick={logout}>
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <div className="page-heading">
            <h1>{active}</h1>

            <p>
              {role === "TPT"
                ? "Tổng phụ trách · Toàn trường"
                : `Tài khoản lớp · ${profile?.class_id ?? ""}`}
            </p>
          </div>

          <div className="top-actions">
            <div className="school-year">
              📅 Năm học 2026–2027
            </div>

            <button className="notification">
              🔔
              <span>3</span>
            </button>

            <div className="user-box">
              <div className="user-avatar">👩‍🏫</div>
              <div>
                <strong>Tổng phụ trách</strong>
                <span>Toàn trường</span>
              </div>
            </div>
          </div>
        </header>

        {active === "Tổng quan" ? (
          <Dashboard
            studentCount={studentCount}
            teamMemberCount={teamMemberCount}
            childCount={childCounts[0] + childCounts[1] + childCounts[2]}
            gradeCounts={childCounts}
            classCount={classCount}
            competitionClassCount={competitionClassCount}
            currentWeek={currentWeek}
            ranking={ranking}
            activities={activities}
            onNavigate={setActive}
          />
        ) : active === "Học sinh" ? (
          <StudentsModule />
        ) : active === "Thống kê học sinh" ? (
          <StudentStatistics />
        ) : active === "Thi đua tuần" ? (
          <WeeklyCompetition />
        ) : active === "Hoạt động Đội" ? (
          <TeamActivities role={role === "TPT" ? "TPT" : "CLASS"} />
        ) : active === "Vi phạm" ? (
          <StudentRecordsModule kind="violation" />
        ) : active === "Khen thưởng" ? (
          <StudentRecordsModule kind="reward" />
        ) : active === "RLĐV" ? (
          <RLDVModule role={role === "TPT" ? "TPT" : "CLASS"} />
        ) : active === "Cài đặt" ? (
          <SettingsModule role={role === "TPT" ? "TPT" : "CLASS"} onWeekSaved={setCurrentWeek} />
        ) : (
          <ComingSoon title={active} />
        )}
      </main>
    </div>
  );
}

type RecordKind = "violation" | "reward";

type RecordStudent = {
  id: string;
  full_name: string;
  class_id: string;
};

type RecordClass = {
  id: string;
  class_name: string;
};

type RecordItem = {
  id: string;
  date: string;
  student_id: string | null;
  content: string;
  notes: string | null;
};

function StudentRecordsModule({ kind }: { kind: RecordKind }) {
  const isViolation = kind === "violation";
  const title = isViolation ? "Vi phạm" : "Khen thưởng";
  const icon = isViolation ? "🚨" : "🎁";
  const contentLabel = isViolation ? "Nội dung" : "Thành tích";
  const tableName = isViolation ? "violations" : "rewards";

  const [rows, setRows] = useState<RecordItem[]>([]);
  const [students, setStudents] = useState<RecordStudent[]>([]);
  const [classes, setClasses] = useState<RecordClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    student_id: "",
    content: "",
    notes: "",
  });

  const classMap = useMemo(
    () => new Map(classes.map((item) => [item.id, item.class_name])),
    [classes]
  );

  const studentMap = useMemo(
    () => new Map(students.map((item) => [item.id, item])),
    [students]
  );

  async function loadData() {
    setLoading(true);
    setError("");

    const [recordsResult, studentsResult, classesResult] = await Promise.all([
      supabase
        .from(tableName)
        .select(
          isViolation
            ? "id, violation_date, student_id, violation_content, notes"
            : "id, reward_date, student_id, reward_content, notes"
        )
        .order(isViolation ? "violation_date" : "reward_date", { ascending: false }),
      supabase
        .from("students")
        .select("id, full_name, class_id")
        .order("full_name", { ascending: true }),
      supabase.from("classes").select("id, class_name").order("class_name"),
    ]);

    if (recordsResult.error) {
      // Rewards use different column names, so load them with the correct query.
      const retry = await supabase
        .from(tableName)
        .select("*")
        .order(isViolation ? "violation_date" : "reward_date", { ascending: false });

      if (retry.error) {
        setError(`Không tải được dữ liệu ${title.toLowerCase()}: ${retry.error.message}`);
        setRows([]);
      } else {
        setRows(
          ((retry.data ?? []) as any[]).map((item) => ({
            id: item.id,
            date: isViolation ? item.violation_date : item.reward_date,
            student_id: item.student_id ?? null,
            content: isViolation ? item.violation_content : item.reward_content,
            notes: item.notes ?? null,
          }))
        );
      }
    } else {
      setRows(
        ((recordsResult.data ?? []) as any[]).map((item) => ({
          id: item.id,
          date: isViolation ? item.violation_date : item.reward_date,
          student_id: item.student_id ?? null,
          content: isViolation ? item.violation_content : item.reward_content,
          notes: item.notes ?? null,
        }))
      );
    }

    if (studentsResult.error) {
      setError(`Không tải được danh sách học sinh: ${studentsResult.error.message}`);
      setStudents([]);
    } else {
      setStudents((studentsResult.data as RecordStudent[]) ?? []);
    }

    if (classesResult.error) {
      setClasses([]);
    } else {
      setClasses((classesResult.data as RecordClass[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [kind]);

  function openAdd() {
    setEditingId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      student_id: students[0]?.id ?? "",
      content: "",
      notes: "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEdit(row: RecordItem) {
    setEditingId(row.id);
    setForm({
      date: row.date || new Date().toISOString().slice(0, 10),
      student_id: row.student_id ?? "",
      content: row.content,
      notes: row.notes ?? "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
  }

  async function saveRecord() {
    setError("");
    setMessage("");

    if (!form.date) {
      setError("Vui lòng chọn ngày.");
      return;
    }
    if (!form.student_id) {
      setError("Vui lòng chọn học sinh.");
      return;
    }
    if (!form.content.trim()) {
      setError(`Vui lòng nhập ${contentLabel.toLowerCase()}.`);
      return;
    }

    setSaving(true);

    let result;

    if (isViolation) {
      const payload = {
        violation_date: form.date,
        student_id: form.student_id,
        violation_content: form.content.trim(),
        notes: form.notes.trim() || null,
      };

      result = editingId
        ? await supabase.from("violations").update(payload).eq("id", editingId)
        : await supabase.from("violations").insert(payload);
    } else {
      const payload = {
        reward_date: form.date,
        student_id: form.student_id,
        reward_content: form.content.trim(),
        reward_type: null,
        notes: form.notes.trim() || null,
      };

      result = editingId
        ? await supabase.from("rewards").update(payload).eq("id", editingId)
        : await supabase.from("rewards").insert(payload);
    }

    setSaving(false);

    if (result.error) {
      setError(`Không lưu được ${title.toLowerCase()}: ${result.error.message}`);
      return;
    }

    setMessage(editingId ? "Đã cập nhật." : "Đã ghi nhận.");
    setShowForm(false);
    setEditingId(null);
    await loadData();
  }

  async function deleteRecord(id: string) {
    if (!window.confirm(`Xóa bản ghi ${isViolation ? "vi phạm" : "khen thưởng"} này?`)) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(`Không xóa được: ${deleteError.message}`);
      return;
    }

    setMessage("Đã xóa.");
    await loadData();
  }

  return (
    <section className="records-page">
      <div className="records-card">
        <div className="records-heading">
          <h2>
            {icon} {title}
          </h2>
          <button className="records-add" onClick={openAdd}>
            + Ghi nhận
          </button>
        </div>

        {message && <div className="records-message">{message}</div>}
        {error && <div className="records-error">{error}</div>}

        <div className="records-table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Họ tên</th>
                <th>Lớp</th>
                <th>{contentLabel}</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="records-empty">Đang tải dữ liệu...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="records-empty">Chưa có dữ liệu.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const student = row.student_id ? studentMap.get(row.student_id) : undefined;
                  return (
                    <tr key={row.id}>
                      <td className="records-date">{formatDate(row.date)}</td>
                      <td>{student?.full_name ?? "—"}</td>
                      <td>{student ? classMap.get(student.class_id) ?? "—" : "—"}</td>
                      <td className="records-content">{row.content}</td>
                      <td>{row.notes || "—"}</td>
                      <td className="records-actions">
                        <button className="records-edit" onClick={() => openEdit(row)}>Sửa</button>
                        <button className="records-delete" onClick={() => deleteRecord(row.id)}>Xóa</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="records-overlay" onMouseDown={closeForm}>
          <div className="records-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="records-modal-header">
              <h3>{editingId ? `Sửa ${title.toLowerCase()}` : `Ghi nhận ${title.toLowerCase()}`}</h3>
              <button className="records-close" onClick={closeForm}>×</button>
            </div>

            <div className="records-form">
              <label>
                Ngày
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>

              <label>
                Họ tên học sinh
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                >
                  <option value="">-- Chọn học sinh --</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} — {classMap.get(student.class_id) ?? ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {contentLabel}
                <textarea
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={isViolation ? "Nhập nội dung vi phạm" : "Nhập thành tích"}
                />
              </label>

              <label>
                Ghi chú
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Có thể để trống"
                />
              </label>
            </div>

            <div className="records-modal-footer">
              <button className="records-cancel" onClick={closeForm}>Hủy</button>
              <button className="records-save" onClick={saveRecord} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .records-page { padding: 24px; }
        .records-card { background:#fff; border:1px solid #e2e8f0; border-radius:22px; padding:30px; box-shadow:0 8px 30px rgba(15,23,42,.05); }
        .records-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:26px; }
        .records-heading h2 { margin:0; color:#12213a; font-size:28px; font-weight:850; }
        .records-add { border:0; border-radius:13px; padding:13px 22px; background:#1976d2; color:#fff; font-size:16px; font-weight:800; cursor:pointer; }
        .records-add:hover { background:#1266bd; }
        .records-message,.records-error { margin-bottom:16px; padding:12px 15px; border-radius:12px; font-size:14px; }
        .records-message { color:#087443; background:#eafaf2; border:1px solid #b9efd3; }
        .records-error { color:#b42318; background:#fff1f0; border:1px solid #ffc8c3; }
        .records-table-wrap { width:100%; overflow-x:auto; border:1px solid #dfe5ec; border-radius:17px; }
        .records-table { width:100%; min-width:850px; border-collapse:separate; border-spacing:0; color:#26344c; font-size:15px; }
        .records-table th { padding:16px 14px; border-right:1px solid #dfe5ec; border-bottom:1px solid #dfe5ec; background:#f7f9fc; color:#182c4c; text-align:center; font-weight:850; white-space:nowrap; }
        .records-table th:last-child { border-right:0; }
        .records-table td { padding:14px; border-right:1px solid #e1e6ec; border-bottom:1px solid #e1e6ec; vertical-align:middle; }
        .records-table td:last-child { border-right:0; }
        .records-table tbody tr:last-child td { border-bottom:0; }
        .records-date { white-space:nowrap; text-align:center; }
        .records-content { font-weight:700; }
        .records-actions { white-space:nowrap; text-align:center; }
        .records-edit,.records-delete { border:0; border-radius:9px; padding:8px 11px; margin:2px; font-weight:800; cursor:pointer; }
        .records-edit { background:#edf5ff; color:#1267b3; }
        .records-delete { background:#fff0ef; color:#b42318; }
        .records-empty { padding:36px !important; color:#75839a; text-align:center !important; }
        .records-overlay { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(15,23,42,.52); }
        .records-modal { width:min(570px,100%); overflow:hidden; border-radius:20px; background:#fff; box-shadow:0 25px 70px rgba(15,23,42,.28); }
        .records-modal-header { display:flex; align-items:center; justify-content:space-between; padding:19px 22px; border-bottom:1px solid #e6ebf1; }
        .records-modal-header h3 { margin:0; color:#17233c; font-size:19px; }
        .records-close { width:34px; height:34px; border:1px solid #dce3eb; border-radius:9px; background:#fff; color:#64748b; font-size:24px; cursor:pointer; }
        .records-form { display:grid; gap:15px; padding:22px; }
        .records-form label { display:grid; gap:7px; color:#26344c; font-size:14px; font-weight:800; }
        .records-form input,.records-form select,.records-form textarea { width:100%; box-sizing:border-box; padding:11px 12px; border:1px solid #d5dee8; border-radius:10px; outline:none; color:#17233c; background:#fff; font:inherit; }
        .records-form input:focus,.records-form select:focus,.records-form textarea:focus { border-color:#2788dc; box-shadow:0 0 0 3px rgba(39,136,220,.1); }
        .records-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:15px 22px 20px; border-top:1px solid #e6ebf1; }
        .records-cancel,.records-save { padding:10px 16px; border-radius:10px; font-weight:800; cursor:pointer; }
        .records-cancel { border:1px solid #d7dfe8; background:#fff; color:#526174; }
        .records-save { border:0; background:#1976d2; color:#fff; }
        .records-save:disabled { opacity:.6; cursor:default; }
        @media (max-width:700px) { .records-page { padding:14px; } .records-card { padding:16px; border-radius:16px; } .records-heading { align-items:flex-start; flex-direction:column; } .records-add { width:100%; } .records-heading h2 { font-size:23px; } }
      `}</style>
    </section>
  );
}


type RLDVRole = "TPT" | "CLASS";

type RLDVStudent = {
  id: string;
  full_name: string;
  class_id: string;
};

type RLDVClass = {
  id: string;
  class_name: string;
  grade: number;
};

type RLDVItem = {
  id: string;
  student_id: string;
  training_content: string;
  result: string | null;
  updated_date: string;
  notes: string | null;
};

function RLDVModule({ role }: { role: RLDVRole }) {
  const [students, setStudents] = useState<RLDVStudent[]>([]);
  const [classes, setClasses] = useState<RLDVClass[]>([]);
  const [rows, setRows] = useState<RLDVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    training_content: "",
    result: "",
    updated_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const classMap = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes]
  );

  const studentMap = useMemo(
    () => new Map(students.map((item) => [item.id, item])),
    [students]
  );

  const displayRows = useMemo(() => {
    const byStudent = new Map<string, RLDVItem[]>();
    rows.forEach((item) => {
      const list = byStudent.get(item.student_id) ?? [];
      list.push(item);
      byStudent.set(item.student_id, list);
    });

    return students.flatMap((student) => {
      const studentRows = byStudent.get(student.id);
      return studentRows && studentRows.length > 0
        ? studentRows.map((item) => ({ student, item }))
        : [{ student, item: null as RLDVItem | null }];
    });
  }, [students, rows]);

  async function loadData() {
    setLoading(true);
    setError("");

    const [studentsResult, classesResult, recordsResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, class_id")
        .order("full_name", { ascending: true }),
      supabase
        .from("classes")
        .select("id, class_name, grade")
        .order("class_name", { ascending: true }),
      supabase
        .from("rl_doi_vien")
        .select("id, student_id, training_content, result, updated_date, notes")
        .order("updated_date", { ascending: false }),
    ]);

    const firstError =
      studentsResult.error || classesResult.error || recordsResult.error;

    if (firstError) {
      setError(`Không tải được dữ liệu RLĐV: ${firstError.message}`);
      setRows([]);
    } else {
      setStudents((studentsResult.data ?? []) as RLDVStudent[]);
      setClasses((classesResult.data ?? []) as RLDVClass[]);
      setRows((recordsResult.data ?? []) as RLDVItem[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getRankLabel(studentId: string) {
    const student = studentMap.get(studentId);
    if (!student) return "";
    const schoolClass = classMap.get(student.class_id);
    if (!schoolClass) return "";
    return schoolClass.grade <= 3 ? "Dự bị đội viên" : "Hạng Măng non";
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      student_id: "",
      training_content: "",
      result: "",
      updated_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEdit(item: RLDVItem) {
    setEditingId(item.id);
    setForm({
      student_id: item.student_id,
      training_content: item.training_content,
      result: item.result ?? "",
      updated_date: item.updated_date,
      notes: item.notes ?? "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.student_id || !form.training_content.trim()) {
      setError("Vui lòng chọn học sinh và nhập nội dung rèn luyện.");
      return;
    }

    setSaving(true);

    if (editingId) {
      const payload: {
        student_id: string;
        training_content: string;
        result: string | null;
        updated_date: string;
        notes: string | null;
      } = {
        student_id: form.student_id,
        training_content: form.training_content.trim(),
        result: form.result.trim() || null,
        updated_date: form.updated_date,
        notes: form.notes.trim() || null,
      };

      const { error: updateError } = await supabase
        .from("rl_doi_vien")
        .update(payload)
        .eq("id", editingId);

      if (updateError) {
        setError(`Không lưu được RLĐV: ${updateError.message}`);
        setSaving(false);
        return;
      }
    } else {
      const payload: {
        student_id: string;
        training_content: string;
        result: string | null;
        updated_date: string;
        notes: string | null;
      } = {
        student_id: form.student_id,
        training_content: form.training_content.trim(),
        result: form.result.trim() || null,
        updated_date: form.updated_date,
        notes: form.notes.trim() || null,
      };

      const { error: insertError } = await supabase
        .from("rl_doi_vien")
        .insert(payload);

      if (insertError) {
        setError(`Không lưu được RLĐV: ${insertError.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setMessage(editingId ? "Đã cập nhật hồ sơ RLĐV." : "Đã thêm hồ sơ RLĐV.");
    await loadData();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bạn có chắc muốn xóa hồ sơ RLĐV này không?")) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("rl_doi_vien")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(`Không xóa được hồ sơ RLĐV: ${deleteError.message}`);
      return;
    }

    setMessage("Đã xóa hồ sơ RLĐV.");
    await loadData();
  }

  return (
    <section className="rldv-page">
      <div className="rldv-card">
        <div className="rldv-heading">
          <div>
            <h2>⭐ RLĐV</h2>
            <p>
              Quản lý Chương trình Rèn luyện Đội viên theo từng học sinh.
            </p>
          </div>

          <button className="rldv-add" onClick={openAdd}>
            + Cập nhật RLĐV
          </button>
        </div>

        {role === "CLASS" && (
          <div className="rldv-note">
            Tài khoản lớp chỉ xem và cập nhật hồ sơ RLĐV của học sinh lớp mình.
          </div>
        )}

        {error && <div className="rldv-error">{error}</div>}
        {message && <div className="rldv-message">{message}</div>}

        <div className="rldv-table-wrap">
          <table className="rldv-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Họ tên</th>
                <th>Lớp</th>
                <th>Hạng</th>
                <th>Nội dung rèn luyện</th>
                <th>Kết quả</th>
                <th>Ngày cập nhật</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="rldv-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="rldv-empty">
                    Chưa có học sinh trong dữ liệu Học sinh.
                  </td>
                </tr>
              ) : (
                displayRows.map(({ student, item }, index) => {
                  const schoolClass = classMap.get(student.class_id);

                  return (
                    <tr key={item?.id ?? `student-${student.id}`}>
                      <td>{index + 1}</td>
                      <td className="rldv-name">{student.full_name}</td>
                      <td>{schoolClass?.class_name ?? "—"}</td>
                      <td>
                        <span className="rldv-rank-badge">
                          {getRankLabel(student.id) || "—"}
                        </span>
                      </td>
                      <td>{item?.training_content || <span className="rldv-not-updated">Chưa cập nhật</span>}</td>
                      <td>{item?.result || "—"}</td>
                      <td>{item ? formatDate(item.updated_date) : "—"}</td>
                      <td>{item?.notes || "—"}</td>
                      <td>
                        <div className="rldv-actions">
                          {item ? (
                            <>
                              <button onClick={() => openEdit(item)}>Sửa</button>
                              <button
                                className="rldv-delete"
                                onClick={() => handleDelete(item.id)}
                              >
                                Xóa
                              </button>
                            </>
                          ) : (
                            <button onClick={() => {
                              setEditingId(null);
                              setForm({
                                student_id: student.id,
                                training_content: "",
                                result: "",
                                updated_date: new Date().toISOString().slice(0, 10),
                                notes: "",
                              });
                              setError("");
                              setMessage("");
                              setShowForm(true);
                            }}>Cập nhật</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="rldv-overlay">
            <div className="rldv-modal">
              <div className="rldv-modal-header">
                <h3>{editingId ? "Sửa hồ sơ RLĐV" : "Cập nhật RLĐV"}</h3>
                <button
                  className="rldv-close"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <form className="rldv-form" onSubmit={handleSave}>
                <label>
                  Học sinh
                  <select
                    value={form.student_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        student_id: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">-- Chọn học sinh --</option>
                    {students.map((student) => {
                      const schoolClass = classMap.get(student.class_id);
                      return (
                        <option key={student.id} value={student.id}>
                          {student.full_name} — {schoolClass?.class_name ?? ""}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div className="rldv-preview">
                  <span>Hạng</span>
                  <strong>
                    {form.student_id
                      ? getRankLabel(form.student_id)
                      : "Tự xác định theo khối lớp"}
                  </strong>
                </div>

                <label>
                  Nội dung rèn luyện
                  <textarea
                    rows={3}
                    value={form.training_content}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        training_content: e.target.value,
                      }))
                    }
                    placeholder="Nhập nội dung rèn luyện..."
                    required
                  />
                </label>

                <label>
                  Kết quả
                  <input
                    value={form.result}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, result: e.target.value }))
                    }
                    placeholder="Ví dụ: Đạt, Chưa đạt..."
                  />
                </label>

                <label>
                  Ngày cập nhật
                  <input
                    type="date"
                    value={form.updated_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        updated_date: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Ghi chú
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </label>

                <div className="rldv-modal-footer">
                  <button
                    type="button"
                    className="rldv-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="rldv-save" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .rldv-page { padding: 8px 0 28px; }
        .rldv-card { background:#fff; border:1px solid #dce4ee; border-radius:24px; padding:24px; box-shadow:0 10px 30px rgba(20,55,90,.07); }
        .rldv-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:18px; }
        .rldv-heading h2 { margin:0; color:#10213d; font-size:28px; }
        .rldv-heading p { margin:7px 0 0; color:#718096; font-size:14px; }
        .rldv-add { border:0; border-radius:11px; padding:12px 18px; background:#1976d2; color:#fff; font-weight:800; font-size:15px; cursor:pointer; white-space:nowrap; }
        .rldv-note { margin-bottom:15px; padding:12px 14px; border:1px solid #d7e9f8; border-radius:11px; background:#f4faff; color:#41637d; font-size:14px; }
        .rldv-error { margin-bottom:15px; padding:12px 14px; border:1px solid #ffc4bf; border-radius:11px; background:#fff1ef; color:#b42318; }
        .rldv-message { margin-bottom:15px; padding:12px 14px; border:1px solid #bce5ca; border-radius:11px; background:#f0fff4; color:#18794e; }
        .rldv-table-wrap { width:100%; overflow-x:hidden; border:1px solid #dce4ee; border-radius:18px; }
        .rldv-table { width:100%; table-layout:fixed; border-collapse:collapse; font-size:13px; }
        .rldv-table th { padding:11px 7px; background:#f6f9fc; border-bottom:1px solid #dce4ee; color:#152b4b; font-weight:800; text-align:center; white-space:normal; }
        .rldv-table td { padding:10px 7px; border-bottom:1px solid #edf1f5; color:#334155; vertical-align:middle; overflow-wrap:anywhere; word-break:break-word; }
        .rldv-table tbody tr:last-child td { border-bottom:0; }
        .rldv-table th:nth-child(1), .rldv-table td:nth-child(1) { width:4%; text-align:center; }
        .rldv-table th:nth-child(2), .rldv-table td:nth-child(2) { width:14%; }
        .rldv-table th:nth-child(3), .rldv-table td:nth-child(3) { width:7%; text-align:center; }
        .rldv-table th:nth-child(4), .rldv-table td:nth-child(4) { width:10%; text-align:center; }
        .rldv-table th:nth-child(5), .rldv-table td:nth-child(5) { width:20%; }
        .rldv-table th:nth-child(6), .rldv-table td:nth-child(6) { width:9%; text-align:center; }
        .rldv-table th:nth-child(7), .rldv-table td:nth-child(7) { width:9%; text-align:center; }
        .rldv-table th:nth-child(8), .rldv-table td:nth-child(8) { width:14%; }
        .rldv-table th:nth-child(9), .rldv-table td:nth-child(9) { width:13%; text-align:center; }
        .rldv-name { color:#162b4a !important; font-weight:800; }
        .rldv-not-updated { color:#94a3b8; font-style:italic; }
        .rldv-rank-badge { display:inline-block; padding:5px 9px; border-radius:999px; background:#eef6ff; color:#1769aa; font-size:12px; font-weight:800; white-space:nowrap; }
        .rldv-actions { display:flex; justify-content:center; gap:7px; }
        .rldv-actions button { border:1px solid #d6e0ea; border-radius:8px; padding:7px 9px; background:#fff; color:#1769aa; font-weight:700; cursor:pointer; }
        .rldv-actions .rldv-delete { color:#b42318; background:#fff5f3; border-color:#ffd1cb; }
        .rldv-empty { padding:42px !important; text-align:center !important; color:#75839a; }
        .rldv-overlay { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(15,23,42,.52); }
        .rldv-modal { width:min(580px,100%); max-height:90vh; overflow:auto; border-radius:20px; background:#fff; box-shadow:0 25px 70px rgba(15,23,42,.28); }
        .rldv-modal-header { display:flex; align-items:center; justify-content:space-between; padding:19px 22px; border-bottom:1px solid #e6ebf1; }
        .rldv-modal-header h3 { margin:0; color:#17233c; font-size:19px; }
        .rldv-close { width:34px; height:34px; border:1px solid #dce3eb; border-radius:9px; background:#fff; color:#64748b; font-size:24px; cursor:pointer; }
        .rldv-form { display:grid; gap:15px; padding:22px; }
        .rldv-form label { display:grid; gap:7px; color:#26344c; font-size:14px; font-weight:800; }
        .rldv-form input,.rldv-form select,.rldv-form textarea { width:100%; box-sizing:border-box; padding:11px 12px; border:1px solid #d5dee8; border-radius:10px; outline:none; color:#17233c; background:#fff; font:inherit; }
        .rldv-form input:focus,.rldv-form select:focus,.rldv-form textarea:focus { border-color:#2788dc; box-shadow:0 0 0 3px rgba(39,136,220,.1); }
        .rldv-preview { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 12px; border:1px solid #dbe8f4; border-radius:10px; background:#f6faff; color:#536579; font-size:14px; }
        .rldv-preview strong { color:#1769aa; }
        .rldv-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:15px 22px 20px; border-top:1px solid #e6ebf1; }
        .rldv-cancel,.rldv-save { padding:10px 16px; border-radius:10px; font-weight:800; cursor:pointer; }
        .rldv-cancel { border:1px solid #d7dfe8; background:#fff; color:#526174; }
        .rldv-save { border:0; background:#1976d2; color:#fff; }
        .rldv-save:disabled { opacity:.6; cursor:default; }
        @media (max-width:700px) { .rldv-page { padding:14px 0; } .rldv-card { padding:16px; border-radius:16px; } .rldv-heading { align-items:flex-start; flex-direction:column; } .rldv-add { width:100%; } .rldv-heading h2 { font-size:23px; } }
      `}</style>
    </section>
  );
}


function Dashboard({
  studentCount,
  teamMemberCount,
  childCount,
  gradeCounts,
  classCount,
  competitionClassCount,
  currentWeek,
  ranking,
  activities,
  onNavigate,
}: {
  studentCount: number;
  teamMemberCount: number;
  childCount: number;
  gradeCounts: number[];
  classCount: number;
  competitionClassCount: number;
  currentWeek: number;
  ranking: { rank: number; className: string; total: number }[];
  activities: {
    icon: string;
    title: string;
    text: string;
    date: string;
  }[];
  onNavigate: (page: string) => void;
}) {
  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-icon">📖</div>

        <div>
          <h2>Xin chào, Tổng phụ trách! 👋</h2>

          <p>
            Chúc bạn một ngày làm việc hiệu quả. Cùng nhau xây dựng
            Liên đội ngày càng vững mạnh!
          </p>
        </div>
      </section>

      <section className="quote-card">
        <div className="quote-icon">🌟</div>

        <div>
          <strong>“Vì đàn em thân yêu”</strong>
          <span>— Công tác Đội TNTP Hồ Chí Minh —</span>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard
          icon="👨‍🎓"
          title="Tổng học sinh"
          value={studentCount.toString()}
          subtitle="học sinh"
          tone="blue"
        />

        <StatCard
          icon="🎗️"
          title="Đội viên"
          value={teamMemberCount.toString()}
          subtitle="đội viên"
          tone="pink"
        />

        <StatCard
          icon="🌼"
          title="Nhi đồng"
          value={childCount.toString()}
          subtitle="học sinh khối 1–3"
          tone="yellow"
        />

        <StatCard
          icon="📅"
          title="Tuần hiện tại"
          value={currentWeek.toString()}
          subtitle="/ 40 tuần"
          tone="green"
        />

        <StatCard
          icon="🏫"
          title="Số lớp"
          value={classCount.toString()}
          subtitle={`${competitionClassCount} lớp thi đua`}
          tone="purple"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel student-chart">
          <PanelTitle icon="📊" title="Tổng quan học sinh" />

          <div className="fake-chart">
            {[1, 2, 3, 4, 5].map((grade) => (
              <div className="chart-row" key={grade}>
                <span>Khối {grade}</span>
                <div className="bar">
                  <i
                    style={{
                      width: `${studentCount > 0 ? Math.max(4, (gradeCounts[grade - 1] / Math.max(...gradeCounts, 1)) * 100) : 0}%`,
                    }}
                  />
                </div>
                <strong>{gradeCounts[grade - 1]}</strong>
              </div>
            ))}
          </div>

          <div className="chart-note">
            Dữ liệu sẽ tự cập nhật khi nhập danh sách học sinh.
          </div>
        </div>

        <div className="panel ranking-panel">
          <div className="panel-title-row">
            <PanelTitle icon="🏆" title="Bảng xếp hạng thi đua" />

            <select defaultValue={currentWeek}>
              <option value={currentWeek}>Tuần {currentWeek}</option>
            </select>
          </div>

          <div className="ranking-table dashboard-ranking-position">
            <div className="ranking-head">
              <span>Chi đội</span>
              <span>Vị thứ</span>
            </div>

            {ranking.map((item) => (
              <div className="ranking-row" key={item.rank}>
                <strong>{item.className}</strong>

                <span className="rank-number">
                  {item.rank === 1
                    ? "🥇"
                    : item.rank === 2
                    ? "🥈"
                    : item.rank === 3
                    ? "🥉"
                    : item.rank}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="outline-button dashboard-nav-button"
            onClick={() => onNavigate("Thi đua tuần")}
          >
            Xem bảng xếp hạng đầy đủ →
          </button>
        </div>

        <div className="panel activities-panel">
          <PanelTitle icon="🎯" title="Hoạt động Đội gần đây" />

          {activities.map((activity, index) => (
            <button
              type="button"
              className="activity-row"
              key={index}
              onClick={() => onNavigate("Hoạt động Đội")}
            >
              <div className="activity-icon">{activity.icon}</div>

              <div>
                <strong>{activity.title}</strong>
                <span>{activity.text}</span>
              </div>

              {activity.date && <small>{activity.date}</small>}
            </button>
          ))}

          <button
            type="button"
            className="text-button dashboard-nav-button"
            onClick={() => onNavigate("Hoạt động Đội")}
          >
            Xem tất cả →
          </button>
        </div>
      </section>

      <section className="bottom-grid">
        <InfoPanel
          icon="🎁"
          title="Khen thưởng gần đây"
          tone="reward"
          items={[
            "Chưa có dữ liệu khen thưởng",
            "Hãy thêm khen thưởng cho học sinh",
            "Dữ liệu sẽ hiển thị tại đây",
          ]}
          onClick={() => onNavigate("Khen thưởng")}
        />

        <InfoPanel
          icon="⚠️"
          title="Vi phạm gần đây"
          tone="warning"
          items={[
            "Chưa có dữ liệu vi phạm",
            "Dữ liệu vi phạm sẽ hiển thị tại đây",
            "Có thể quản lý theo từng lớp",
          ]}
          onClick={() => onNavigate("Vi phạm")}
        />

        <InfoPanel
          icon="📅"
          title="Nhiệm vụ sắp tới"
          tone="task"
          items={[
            "Thi đua tuần",
            "Hoạt động Đội",
            "Cập nhật hồ sơ RLĐV",
          ]}
          onClick={() => onNavigate("RLĐV")}
        />
      </section>

      <footer className="dashboard-footer">
        <span>⭐ LIÊN ĐỘI TRƯỜNG TIỂU HỌC TRẦN QUỐC TOẢN</span>
        <span>Quản lý công tác Đội trực tuyến</span>
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  tone,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

function PanelTitle({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div className="panel-title">
      <span>{icon}</span>
      <h3>{title}</h3>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  tone,
  items,
  onClick,
}: {
  icon: string;
  title: string;
  tone: string;
  items: string[];
  onClick?: () => void;
}) {
  return (
    <div className={`panel info-panel ${tone}`}>
      <PanelTitle icon={icon} title={title} />

      {items.map((item, index) => (
        <div className="info-row" key={index}>
          <span className="info-dot">{index + 1}</span>
          <span>{item}</span>
        </div>
      ))}

      <button
        type="button"
        className="text-button dashboard-nav-button"
        onClick={onClick}
      >
        Xem tất cả →
      </button>
    </div>
  );
}


type SettingsClass = {
  id: string;
  class_name: string;
  grade: number;
  campus: "Trường chính" | "Điểm trường";
  competition_enabled: boolean;
  is_active: boolean;
};

function SettingsModule({ role, onWeekSaved }: { role: "TPT" | "CLASS"; onWeekSaved: (week: number) => void }) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [savedWeek, setSavedWeek] = useState(1);
  const [schoolYearId, setSchoolYearId] = useState<string | null>(null);
  const [schoolYearName, setSchoolYearName] = useState("2026–2027");
  const [classes, setClasses] = useState<SettingsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({
    class_name: "",
    grade: "1",
    campus: "Trường chính" as "Trường chính" | "Điểm trường",
    competition_enabled: false,
  });

  const loadSettings = async () => {
    if (role !== "TPT") return;
    setLoading(true);
    setError("");

    const [{ data: year, error: yearError }, { data: setting, error: settingError }] =
      await Promise.all([
        supabase
          .from("school_years")
          .select("id,name,is_current")
          .eq("is_current", true)
          .maybeSingle(),
        supabase
          .from("system_settings")
          .select("id,current_week,school_year_id")
          .limit(1)
          .maybeSingle(),
      ]);

    if (yearError) {
      setError(`Không tải được năm học: ${yearError.message}`);
      setLoading(false);
      return;
    }

    if (settingError) {
      setError(`Không tải được cài đặt: ${settingError.message}`);
      setLoading(false);
      return;
    }

    const yearId = year?.id ?? setting?.school_year_id ?? null;
    setSchoolYearId(yearId);
    setSchoolYearName(year?.name ?? "2026–2027");

    const week = Number(setting?.current_week ?? 1);
    setCurrentWeek(week);
    setSavedWeek(week);

    if (!yearId) {
      setClasses([]);
      setLoading(false);
      return;
    }

    const { data: classRows, error: classError } = await supabase
      .from("classes")
      .select("id,class_name,grade,campus,competition_enabled,is_active")
      .eq("school_year_id", yearId)
      .order("grade", { ascending: true })
      .order("campus", { ascending: true })
      .order("class_name", { ascending: true });

    if (classError) {
      setError(`Không tải được danh sách lớp: ${classError.message}`);
      setLoading(false);
      return;
    }

    setClasses((classRows ?? []) as SettingsClass[]);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [role]);

  const saveWeek = async () => {
    if (role !== "TPT") return;

    setSavingWeek(true);
    setError("");
    setNotice("");

    try {
      const { data: setting, error: settingError } = await supabase
        .from("system_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (settingError) {
        setError(`Không đọc được cài đặt hệ thống: ${settingError.message}`);
        return;
      }

      if (!setting?.id) {
        setError("Chưa có dòng cài đặt hệ thống để lưu tuần hiện tại.");
        return;
      }

      const { error: updateError } = await supabase
        .from("system_settings")
        .update({
          current_week: currentWeek,
          school_year_id: schoolYearId,
        })
        .eq("id", setting.id);

      if (updateError) {
        setError(`Không lưu được tuần hiện tại: ${updateError.message}`);
        return;
      }

      // Cập nhật ngay giao diện Tổng quan mà không cần đăng nhập lại.
      setSavedWeek(currentWeek);
      onWeekSaved(currentWeek);
      setNotice(`Đã lưu Tuần ${currentWeek} cho năm học ${schoolYearName}.`);
    } catch (err: any) {
      setError(`Không lưu được tuần hiện tại: ${err?.message ?? "Lỗi không xác định."}`);
    } finally {
      setSavingWeek(false);
    }
  };

  const resetClassForm = () => {
    setEditingId(null);
    setClassForm({
      class_name: "",
      grade: "1",
      campus: "Trường chính",
      competition_enabled: false,
    });
    setShowClassForm(false);
  };

  const openAddClass = () => {
    if (role !== "TPT") return;
    setEditingId(null);
    setClassForm({
      class_name: "",
      grade: "1",
      campus: "Trường chính",
      competition_enabled: false,
    });
    setShowClassForm(true);
    setError("");
    setNotice("");
  };

  const openEditClass = (item: SettingsClass) => {
    setEditingId(item.id);
    setClassForm({
      class_name: item.class_name,
      grade: String(item.grade),
      campus: item.campus,
      competition_enabled: item.competition_enabled,
    });
    setShowClassForm(true);
    setError("");
    setNotice("");
  };

  const saveClass = async (event: FormEvent) => {
    event.preventDefault();
    if (role !== "TPT" || !schoolYearId) return;

    const name = classForm.class_name.trim();
    const grade = Number(classForm.grade);

    if (!name) {
      setError("Vui lòng nhập tên lớp.");
      return;
    }
    if (grade < 1 || grade > 5) {
      setError("Khối phải từ 1 đến 5.");
      return;
    }

    setSavingClass(true);
    setError("");
    setNotice("");

    const payload = {
      school_year_id: schoolYearId,
      class_name: name,
      grade,
      campus: classForm.campus,
      competition_enabled: classForm.competition_enabled,
      is_active: true,
    };

    const result = editingId
      ? await supabase.from("classes").update(payload).eq("id", editingId)
      : await supabase.from("classes").insert(payload);

    if (result.error) {
      setError(`Không lưu được lớp: ${result.error.message}`);
      setSavingClass(false);
      return;
    }

    await loadSettings();
    resetClassForm();
    setNotice(editingId ? "Đã cập nhật lớp." : "Đã thêm lớp.");
    setSavingClass(false);
  };

  const deleteClass = async (item: SettingsClass) => {
    if (role !== "TPT") return;
    const ok = window.confirm(
      `Xóa lớp ${item.class_name}? Nếu lớp đã có học sinh, hệ thống có thể không cho xóa.`
    );
    if (!ok) return;

    setError("");
    setNotice("");
    const { error: deleteError } = await supabase
      .from("classes")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(`Không xóa được lớp ${item.class_name}: ${deleteError.message}`);
      return;
    }

    await loadSettings();
    setNotice(`Đã xóa lớp ${item.class_name}.`);
  };

  if (role !== "TPT") {
    return (
      <section className="settings-page">
        <div className="settings-card">
          <div className="settings-lock">🔒</div>
          <h2>Cài đặt</h2>
          <p>Tài khoản lớp không có quyền thay đổi cài đặt hệ thống.</p>
        </div>
      </section>
    );
  }

  const mainClasses = classes.filter((item) => item.campus === "Trường chính");
  const pointClasses = classes.filter((item) => item.campus === "Điểm trường");

  return (
    <section className="settings-page">
      <style jsx global>{`
        .settings-page { display:flex; flex-direction:column; gap:18px; }
        .settings-card { background:#fff; border:1px solid #e2e8f0; border-radius:20px; padding:22px; box-shadow:0 8px 24px rgba(15,23,42,.05); }
        .settings-card h2 { margin:0; font-size:22px; color:#102a43; }
        .settings-subtitle { margin:6px 0 0; color:#718096; }
        .settings-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:18px; }
        .settings-section-title { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
        .settings-section-title h3 { margin:0; font-size:18px; color:#173b63; }
        .settings-field { display:flex; flex-direction:column; gap:7px; }
        .settings-field label { font-weight:700; color:#334e68; }
        .settings-field input,.settings-field select { height:42px; border:1px solid #cbd5e1; border-radius:10px; padding:0 12px; font-size:15px; background:#fff; }
        .settings-week-row { display:flex; align-items:end; gap:12px; flex-wrap:wrap; }
        .settings-week-row .settings-field { min-width:170px; }
        .settings-btn { border:0; border-radius:10px; padding:10px 15px; font-weight:700; cursor:pointer; background:#1976d2; color:#fff; }
        .settings-btn.secondary { background:#edf4fb; color:#175a9c; }
        .settings-btn.danger { background:#fff0f0; color:#c62828; }
        .settings-note { margin-top:12px; padding:11px 13px; border-radius:10px; background:#f7fafc; color:#52606d; font-size:14px; }
        .settings-alert { padding:12px 14px; border-radius:10px; background:#fff1f0; color:#c62828; border:1px solid #ffc9c5; }
        .settings-success { padding:12px 14px; border-radius:10px; background:#eefbf3; color:#16794c; border:1px solid #b7ebcd; }
        .settings-class-summary { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
        .settings-badge { padding:7px 11px; border-radius:999px; background:#eef5ff; color:#1d5fa7; font-weight:700; font-size:13px; }
        .settings-table-wrap { overflow:hidden; border:1px solid #e2e8f0; border-radius:14px; }
        .settings-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .settings-table th,.settings-table td { padding:10px 9px; border-bottom:1px solid #edf2f7; text-align:left; font-size:13px; }
        .settings-table th { background:#f7fafc; color:#243b53; font-weight:800; }
        .settings-table th:nth-child(1){width:45px}.settings-table th:nth-child(2){width:100px}.settings-table th:nth-child(3){width:65px}.settings-table th:nth-child(4){width:105px}.settings-table th:nth-child(5){width:105px}.settings-table th:nth-child(6){width:115px}
        .settings-actions { display:flex; gap:6px; flex-wrap:wrap; }
        .settings-mini-btn { border:0; border-radius:7px; padding:6px 8px; cursor:pointer; font-size:12px; font-weight:700; }
        .settings-mini-btn.edit { background:#edf5ff; color:#1565c0; }
        .settings-mini-btn.delete { background:#fff1f1; color:#c62828; }
        .settings-form-grid { display:grid; grid-template-columns:1.4fr .7fr 1fr 1fr; gap:12px; align-items:end; }
        .settings-check { display:flex; align-items:center; gap:8px; height:42px; font-size:14px; font-weight:700; color:#334e68; }
        .settings-check input { width:17px; height:17px; }
        .settings-form-actions { display:flex; gap:8px; margin-top:14px; }
        .settings-lock { font-size:36px; margin-bottom:8px; }
        .settings-empty { padding:24px; text-align:center; color:#718096; }
        @media(max-width:900px){ .settings-grid,.settings-form-grid{grid-template-columns:1fr}.settings-table-wrap{overflow-x:auto}.settings-table{min-width:700px} }
      `}</style>

      <div className="settings-card">
        <h2>⚙️ Cài đặt</h2>
        <p className="settings-subtitle">Thiết lập năm học, tuần thi đua và danh sách lớp của Liên đội.</p>
      </div>

      {error && <div className="settings-alert">{error}</div>}
      {notice && <div className="settings-success">{notice}</div>}

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-section-title">
            <h3>📅 Năm học & tuần thi đua</h3>
          </div>
          <div className="settings-week-row">
            <div className="settings-field">
              <label>Năm học hiện tại</label>
              <input value={schoolYearName} readOnly />
            </div>
            <div className="settings-field">
              <label>Tuần thi đua hiện tại</label>
              <select value={currentWeek} onChange={(e) => setCurrentWeek(Number(e.target.value))}>
                {Array.from({ length: 40 }, (_, i) => i + 1).map((week) => (
                  <option key={week} value={week}>Tuần {week}</option>
                ))}
              </select>
            </div>
            <button className="settings-btn" onClick={saveWeek} disabled={savingWeek}>
              {savingWeek ? "Đang lưu..." : "💾 Lưu tuần"}
            </button>
          </div>
          <div className="settings-note">Đang lưu: <strong>Tuần {savedWeek}</strong>. Mục Thi đua tuần sẽ sử dụng tuần này.</div>
        </div>

        <div className="settings-card">
          <div className="settings-section-title">
            <h3>🏫 Thống kê lớp</h3>
          </div>
          <div className="settings-class-summary">
            <span className="settings-badge">Tổng: {classes.length} lớp</span>
            <span className="settings-badge">Trường chính: {mainClasses.length}</span>
            <span className="settings-badge">Điểm trường: {pointClasses.length}</span>
            <span className="settings-badge">Thi đua: {classes.filter((item) => item.competition_enabled).length}</span>
          </div>
          <div className="settings-note">Tên lớp có thể tự thêm và chỉnh sửa tại đây. Chỉ các lớp bật <strong>Thi đua</strong> mới tham gia bảng Thi đua tuần.</div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-section-title">
          <div>
            <h3>🏫 Danh sách lớp</h3>
            <p className="settings-subtitle">Quản lý lớp của năm học {schoolYearName}.</p>
          </div>
          <button className="settings-btn" onClick={openAddClass}>＋ Thêm lớp</button>
        </div>

        {showClassForm && (
          <form onSubmit={saveClass} style={{ padding: 15, background: "#f8fbff", border: "1px solid #d9e9f8", borderRadius: 14, marginBottom: 16 }}>
            <div className="settings-form-grid">
              <div className="settings-field">
                <label>Tên lớp</label>
                <input value={classForm.class_name} onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })} placeholder="Ví dụ: 1A1" />
              </div>
              <div className="settings-field">
                <label>Khối</label>
                <select value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}>
                  {[1,2,3,4,5].map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)}
                </select>
              </div>
              <div className="settings-field">
                <label>Cơ sở</label>
                <select value={classForm.campus} onChange={(e) => setClassForm({ ...classForm, campus: e.target.value as "Trường chính" | "Điểm trường" })}>
                  <option value="Trường chính">Trường chính</option>
                  <option value="Điểm trường">Điểm trường</option>
                </select>
              </div>
              <label className="settings-check">
                <input type="checkbox" checked={classForm.competition_enabled} onChange={(e) => setClassForm({ ...classForm, competition_enabled: e.target.checked })} />
                Tham gia thi đua tuần
              </label>
            </div>
            <div className="settings-form-actions">
              <button className="settings-btn" type="submit" disabled={savingClass}>{savingClass ? "Đang lưu..." : editingId ? "💾 Lưu thay đổi" : "💾 Thêm lớp"}</button>
              <button className="settings-btn secondary" type="button" onClick={resetClassForm}>Hủy</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="settings-empty">Đang tải danh sách lớp...</div>
        ) : classes.length === 0 ? (
          <div className="settings-empty">Chưa có lớp trong năm học hiện tại.</div>
        ) : (
          <div className="settings-table-wrap">
            <table className="settings-table">
              <thead>
                <tr><th>STT</th><th>Lớp</th><th>Khối</th><th>Cơ sở</th><th>Thi đua</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {classes.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td><strong>{item.class_name}</strong></td>
                    <td>{item.grade}</td>
                    <td>{item.campus}</td>
                    <td>{item.competition_enabled ? "Có" : "Không"}</td>
                    <td>
                      <div className="settings-actions">
                        <button className="settings-mini-btn edit" onClick={() => openEditClass(item)}>Sửa</button>
                        <button className="settings-mini-btn delete" onClick={() => deleteClass(item)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="coming-page">
      <div className="coming-icon">🚧</div>

      <h2>{title}</h2>

      <p>
        Giao diện module đã được tạo trong bộ khung mới.
        Chức năng dữ liệu sẽ được kết nối lần lượt với Supabase.
      </p>

      <div className="coming-hint">
        ⭐ Không sử dụng dữ liệu từ ứng dụng cũ.
      </div>
    </div>
  );
}
