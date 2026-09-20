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
    if (role) {
      loadDashboardData();
    }
  }, [role]);

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
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (typeof count === "number") {
      setStudentCount(count);
    }

    const { count: teamCount } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_union_member", true);

    if (typeof teamCount === "number") {
      setTeamMemberCount(teamCount);
    }

    const { data } = await supabase
      .from("system_settings")
      .select("current_week")
      .limit(1)
      .maybeSingle();

    if (data?.current_week) {
      setCurrentWeek(data.current_week);
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
    currentWeek={currentWeek}
    ranking={ranking}
    activities={activities}
  />
) : active === "Học sinh" ? (
  <StudentsModule />
) : active === "Thống kê học sinh" ? (
  <StudentStatistics />
) : active === "Thi đua tuần" ? (
  <WeeklyCompetition />
) : active === "Hoạt động Đội" ? (
  <TeamActivities role={role === "TPT" ? "TPT" : "CLASS"} />
) : (
  <ComingSoon title={active} />
)}
      </main>
    </div>
  );
}

function Dashboard({
  studentCount,
  teamMemberCount,
  currentWeek,
  ranking,
  activities,
}: {
  studentCount: number;
  teamMemberCount: number;
  currentWeek: number;
  ranking: { rank: number; className: string; total: number }[];
  activities: {
    icon: string;
    title: string;
    text: string;
    date: string;
  }[];
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
          icon="🏫"
          title="Số lớp"
          value="47"
          subtitle="lớp toàn trường"
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
          icon="🏆"
          title="Thi đua"
          value="25"
          subtitle="lớp trường chính"
          tone="purple"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel student-chart">
          <PanelTitle icon="📊" title="Tổng quan học sinh" />

          <div className="fake-chart">
            <div className="chart-row">
              <span>Khối 1</span>
              <div className="bar">
                <i style={{ width: "72%" }} />
              </div>
              <strong>0</strong>
            </div>

            <div className="chart-row">
              <span>Khối 2</span>
              <div className="bar">
                <i style={{ width: "85%" }} />
              </div>
              <strong>0</strong>
            </div>

            <div className="chart-row">
              <span>Khối 3</span>
              <div className="bar">
                <i style={{ width: "66%" }} />
              </div>
              <strong>0</strong>
            </div>

            <div className="chart-row">
              <span>Khối 4</span>
              <div className="bar">
                <i style={{ width: "78%" }} />
              </div>
              <strong>0</strong>
            </div>

            <div className="chart-row">
              <span>Khối 5</span>
              <div className="bar">
                <i style={{ width: "58%" }} />
              </div>
              <strong>0</strong>
            </div>
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

          <div className="ranking-table">
            <div className="ranking-head">
              <span>Hạng</span>
              <span>Chi đội</span>
              <span>Tổng điểm</span>
            </div>

            {ranking.map((item) => (
              <div className="ranking-row" key={item.rank}>
                <span className="rank-number">
                  {item.rank === 1
                    ? "🥇"
                    : item.rank === 2
                    ? "🥈"
                    : item.rank === 3
                    ? "🥉"
                    : item.rank}
                </span>

                <strong>{item.className}</strong>

                <b>{item.total}</b>
              </div>
            ))}
          </div>

          <button className="outline-button">
            Xem bảng xếp hạng đầy đủ →
          </button>
        </div>

        <div className="panel activities-panel">
          <PanelTitle icon="🎯" title="Hoạt động Đội gần đây" />

          {activities.map((activity, index) => (
            <div className="activity-row" key={index}>
              <div className="activity-icon">{activity.icon}</div>

              <div>
                <strong>{activity.title}</strong>
                <span>{activity.text}</span>
              </div>

              {activity.date && <small>{activity.date}</small>}
            </div>
          ))}

          <button className="text-button">Xem tất cả →</button>
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
}: {
  icon: string;
  title: string;
  tone: string;
  items: string[];
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

      <button className="text-button">Xem tất cả →</button>
    </div>
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
