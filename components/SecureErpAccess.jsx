import React, { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, RefreshCw, ShieldCheck, Users, FileSearch } from "lucide-react";
import { createErpAuth } from "../lib/erpAuth.js";
import { AUTH_OPERATION_TIMEOUT_MS, resetErpLoginConnection } from "../lib/authConnection.js";

const panel = { maxWidth: 360, margin: "64px auto", padding: "24px 16px", color: "#202629",
  background: "#fff", border: "1px solid #d7dede", borderRadius: 6,
  fontFamily: "system-ui, sans-serif", boxSizing: "border-box", width: "calc(100% - 32px)" };
const button = { display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 8, minHeight: 42, padding: "8px 14px", border: "1px solid #29685e",
  borderRadius: 4, background: "#176657", color: "white", font: "inherit", cursor: "pointer" };
const input = { display: "block", width: "100%", minHeight: 42, boxSizing: "border-box",
  marginTop: 6, padding: "8px 10px", border: "1px solid #9aa9a5", borderRadius: 4,
  background: "white", color: "#202629", font: "inherit" };
const entries = [
  { key: "owner", label: "管理者入口", note: "全权限", Icon: ShieldCheck },
  { key: "staff", label: "员工入口", note: "日常操作", Icon: Users },
  { key: "tax", label: "税理士窗口", note: "只读审查", Icon: FileSearch }
];

// Opt-in only: callers must finish the documented server prerequisites before mounting.
export default function SecureErpAccess({ client, children }) {
  const controls = useRef(null);
  const loginForm = useRef(null);
  const [entry, setEntry] = useState("owner");
  const [state, setState] = useState({ client: null, phase: "checking", session: null, error: "" });

  useEffect(() => {
    let active = true, revision = 0, timer, deadline, subscription, verifiedUserId = null, blocked = false;
    let queue = Promise.resolve();
    const auth = createErpAuth(client);
    const publish = (ticket, next) => {
      if (active && ticket === revision) {
        clearTimeout(deadline);
        deadline = null;
        verifiedUserId = next.session?.userId || null;
        setState({ client, session: null, error: "", ...next });
      }
    };
    const invalidate = (phase) => {
      clearTimeout(timer);
      const ticket = ++revision;
      if (["checking", "signing-in", "signing-out"].includes(phase) && !deadline) {
        deadline = setTimeout(() => {
          if (!active) return;
          blocked = true;
          publish(++revision, { phase: "blocked", error: "登录连接等待超时，请重置登录连接后重新登录。商品和库存资料不会被清除。" });
        }, AUTH_OPERATION_TIMEOUT_MS);
      }
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
        } catch (error) {
          const message = error?.message;
          const readable = ["邮箱或密码不正确，或登录服务暂时不可用。", "此账号尚未获准使用 ERP，请联系管理员。"].includes(message);
          publish(ticket, { phase: "signed-out", error: readable ? message : "无法验证访问权限，请重新登录或重置登录连接。" });
        }
      });
    };
    const scheduleVerification = () => {
      if (!active || blocked || typeof subscription?.unsubscribe !== "function") return;
      const ticket = invalidate("checking");
      timer = setTimeout(() => run(ticket, auth.verifiedSession), 0);
    };
    const actions = {
      login(email, password) {
        if (blocked) return;
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
      const result = client.auth.onAuthStateChange((event, session) => {
        if (!active || blocked) return;
        if (event === "SIGNED_OUT") {
          invalidate("signed-out");
        } else if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
          if (event === "SIGNED_IN" && verifiedUserId && session?.user?.id && session.user.id !== verifiedUserId) {
            invalidate("signed-out");
          }
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
      clearTimeout(deadline);
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
    {retainContent && <div key={`${current.session.userId}:${current.session.role}`}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end",
        flexWrap: "wrap", gap: 12, padding: 12, borderBottom: "1px solid #d7dede" }}>
        <span style={{ overflowWrap: "anywhere" }}>{current.session.username}</span>
        <button type="button" style={button} onClick={() => controls.current?.logout()}>
          <LogOut size={16} aria-hidden="true" />退出登录
        </button>
      </header>
      {typeof children === "function" ? children(current.session, { signOut: () => controls.current?.logout() }) : null}
    </div>}
    {!retainContent && current.phase !== "ready" && <section aria-label="ERP 登录" aria-busy={busy} style={panel}>
    <h1 style={{ fontSize: 24, margin: "0 0 24px", letterSpacing: 0 }}>GOUKA ERP</h1>
    {current.phase === "blocked" ? <p role="status">登录连接未能完成，请使用下方按钮恢复。</p> : current.phase === "checking" || current.phase === "signing-out" ?
      <p role="status">{current.phase === "checking" ? "正在验证访问权限..." : "正在退出登录..."}</p> :
      <form ref={loginForm} aria-label={entries.find(option => option.key === entry).label} onSubmit={(event) => {
        event.preventDefault();
        if (busy || !controls.current) return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        const email = String(fields.get("email") || "");
        const password = String(fields.get("password") || "");
        form.elements.namedItem("password").value = "";
        controls.current.login(email, password);
      }}>
        <div role="group" aria-label="登录入口" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 24 }}>
          {entries.map(({ key, label, note, Icon }) => <button key={key} type="button"
            aria-label={label} aria-pressed={entry === key} disabled={busy}
            onClick={() => {
              setEntry(key);
              loginForm.current?.reset();
              setState(previous => ({ ...previous, error: "" }));
            }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              minWidth: 0, height: 116, padding: "10px 2px", borderRadius: 4, boxSizing: "border-box",
              border: "2px solid " + (entry === key ? "#176657" : "#c4cfcc"),
              background: entry === key ? "#edf6f2" : "#fff", color: "#202629", cursor: busy ? "wait" : "pointer", font: "inherit" }}>
            <Icon size={20} aria-hidden="true" />
            <b style={{ fontSize: 14, lineHeight: 1.4, maxWidth: "100%", overflowWrap: "anywhere", textAlign: "center" }}>{label}</b>
            <span style={{ fontSize: 12, color: "#52635e", maxWidth: "100%", overflowWrap: "anywhere", textAlign: "center" }}>{note}</span>
          </button>)}
        </div>
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
    {!busy && current.phase !== "blocked" && controls.current && <button type="button" onClick={() => controls.current?.retry()}
      style={{ ...button, marginTop: 16, background: "white", color: "#176657" }}>
      <RefreshCw size={16} aria-hidden="true" />重新验证
    </button>}
    <button type="button" onClick={() => {
      if (!window.confirm("只重置本浏览器的登录连接并刷新页面，不删除商品、照片、库存或备份。是否继续？")) return;
      try { resetErpLoginConnection(); }
      catch { setState(previous => ({ ...previous, error: "浏览器阻止了登录连接重置，请允许此网站使用本地存储后重试。" })); }
    }} style={{ ...button, marginTop: 16, background: "white", color: "#176657" }}>
      <RefreshCw size={16} aria-hidden="true" />重置登录连接
    </button>
  </section>}
  </>;
}
