 "use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "TPT" | "CLASS" | null;

const menu = [
  "Tổng quan",
  "Học sinh",
  "Thi đua tuần",
  "Hoạt động Đội",
  "Vi phạm",
  "Khen thưởng",
  "RLĐV",
  "Thống kê",
  "Cài đặt"
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadProfile(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user.id);
      else {
        setRole(null);
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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

  async function handleTptLogin(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) setMessage("Đăng nhập thất bại: " + error.message);
  }

  async function handleClassLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(
      "Phần đăng nhập bằng tên lớp sẽ được kết nối sau khi chúng ta hoàn tất cơ chế tài khoản 47 lớp. Không dùng email giả ở phía trình duyệt."
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    setActive("Tổng quan");
  }

  if (!role) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-mark">Đ</div>
          <h1>LIÊN ĐỘI TRƯỜNG TIỂU HỌC TRẦN QUỐC TOẢN</h1>
          <p className="subtitle">Quản lý công tác Đội trực tuyến</p>

          <div className="login-tabs">
            <button className={loginMode === "TPT" ? "tab active" : "tab"} onClick={() => setLoginMode("TPT")}>
              Tổng phụ trách
            </button>
            <button className={loginMode === "CLASS" ? "tab active" : "tab"} onClick={() => setLoginMode("CLASS")}>
              Tài khoản lớp
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
              <button className="primary" type="submit">Đăng nhập</button>
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
              <button className="primary" type="submit">Đăng nhập</button>
            </form>
          )}

          {message && <div className="message">{message}</div>}
          <p className="safe-note">Hệ thống mới dùng Supabase riêng, không kết nối dữ liệu ứng dụng cũ.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-brand">
          <div className="brand-mark small">Đ</div>
          <div>
            <strong>LIÊN ĐỘI</strong>
            <span>Trần Quốc Toản</span>
          </div>
        </div>

        <nav>
          {menu.map((item) => (
            <button
              key={item}
              className={active === item ? "nav-item active" : "nav-item"}
              onClick={() => setActive(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <button className="logout" onClick={logout}>Đăng xuất</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h2>{active}</h2>
            <p>{role === "TPT" ? "Tổng phụ trách" : profile?.class_id ?? "Tài khoản lớp"}</p>
          </div>
          <span className="badge">Năm học 2026–2027</span>
        </header>

        <section className="dashboard">
          <div className="welcome">
            <h3>Chào mừng đến hệ thống quản lý công tác Đội</h3>
            <p>Đây là bộ khung mới. Các module sẽ được hoàn thiện lần lượt trên cơ sở dữ liệu Supabase mới.</p>
          </div>

          <div className="cards">
            <div className="card"><strong>Học sinh</strong><span>Quản lý 47 lớp</span></div>
            <div className="card"><strong>Thi đua tuần</strong><span>40 tuần · 25 lớp chính</span></div>
            <div className="card"><strong>Hoạt động Đội</strong><span>Theo dõi hoạt động</span></div>
            <div className="card"><strong>RLĐV</strong><span>Dự bị Đội viên · Măng non</span></div>
          </div>

          <div className="notice">
            <strong>Đã kết nối Supabase</strong>
            <span>RLS và phân quyền dữ liệu được xử lý ở cơ sở dữ liệu, không chỉ ở giao diện.</span>
          </div>
        </section>
      </main>
    </div>
  );
}