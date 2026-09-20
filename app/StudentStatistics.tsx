"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  student_code: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: "Nam" | "Nữ" | null;
  ethnicity: string | null;
  address: string | null;
  is_union_member: boolean;
  team_position: string;
  notes: string | null;
  class_id: string;
  classes: {
    class_name: string;
    grade: number;
    campus: "Trường chính" | "Điểm trường";
  } | null;
};

type ClassStat = {
  className: string;
  grade: number;
  campus: string;
  total: number;
  female: number;
  ethnicity: number;
  femaleEthnicity: number;
  team: number;
  children: number;
};

type EthnicityStat = {
  name: string;
  count: number;
  rate: number;
};

function percent(value: number, total: number) {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}
function isEthnicMinority(ethnicity: string | null) {
  const name = ethnicity?.trim().toLowerCase();
  return !!name && name !== "kinh";
}

export default function StudentStatistics() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [ethnicityFilter, setEthnicityFilter] = useState("all");
  const [campusFilter, setCampusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function loadStudents() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("students")
      .select(
        `id, student_code, full_name, date_of_birth, gender, ethnicity, address,
         is_union_member, team_position, notes, class_id,
         classes!inner(class_name, grade, campus)`
      )
      .order("full_name", { ascending: true });

    if (queryError) {
      setError(`Không tải được dữ liệu thống kê: ${queryError.message}`);
      setStudents([]);
      setLoading(false);
      return;
    }

    setStudents((data as unknown as Student[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const classes = useMemo(() => {
    return Array.from(
      new Set(students.map((s) => s.classes?.class_name).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [students]);

  const ethnicities = useMemo(() => {
  return Array.from(
    new Set(
      students
        .map((s) => s.ethnicity?.trim())
        .filter((name) => isEthnicMinority(name ?? null)) as string[]
    )
  ).sort((a, b) => a.localeCompare(b, "vi"));
}, [students]);

  const total = students.length;
  const female = students.filter((s) => s.gender === "Nữ").length;
  const ethnic = students.filter((s) => isEthnicMinority(s.ethnicity)).length;

const femaleEthnic = students.filter(
  (s) => s.gender === "Nữ" && isEthnicMinority(s.ethnicity)
).length;
  const team = students.filter((s) => s.is_union_member).length;
  const children = total - team;
  const mainCampus = students.filter(
    (s) => s.classes?.campus === "Trường chính"
  ).length;
  const pointCampus = students.filter(
    (s) => s.classes?.campus === "Điểm trường"
  ).length;
  const male = students.filter((s) => s.gender === "Nam").length;

  const gradeStats = [1, 2, 3, 4, 5].map((grade) => ({
    grade,
    total: students.filter((s) => s.classes?.grade === grade).length,
  }));
  const maxGrade = Math.max(...gradeStats.map((x) => x.total), 1);

  const classStats = useMemo<ClassStat[]>(() => {
    const map = new Map<string, ClassStat>();

    students.forEach((s) => {
      const c = s.classes;
      if (!c) return;
      const key = c.class_name;
      if (!map.has(key)) {
        map.set(key, {
          className: c.class_name,
          grade: c.grade,
          campus: c.campus,
          total: 0,
          female: 0,
          ethnicity: 0,
          femaleEthnicity: 0,
          team: 0,
          children: 0,
        });
      }

      const row = map.get(key)!;
      row.total += 1;
      if (s.gender === "Nữ") row.female += 1;
      if (isEthnicMinority(s.ethnicity)) row.ethnicity += 1;

if (
  s.gender === "Nữ" &&
  isEthnicMinority(s.ethnicity)
) {
  row.femaleEthnicity += 1;
}
      if (s.is_union_member) row.team += 1;
      else row.children += 1;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.className.localeCompare(b.className, "vi", { numeric: true })
    );
  }, [students]);

  const ethnicityStats = useMemo<EthnicityStat[]>(() => {
    const map = new Map<string, number>();
   students.forEach((s) => {
  const name = s.ethnicity?.trim();

  if (!name || !isEthnicMinority(name)) return;

  map.set(name, (map.get(name) ?? 0) + 1);
});

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, rate: total ? count / total : 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  }, [students, total]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const className = s.classes?.class_name ?? "";
      const grade = s.classes?.grade;
      const campus = s.classes?.campus ?? "";
      const ethnicityName = s.ethnicity?.trim() ?? "";

      const matchesSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        (s.student_code ?? "").toLowerCase().includes(q) ||
        className.toLowerCase().includes(q);
      const matchesGrade = gradeFilter === "all" || String(grade) === gradeFilter;
      const matchesClass = classFilter === "all" || className === classFilter;
      const matchesEthnicity =
        ethnicityFilter === "all" || ethnicityName === ethnicityFilter;
      const matchesCampus = campusFilter === "all" || campus === campusFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesClass &&
        matchesEthnicity &&
        matchesCampus
      );
    });
  }, [students, search, gradeFilter, classFilter, ethnicityFilter, campusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, gradeFilter, classFilter, ethnicityFilter, campusFilter]);

  function clearFilters() {
    setSearch("");
    setGradeFilter("all");
    setClassFilter("all");
    setEthnicityFilter("all");
    setCampusFilter("all");
    setPage(1);
  }

  const pieMale = total ? (male / total) * 100 : 0;
  const pieStyle = {
    background: `conic-gradient(#3498db 0 ${pieMale}%, #ef6aa8 ${pieMale}% 100%)`,
  };

  return (
    <div className="statistics-module">
      <div className="statistics-heading">
        <div>
          <div className="statistics-title-line">
            <span className="statistics-title-icon">📊</span>
            <div>
              <h2>Thống kê học sinh</h2>
              <p>Tổng hợp và thống kê số liệu học sinh toàn trường</p>
            </div>
          </div>
        </div>
        <div className="statistics-year">📅 Năm học 2026–2027</div>
      </div>

      <div className="statistics-stat-grid four">
        <Stat icon="👨‍🎓" title="Tổng số học sinh" value={total} subtitle="học sinh" tone="blue" />
        <Stat icon="👧" title="Số học sinh nữ" value={female} subtitle={`học sinh (${percent(female, total)})`} tone="pink" />
        <Stat icon="🌿" title="Số học sinh dân tộc" value={ethnic} subtitle={`học sinh (${percent(ethnic, total)})`} tone="green" />
        <Stat icon="👧🌿" title="Số học sinh nữ dân tộc" value={femaleEthnic} subtitle={`học sinh (${percent(femaleEthnic, total)})`} tone="yellow" />
      </div>

      <div className="statistics-stat-grid four second-row">
        <Stat icon="🎗️" title="Đội viên" value={team} subtitle={`học sinh (${percent(team, total)})`} tone="purple" />
        <Stat icon="👥" title="Nhi đồng" value={children} subtitle={`học sinh (${percent(children, total)})`} tone="pink" />
        <Stat icon="🏫" title="Học sinh trường chính" value={mainCampus} subtitle={`học sinh (${percent(mainCampus, total)})`} tone="green" />
        <Stat icon="📍" title="Học sinh điểm trường" value={pointCampus} subtitle={`học sinh (${percent(pointCampus, total)})`} tone="blue" />
      </div>

      <div className="statistics-chart-grid">
        <section className="statistics-panel grade-chart-panel">
          <PanelTitle icon="📊" title="Thống kê số học sinh theo khối" />
          <div className="grade-chart">
            {gradeStats.map((item) => (
              <div className="grade-column" key={item.grade}>
                <strong>{item.total}</strong>
                <div className="grade-bar-track">
                  <div
                    className="grade-bar"
                    style={{ height: `${Math.max(5, (item.total / maxGrade) * 100)}%` }}
                  />
                </div>
                <span>Khối {item.grade}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="statistics-panel gender-chart-panel">
          <PanelTitle icon="🥧" title="Tỉ lệ nam - nữ toàn trường" />
          <div className="gender-chart-wrap">
            <div className="gender-pie" style={pieStyle}>
              <div className="gender-pie-inner">{percent(female, total)}</div>
            </div>
            <div className="gender-legend">
              <div><i className="legend-dot male" /> Nam: {male} ({percent(male, total)})</div>
              <div><i className="legend-dot female" /> Nữ: {female} ({percent(female, total)})</div>
            </div>
          </div>
        </section>
      </div>

      <div className="statistics-table-grid">
        <section className="statistics-panel class-stat-panel">
          <PanelTitle icon="🏫" title="Thống kê theo lớp" />
          <div className="statistics-table-scroll">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>Lớp</th>
                  <th>Sĩ số</th>
                  <th>Nữ</th>
                  <th>Dân tộc</th>
                  <th>Nữ dân tộc</th>
                  <th>Đội viên</th>
                  <th>Nhi đồng</th>
                </tr>
              </thead>
              <tbody>
                {classStats.map((row) => (
                  <tr key={row.className}>
                    <td><strong>{row.className}</strong></td>
                    <td>{row.total}</td>
                    <td>{row.female}</td>
                    <td>{row.ethnicity}</td>
                    <td>{row.femaleEthnicity}</td>
                    <td>{row.team}</td>
                    <td>{row.children}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Tổng</td>
                  <td>{total}</td>
                  <td>{female}</td>
                  <td>{ethnic}</td>
                  <td>{femaleEthnic}</td>
                  <td>{team}</td>
                  <td>{children}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="statistics-panel ethnicity-panel">
          <PanelTitle icon="🌿" title="Thống kê theo dân tộc" />
          <div className="statistics-table-scroll">
            <table className="statistics-table compact">
              <thead>
                <tr>
                  <th>Dân tộc</th>
                  <th>Số lượng</th>
                  <th>Tỉ lệ</th>
                </tr>
              </thead>
              <tbody>
                {ethnicityStats.length === 0 ? (
                  <tr><td colSpan={3} className="empty-cell">Chưa có dữ liệu dân tộc</td></tr>
                ) : (
                  ethnicityStats.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
                      <td>{percent(row.count, total)}</td>
                    </tr>
                  ))
                )}
                <tr className="total-row">
                  <td>Tổng</td>
                  <td>{ethnic}</td>
                  <td>{percent(ethnic, total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="statistics-panel campus-panel">
          <PanelTitle icon="🏠" title="Thống kê theo nơi học" />
          <table className="statistics-table compact">
            <thead>
              <tr><th>Nơi học</th><th>Số lượng</th><th>Tỉ lệ</th></tr>
            </thead>
            <tbody>
              <tr><td>Trường chính</td><td>{mainCampus}</td><td>{percent(mainCampus, total)}</td></tr>
              <tr><td>Điểm trường</td><td>{pointCampus}</td><td>{percent(pointCampus, total)}</td></tr>
              <tr className="total-row"><td>Tổng</td><td>{total}</td><td>100%</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="statistics-panel detail-panel">
        <div className="detail-toolbar">
          <div className="statistics-search">
            <span>🔎</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm học sinh..."
            />
          </div>

          <div className="statistics-filters">
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="all">Tất cả khối</option>
              {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Khối {g}</option>)}
            </select>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="all">Tất cả lớp</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={ethnicityFilter} onChange={(e) => setEthnicityFilter(e.target.value)}>
              <option value="all">Tất cả dân tộc</option>
              {ethnicities.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)}>
              <option value="all">Tất cả nơi học</option>
              <option value="Trường chính">Trường chính</option>
              <option value="Điểm trường">Điểm trường</option>
            </select>
            {(search || gradeFilter !== "all" || classFilter !== "all" || ethnicityFilter !== "all" || campusFilter !== "all") && (
              <button className="statistics-clear" onClick={clearFilters}>Xóa lọc</button>
            )}
          </div>
        </div>

        {error && <div className="statistics-error">{error}</div>}

        {loading ? (
          <div className="statistics-loading">⏳ Đang tải dữ liệu học sinh...</div>
        ) : (
          <>
            <div className="statistics-table-scroll detail-table-scroll">
              <table className="statistics-table detail-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ và tên</th>
                    <th>Lớp</th>
                    <th>Giới tính</th>
                    <th>Dân tộc</th>
                    <th>Nơi học</th>
                    <th>Đội viên</th>
                  </tr>
                </thead>
                <tbody>
                  {pageStudents.length === 0 ? (
                    <tr><td colSpan={7} className="empty-cell">Không có học sinh phù hợp.</td></tr>
                  ) : (
                    pageStudents.map((student, index) => (
                      <tr key={student.id}>
                        <td>{(currentPage - 1) * pageSize + index + 1}</td>
                        <td><strong>{student.full_name}</strong></td>
                        <td>{student.classes?.class_name ?? "—"}</td>
                        <td>{student.gender ?? "—"}</td>
                        <td>{student.ethnicity?.trim() || "—"}</td>
                        <td>{student.classes?.campus ?? "—"}</td>
                        <td className="team-check">{student.is_union_member ? "✓" : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="statistics-pagination">
              <span>
                Hiển thị {filteredStudents.length ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredStudents.length)} trong {filteredStudents.length} học sinh
              </span>
              <div className="pagination-buttons">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={p === currentPage ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>›</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  title,
  value,
  subtitle,
  tone,
}: {
  icon: string;
  title: string;
  value: number;
  subtitle: string;
  tone: string;
}) {
  return (
    <div className={`statistics-stat-card ${tone}`}>
      <div className="statistics-stat-icon">{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="statistics-panel-title">
      <span>{icon}</span>
      <h3>{title}</h3>
    </div>
  );
}
