 "use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StudentsModule from "./StudentsModule";

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
    currentWeek={currentWeek}
    ranking={ranking}
    activities={activities}
  />
) : active === "Học sinh" ? (
  <StudentsModule />
) : (
  <ComingSoon title={active} />
)}
      </main>
    </div>
  );
}

function Dashboard({
  studentCount,
  currentWeek,
  ranking,
  activities,
}: {
  studentCount: number;
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
          value="0"
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
