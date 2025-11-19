import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./Profile.css";
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const today = normalizeDate(new Date());

export default function Profile() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("all");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadTasks(session.user.id, true);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          loadTasks(session.user.id, true);
        } else {
          setUser(null);
          setTasks([]);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadTasks = async (userId, showLoading = false) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);

    if (!error) {
      const sorted = [...data].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setTasks(sorted);
    }
    if (showLoading) setLoading(false);
  };

  const saveTask = async () => {
    if (!editing?.subject || !editing?.title || !editing?.due_date) {
      return alert("Заполни все поля!");
    }

    if (editing.id) {
      await supabase
        .from("tasks")
        .update({
          subject: editing.subject,
          title: editing.title,
          due_date: editing.due_date,
          priority: editing.priority,
          notes: editing.notes,
        })
        .eq("id", editing.id);
    } else {
      await supabase.from("tasks").insert([
        {
          user_id: user.id,
          subject: editing.subject,
          title: editing.title,
          due_date: editing.due_date,
          priority: editing.priority || "Средний",
          notes: editing.notes || "",
          done: false,
        },
      ]);
    }

    cancelEdit();
    loadTasks(user.id);
  };

  const startEdit = (task = null) => {
    if (task) setEditing(task);
    else
      setEditing({
        subject: "",
        title: "",
        due_date: "",
        priority: "Средний",
        notes: "",
      });
  };

  const cancelEdit = () => setEditing(null);

  const toggleDone = async (id, current) => {
    await supabase.from("tasks").update({ done: !current }).eq("id", id);
    loadTasks(user.id);
  };

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async (id) => {
    await supabase.from("tasks").delete().eq("id", id);
    setConfirmDeleteId(null);
    loadTasks(user.id);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // === Фильтрация ===
  const filteredTasks = tasks
    .filter((t) => {
      if (view === "today")
        return (
          new Date(t.due_date).toDateString() === new Date().toDateString()
        );
      if (view === "week") {
        const today = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(today.getDate() + 7);
        const due = new Date(t.due_date);
        return due >= today && due <= weekFromNow;
      }
      if (view === "done") return t.done;
      return true;
    })
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    .filter((t) => t.subject.toLowerCase().includes(subject.toLowerCase()));

  const completedCount = tasks.filter((t) => t.done).length;
  const overdueCount = tasks.filter(
    (t) => normalizeDate(t.due_date) < today && !t.done
  ).length;

  const nearestDate =
    tasks.length > 0
      ? new Date(tasks[0].due_date).toLocaleDateString("ru-RU")
      : "—";

  if (loading)
    return (
      <div className="login-warning">
        <h2>Загрузка...</h2>
      </div>
    );

  if (!user)
    return (
      <div className="login-warning">
        <h2>Пожалуйста, войдите в систему</h2>
      </div>
    );

  return (
    <div className="profile-container">
      <header className="header">
        <h1>Планировщик заданий</h1>
        <div className="user-info">
          <span>{user.email}</span>
          <button className="logout" onClick={signOut}>
            Выход
          </button>
        </div>
      </header>

      <div className="stats">
        <div>
          Всего: <b>{tasks.length}</b>
        </div>
        <div>
          Готово: <b>{completedCount}</b>
        </div>
        <div>
          Просрочено: <b>{overdueCount}</b>
        </div>
        <div>
          Ближайший срок: <b>{nearestDate}</b>
        </div>
      </div>

      <div className="main">
        <div className="add-task">
          <h2>{editing?.id ? "Редактировать" : "Добавить задачу"}</h2>

          <label>Предмет</label>
          <input
            value={editing?.subject || ""}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, subject: e.target.value }))
            }
            placeholder="Математика"
          />

          <label>Название</label>
          <input
            value={editing?.title || ""}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="ДЗ №12 - упр. 14–18"
          />

          <div className="inline-inputs">
            <div>
              <label>Срок</label>
              <input
                type="date"
                value={editing?.due_date || ""}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, due_date: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Приоритет</label>
              <select
                value={editing?.priority || "Средний"}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, priority: e.target.value }))
                }
              >
                <option>Низкий</option>
                <option>Средний</option>
                <option>Высокий</option>
              </select>
            </div>
          </div>

          <label>Заметки</label>
          <textarea
            value={editing?.notes || ""}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Что сделать..."
          ></textarea>

          <div className="buttons">
            <button className="addButton" onClick={saveTask}>
              {editing?.id ? "Сохранить" : "Добавить"}
            </button>
            {editing && (
              <button className="cancel" onClick={cancelEdit}>
                Отмена
              </button>
            )}
          </div>
        </div>

        <div className="task-list">
          <div className="filters">
            {["all", "today", "week", "done"].map((f) => (
              <button
                key={f}
                className={view === f ? "active" : ""}
                onClick={() => setView(f)}
              >
                {f === "all"
                  ? "Все"
                  : f === "today"
                  ? "Сегодня"
                  : f === "week"
                  ? "Неделя"
                  : "Выполнено"}
              </button>
            ))}
          </div>

          <div className="search-filters">
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              type="text"
              placeholder="Фильтр по предмету..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {filteredTasks.length === 0 ? (
            <div className="empty">Пока пусто 👈 Добавь задачу</div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`task-card ${task.done ? "done" : ""}`}
              >
                <div className="task-left">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleDone(task.id, task.done)}
                  />
                  <div>
                    <h3 className={task.done ? "done-text" : ""}>
                      {task.title}
                    </h3>
                    <p className="meta">
                      Срок:{" "}
                      {new Date(task.due_date).toLocaleDateString("ru-RU")} •{" "}
                      {task.priority === "Высокий"
                        ? "🔥 высокий"
                        : task.priority === "Низкий"
                        ? "🌱 низкий"
                        : "✨ средний"}
                    </p>
                    {task.notes && <p className="notes">{task.notes}</p>}
                  </div>
                  {!task.done && normalizeDate(task.due_date) < today && (
                    <p className="overdue">❗Просрочено</p>
                  )}
                </div>

                <div className="task-right">
                  <span className="subject">{task.subject}</span>
                  <div className="buttons">
                    {confirmDeleteId === task.id ? (
                      <>
                        <button
                          className="confirm-delete"
                          onClick={() => confirmDelete(task.id)}
                        >
                          Подтвердить
                        </button>
                        <button
                          className="cancel-delete"
                          onClick={cancelDelete}
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="edit"
                          onClick={() => startEdit(task)}
                        >
                          Изменить
                        </button>
                        <button
                          className="delete"
                          onClick={() => handleDeleteClick(task.id)}
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
