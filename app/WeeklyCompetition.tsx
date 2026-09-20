"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ScoreField =
  | "sinh_hoat"
  | "the_duc"
  | "ve_sinh"
  | "vi_pham_khac"
  | "atgt"
  | "di_tre"
  | "thuong";

type ClassRow = {
  id: string;
  class_name: string;
  grade: number;
  campus: "Trường chính" | "Điểm trường";
  competition_enabled: boolean;
};

type CompetitionRow = {
  id: string;
  week_id: string;
  class_id: string;
  sinh_hoat: number;
  the_duc: number;
  ve_sinh: number;
  vi_pham_khac: number;
  atgt: number;
  di_tre: number;
  thuong: number;
};

type DisplayRow = CompetitionRow & {
  className: string;
  grade: number;
  total: number;
  rank: number;
  classification: "Tốt" | "Khá" | "Trung bình";
};

const SCORE_FIELDS: { key: ScoreField; label: string }[] = [
  { key: "sinh_hoat", label: "Sinh hoạt" },
  { key: "the_duc", label: "Thể dục" },
  { key: "ve_sinh", label: "Vệ sinh" },
  { key: "vi_pham_khac", label: "Vi phạm khác" },
  { key: "atgt", label: "ATGT" },
  { key: "di_tre", label: "Đi trễ" },
  { key: "thuong", label: "Thưởng" },
];

const MAIN_CLASS_ORDER = [
  "1A1",
  "1A2",
  "1A3",
  "1A4",
  "1A5",
  "2A1",
  "2A2",
  "2A3",
  "2A4",
  "2A5",
  "3A1",
  "3A2",
  "3A3",
  "3A4",
  "3A5",
  "4A1",
  "4A2",
  "4A3",
  "4A4",
  "4A5",
  "5A1",
  "5A2",
  "5A3",
  "5A4",
  "5A5",
];

const EMPTY_SCORE: Omit<
  CompetitionRow,
  "id" | "week_id" | "class_id"
> = {
  sinh_hoat: 0,
  the_duc: 0,
  ve_sinh: 0,
  vi_pham_khac: 0,
  atgt: 0,
  di_tre: 0,
  thuong: 0,
};

