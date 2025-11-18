import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.includes("@")) return "Введите корректный email";
    if (password.length < 6) return "Пароль должен быть не короче 6 символов";
    return null;
  };

  async function handleAuth(action) {
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    setError("");

    try {
      if (action === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAuth("signin");
  }

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">Вход / Регистрация</h1>

        <label className="login__label">Email</label>
        <input
          className="login__input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />

        <label className="login__label">Пароль</label>
        <input
          className="login__input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          onKeyDown={handleKeyDown}
        />

        {error && <p className="login__error">{error}</p>}

        <div className="login__buttons">
          <button
            disabled={loading}
            onClick={() => handleAuth("signin")}
            className="login__button login__button--signin"
          >
            Войти
          </button>
          <button
            disabled={loading}
            onClick={() => handleAuth("signup")}
            className="login__button login__button--signup"
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  );
}
