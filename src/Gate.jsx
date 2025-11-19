import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Profile from "./Profile";

export default function Gate() {
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      const { data } = supabase.auth.onAuthStateChange((_event, newSession) =>
        setSession(newSession)
      );
      subscription = data.subscription;
    }

    init();

    return () => subscription?.unsubscribe();
  }, []);

 
  useEffect(() => {
    if (session?.user) {
      supabase
        .from("Accounts")
        .upsert({
          id: session.user.id,
          email: session.user.email,
        })
        .then(({ data, error }) => {
          console.log("UPSERT Accounts:", { data, error });
        });
    }
  }, [session]);

  if (loading) return <div>Загрузка...</div>;
  if (!session) return <Login />;

  return <Profile session={session} />;
}