export default function WeeklyCompetition() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weekId, setWeekId] = useState("");
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [canEditAll, setCanEditAll] = useState(false);
  const [myClassId, setMyClassId] = useState<string | null>(null);

  const pageSize = 10;

  async function loadCompetition() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data: settings, error: settingsError } = await supabase
        .from("system_settings")
        .select("current_week")
        .limit(1)
        .single();

      if (settingsError) throw settingsError;

      const week = Number(settings?.current_week ?? 1);
      setCurrentWeek(week);

      const { data: weekRow, error: weekError } = await supabase
        .from("competition_weeks")
        .select("id, week_number")
        .eq("week_number", week)
        .single();

      if (weekError) throw weekError;

      setWeekId(weekRow.id);

      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, class_name, grade, campus, competition_enabled")
        .eq("campus", "Trường chính")
        .eq("competition_enabled", true)
        .eq("is_active", true);

      if (classError) throw classError;

      const classes = ((classData ?? []) as ClassRow[]).sort(
        (a, b) =>
          MAIN_CLASS_ORDER.indexOf(a.class_name) -
          MAIN_CLASS_ORDER.indexOf(b.class_name)
      );

      const { data: competitionData, error: competitionError } =
        await supabase
          .from("weekly_competition")
          .select(
            "id, week_id, class_id, sinh_hoat, the_duc, ve_sinh, vi_pham_khac, atgt, di_tre, thuong"
          )
          .eq("week_id", weekRow.id);

      if (competitionError) throw competitionError;

      const byClass = new Map(
        ((competitionData ?? []) as CompetitionRow[]).map((row) => [
          row.class_id,
          row,
        ])
      );

      const baseRows: CompetitionRow[] = classes.map((c) => {
        const existing = byClass.get(c.id);

        return (
          existing ?? {
            id: `new-${c.id}`,
            week_id: weekRow.id,
            class_id: c.id,
            ...EMPTY_SCORE,
          }
        );
      });

      const displayRows = buildRanking(baseRows, classes);
      setRows(displayRows);

      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, class_id")
          .eq("id", userData.user.id)
          .single();

        setCanEditAll(profile?.role === "TPT");
        setMyClassId(profile?.class_id ?? null);
      }
    } catch (err) {
      setError(
        `Không tải được dữ liệu thi đua: ${
          err instanceof Error ? err.message : "Lỗi không xác định"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompetition();
  }, []);

  function buildRanking(
    competitionRows: CompetitionRow[],
    classes: ClassRow[]
  ): DisplayRow[] {
    const classMap = new Map(classes.map((c) => [c.id, c]));

    const calculated = competitionRows.map((row) => {
      const total =
        row.sinh_hoat +
        row.the_duc +
        row.ve_sinh +
        row.vi_pham_khac +
        row.atgt +
        row.di_tre +
        row.thuong;

      const c = classMap.get(row.class_id);

      return {
        ...row,
        className: c?.class_name ?? "—",
        grade: c?.grade ?? 0,
        total,
        rank: 0,
        classification: "Trung bình" as const,
      };
    });

    calculated.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;

      return (
        MAIN_CLASS_ORDER.indexOf(a.className) -
        MAIN_CLASS_ORDER.indexOf(b.className)
      );
    });

    return calculated.map((row, index) => ({
      ...row,
      rank: index + 1,
      classification:
        index < 5 ? "Tốt" : index < 10 ? "Khá" : "Trung bình",
    }));
  }

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const topFive = rows.slice(0, 5);

  const summary = useMemo(
    () => ({
      total: rows.length,
      good: rows.filter((r) => r.classification === "Tốt").length,
      fairly: rows.filter((r) => r.classification === "Khá").length,
      average: rows.filter(
        (r) => r.classification === "Trung bình"
      ).length,
    }),
    [rows]
  );

  function canEdit(row: DisplayRow) {
    return canEditAll || row.class_id === myClassId;
  }

  async function changeScore(
    row: DisplayRow,
    field: ScoreField,
    delta: number
  ) {
    if (!canEdit(row) || savingId) return;

    const oldValue = row[field];
    const newValue = oldValue + delta;

    const optimistic = rows.map((item) =>
      item.id === row.id
        ? { ...item, [field]: newValue }
        : item
    );

    const recalculated = recalculate(optimistic);
    setRows(recalculated);
    setSavingId(`${row.class_id}-${field}`);

    try {
      const payload = {
        week_id: row.week_id,
        class_id: row.class_id,
        ...SCORE_FIELDS.reduce(
          (acc, item) => ({
            ...acc,
            [item.key]:
              item.key === field
                ? newValue
                : row[item.key],
          }),
          {}
        ),
      };

      const { error: saveError } = await supabase
        .from("weekly_competition")
        .upsert(payload, {
          onConflict: "week_id,class_id",
        });

      if (saveError) throw saveError;
    } catch (err) {
      setError(
        `Không lưu được điểm: ${
          err instanceof Error
            ? err.message
            : "Lỗi không xác định"
        }`
      );

      await loadCompetition();
    } finally {
      setSavingId(null);
    }
  }

  function recalculate(items: DisplayRow[]) {
    const recalculated = items.map((row) => ({
      ...row,
      total:
        row.sinh_hoat +
        row.the_duc +
        row.ve_sinh +
        row.vi_pham_khac +
        row.atgt +
        row.di_tre +
        row.thuong,
    }));

    recalculated.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;

      return (
        MAIN_CLASS_ORDER.indexOf(a.className) -
        MAIN_CLASS_ORDER.indexOf(b.className)
      );
    });

    return recalculated.map((row, index) => ({
      ...row,
      rank: index + 1,
      classification:
        index < 5 ? "Tốt" : index < 10 ? "Khá" : "Trung bình",
    }));
  }

  function saveAll() {
    setMessage(
      "Các thay đổi đã được lưu tự động."
    );

    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="competition-module">
      <div className="competition-heading">
        <div>
          <div className="competition-title-line">
            <span className="competition-title-icon">
              🏆
            </span>

            <div>
              <h2>Thi đua tuần</h2>
              <p>
                Theo dõi và nhập điểm thi đua các lớp
              </p>
            </div>
          </div>
        </div>

        <div className="competition-heading-actions">
          <div className="competition-year">
            📅 Năm học 2026–2027
          </div>

          <div className="competition-week">
            Tuần {currentWeek}⌄
          </div>
        </div>
      </div>

      <div className="competition-notice">
        <div>
          <strong>
            💡 Nhập điểm bằng nút ▲ / ▼
          </strong>

          <span>
            Mỗi lần thay đổi 1 điểm. Chỉ hiển thị 25
            lớp thuộc trường chính.
          </span>

          <span>
            Điểm được tự động lưu.
          </span>
        </div>

        <button
          className="competition-save-button"
          onClick={saveAll}
        >
          💾 Lưu tất cả
        </button>
      </div>

      {message && (
        <div className="competition-success">
          {message}
        </div>
      )}

      {error && (
        <div className="competition-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="competition-loading">
          ⏳ Đang tải dữ liệu thi đua...
        </div>
      ) : (
        <div className="competition-layout">
          <section className="competition-table-panel">
            <div className="competition-table-scroll">
              <table className="competition-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Lớp</th>

                    {SCORE_FIELDS.map((field) => (
                      <th key={field.key}>
                        {field.label}
                      </th>
                    ))}

                    <th>Tổng điểm</th>
                    <th>Vị thứ</th>
                    <th>Xếp loại</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr key={row.class_id}>
                      <td>
                        {(currentPage - 1) *
                          pageSize +
                          index +
                          1}
                      </td>

                      <td>
                        <strong>
                          {row.className}
                        </strong>
                      </td>

                      {SCORE_FIELDS.map((field) => (
                        <td key={field.key}>
                          <ScoreControl
                            value={row[field.key]}
                            disabled={!canEdit(row)}
                            saving={
                              savingId ===
                              `${row.class_id}-${field.key}`
                            }
                            onIncrease={() =>
                              changeScore(
                                row,
                                field.key,
                                1
                              )
                            }
                            onDecrease={() =>
                              changeScore(
                                row,
                                field.key,
                                -1
                              )
                            }
                          />
                        </td>
                      ))}

                      <td>
                        <span
                          className={`competition-total total-${
                            row.total < 0
                              ? "negative"
                              : row.total === 0
                              ? "zero"
                              : "positive"
                          }`}
                        >
                          {row.total}
                        </span>
                      </td>

                      <td>
                        <span className="competition-rank-number">
                          {row.rank}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`competition-classification ${row.classification
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {row.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="competition-pagination">
              <span>
                Hiển thị{" "}
                {rows.length
                  ? (currentPage - 1) *
                      pageSize +
                    1
                  : 0}{" "}
                -{" "}
                {Math.min(
                  currentPage * pageSize,
                  rows.length
                )}{" "}
                trong {rows.length} lớp
              </span>

              <div className="competition-pagination-buttons">
                <button
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage((p) =>
                      Math.max(1, p - 1)
                    )
                  }
                >
                  ‹
                </button>

                {Array.from(
                  {
                    length: totalPages,
                  },
                  (_, i) => i + 1
                ).map((p) => (
                  <button
                    key={p}
                    className={
                      p === currentPage
                        ? "active"
                        : ""
                    }
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={
                    currentPage >= totalPages
                  }
                  onClick={() =>
                    setPage((p) =>
                      Math.min(
                        totalPages,
                        p + 1
                      )
                    )
                  }
                >
                  ›
                </button>
              </div>

              <span className="competition-page-size">
                10 dòng/trang
              </span>
            </div>
          </section>

          <aside className="competition-sidebar">
            <section className="competition-side-panel ranking-panel">
              <div className="competition-side-title">
                <span>📊</span>

                <div>
                  <h3>
                    Bảng xếp hạng tuần
                  </h3>

                  <p>
                    Top 5 lớp dẫn đầu (theo vị thứ)
                  </p>
                </div>
              </div>

              <div className="competition-top-five">
                {topFive.map((row, index) => (
                  <div
                    className="competition-top-row"
                    key={row.class_id}
                  >
                    <span
                      className={`competition-medal medal-${
                        index + 1
                      }`}
                    >
                      {index + 1}
                    </span>

                    <strong>
                      {row.className}
                    </strong>

                    <span className="competition-top-rank">
                      Hạng {row.rank}
                    </span>
                  </div>
                ))}
              </div>

              <button className="competition-view-ranking">
                Xem đầy đủ bảng xếp hạng →
              </button>
            </section>

            <section className="competition-side-panel">
              <div className="competition-side-title">
                <span>🥧</span>

                <div>
                  <h3>Thống kê nhanh</h3>
                </div>
              </div>

              <div className="competition-summary-grid">
                <SummaryCard
                  icon="🏆"
                  value={summary.total}
                  label="Tổng số lớp"
                />

                <SummaryCard
                  icon="⭐"
                  value={summary.good}
                  label="Xếp loại Tốt"
                />

                <SummaryCard
                  icon="🌟"
                  value={summary.fairly}
                  label="Xếp loại Khá"
                />

                <SummaryCard
                  icon="👥"
                  value={summary.average}
                  label="Xếp loại Trung bình"
                />
              </div>
            </section>

            <section className="competition-side-panel competition-note-panel">
              <div className="competition-side-title">
                <span>📋</span>

                <div>
                  <h3>Ghi chú</h3>
                </div>
              </div>

              <ul>
                <li>
                  Điểm thi đua được tính theo quy
                  định của Liên đội.
                </li>

                <li>
                  Không có vi phạm: 0 điểm.
                </li>

                <li>
                  Mỗi lần điều chỉnh: ±1 điểm.
                </li>

                <li>
                  Chỉ hiển thị 25 lớp trường chính.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function ScoreControl({
  value,
  disabled,
  saving,
  onIncrease,
  onDecrease,
}: {
  value: number;
  disabled: boolean;
  saving: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div
      className={`score-control ${
        disabled ? "disabled" : ""
      }`}
    >
      <button
        type="button"
        disabled={disabled || saving}
        onClick={onIncrease}
        aria-label="Tăng 1 điểm"
      >
        ▲
      </button>

      <strong>
        {saving ? "…" : value}
      </strong>

      <button
        type="button"
        disabled={disabled || saving}
        onClick={onDecrease}
        aria-label="Giảm 1 điểm"
      >
        ▼
      </button>
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="competition-summary-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
