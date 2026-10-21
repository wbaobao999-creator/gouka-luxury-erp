import React, { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { createErpAuth } from "../lib/erpAuth.js";

const panel = { maxWidth: 360, margin: "64px auto", padding: 24, color: "#202629",
  background: "#fff", border: "1px solid #d7dede", borderRadius: 6,
  fontFamily: "system-ui, sans-serif", boxSizing: "border-box", width: "calc(100% - 32px)" };
const button = { display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 8, minHeight: 42, padding: "8px 14px", border: "1px solid #29685e",
  borderRadius: 4, background: "#176657", color: "white", font: "inherit", cursor: "pointer" };
const input = { display: "block", width: "100%", minHeight: 42, boxSizing: "border-box",
  marginTop: 6, padding: "8px 10px", border: "1px solid #9aa9a5", borderRadius: 4,
  background: "white", color: "#202629", font: "inherit" };

// Opt-in only: callers must finish the documented server prerequisites before mounting.
export default function SecureErpAccess({ client, children }) {
  const controls = useRef(null);
  const [state, setState] = useState({ client: null, phase: "checking", session: null, error: "" });

  useEffect(() => {
    let active = true, revision = 0, timer, subscription;
    let queue = Promise.resolve();
    const auth = createErpAuth(client);
    const publish = (ticket, next) => {
      if (active && ticket === revision) setState({ client, session: null, error: "", ...next });
    };
    const invalidate = (phase) => {
      clearTimeout(timer);
      const ticket = ++revision;
      if (phase === "checking") {
        setState(previous => ({ client, phase, error: "",
          session: previous.client === client ? previous.session : null }));
      } else {
        publish(ticket, { phase });
      }
      return ticket;
    };
    // Serialize this gate's auth operations so a denied old verification cannot
    // sign out a newer login. Never enter Supabase auth from its event callback.
    const run = (ticket, operation) => {
      queue = queue.catch(() => {}).then(async () => {
        if (!active || ticket !== revision) return;
        try {
          const session = await operation();
          publish(ticket, { phase: session ? "ready" : "signed-out", session });
        } catch {
          publish(ticket, { phase: "signed-out", error: "无法验证访问权限，请重新登录。" });
        }
      });
    };
    const scheduleVerification = () => {
      if (!active || typeof subscription?.unsubscribe !== "function") return;
      const ticket = invalidate("checking");
      timer = setTimeout(() => run(ticket, auth.verifiedSession), 0);
    };
    const actions = {
      login(email, password) {
        const ticket = invalidate("signing-in");
        run(ticket, () => auth.signIn(email, password));
      },
      logout() {
        const ticket = invalidate("signing-out");
        run(ticket, async () => { await auth.signOut(); return null; });
      },
      retry: scheduleVerification
    };
    controls.current = actions;
    try {
      const result = client.auth.onAuthStateChange((event) => {
        if (!active) return;
        if (event === "SIGNED_OUT") {
          invalidate("signed-out");
        } else if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
          scheduleVerification();
        }
      });
      subscription = result?.data?.subscription;
      if (typeof subscription?.unsubscribe !== "function") throw new Error("Missing auth subscription");
      scheduleVerification();
    } catch {
      publish(invalidate("signed-out"), { phase: "signed-out", error: "登录服务暂时不可用，请稍后重试。" });
      controls.current = null;
    }
    const onVisible = () => { if (document.visibilityState === "visible") scheduleVerification(); };
    window.addEventListener("focus", scheduleVerification);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      revision++;
      clearTimeout(timer);
      if (controls.current === actions) controls.current = null;
      subscription?.unsubscribe?.();
      window.removeEventListener("focus", scheduleVerification);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [client]);

  const current = state.client === client ? state : { phase: "checking", session: null, error: "" };
  const busy = ["checking", "signing-in", "signing-out"].includes(current.phase);
  const retainContent = current.session && ["ready", "checking"].includes(current.phase);
  return <>
    {retainContent && <div key={`${current.session.userId}:${current.session.role}`}
      hidden={current.phase !== "ready"} inert={current.phase !== "ready" ? true : undefined}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end",
        flexWrap: "wrap", gap: 12, padding: 12, borderBottom: "1px solid #d7dede" }}>
        <span style={{ overflowWrap: "anywhere" }}>{current.session.username}</span>
        <button type="button" style={button} onClick={() => controls.current?.logout()}>
          <LogOut size={16} aria-hidden="true" />退出登录
        </button>
      </header>
      {typeof children === "function" ? children(current.session, { signOut: () => controls.current?.logout() }) : null}
    </div>}
    {current.phase !== "ready" && <section aria-label="ERP 登录" aria-busy={busy} style={panel}>
    <h1 style={{ fontSize: 24, margin: "0 0 24px", letterSpacing: 0 }}>GOUKA ERP</h1>
    {current.phase === "checking" || current.phase === "signing-out" ?
      <p role="status">{current.phase === "checking" ? "正在验证访问权限..." : "正在退出登录..."}</p> :
      <form onSubmit={(event) => {
        event.preventDefault();
        if (busy || !controls.current) return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        const email = String(fields.get("email") || "");
        const password = String(fields.get("password") || "");
        form.elements.namedItem("password").value = "";
        controls.current.login(email, password);
      }}>
        <label style={{ display: "block", marginBottom: 18 }}>邮箱
          <input name="email" type="email" autoComplete="username" required disabled={busy} style={input} />
        </label>
        <label style={{ display: "block", marginBottom: 20 }}>密码
          <input name="password" type="password" autoComplete="current-password" required disabled={busy} style={input} />
        </label>
        <button type="submit" disabled={busy || !controls.current} style={{ ...button, width: "100%" }}>
          <LogIn size={16} aria-hidden="true" />{busy ? "正在登录..." : "登录"}
        </button>
      </form>}
    {current.error && <p role="alert" style={{ color: "#a32335", overflowWrap: "anywhere" }}>{current.error}</p>}
    {!busy && controls.current && <button type="button" onClick={() => controls.current?.retry()}
      style={{ ...button, marginTop: 16, background: "white", color: "#176657" }}>
      <RefreshCw size={16} aria-hidden="true" />重新验证
    </button>}
  </section>}
  </>;
}
