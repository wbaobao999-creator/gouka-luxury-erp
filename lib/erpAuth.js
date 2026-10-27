const ROLE_NAMES = {
  owner: "管理者账号",
  staff: "员工账号",
  tax: "税理士窗口"
};

export function erpSessionFromVerifiedUser(user) {
  const role = user?.app_metadata?.erp_role;
  if (typeof user?.id !== "string" || !user.id.trim() ||
      typeof role !== "string" || !Object.hasOwn(ROLE_NAMES, role) ||
      !user.email_confirmed_at || user.deleted_at ||
      (user.banned_until && Date.parse(user.banned_until) > Date.now())) return null;
  return { userId: user.id, username: user.email || user.id, role, name: ROLE_NAMES[role] };
}

export const LOGIN_SERVER_ERROR = "登录服务发生服务器错误，请联系管理员检查数据库状态。";

export function createErpAuth(client, { onCleanupChange = () => {} } = {}) {
  async function clearSession() {
    onCleanupChange(true);
    try {
      const result = await client.auth.signOut({ scope: "local" });
      if (result?.error) throw new Error("ERP session cleanup failed; close this session and retry.");
    } finally {
      onCleanupChange(false);
    }
  }

  async function verifiedSession() {
    let session = null;
    try {
      const { data, error } = await client.auth.getUser();
      if (!error) session = erpSessionFromVerifiedUser(data?.user);
    } catch {
      // Network failures must never restore a cached identity.
    }
    if (!session) await clearSession();
    return session;
  }

  return {
    verifiedSession,
    async createImportAttachmentUrl(path, expiresIn = 60) {
      if (typeof path !== "string" || !path.trim() || path.startsWith("/") ||
          path.includes("..") || path.includes(":") || path.includes("\\") ||
          !Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 300) {
        throw new Error("Invalid attachment path or expiry (1-300 seconds required).");
      }
      if (!await verifiedSession()) throw new Error("ERP access denied.");
      const { data, error } = await client.storage.from("import-batch-files")
        .createSignedUrl(path, expiresIn);
      if (error || !data?.signedUrl) throw new Error("Attachment download authorization failed.");
      return data.signedUrl;
    },
    async signIn(email, password) {
      let result;
      try {
        result = await client.auth.signInWithPassword({ email: email.trim(), password });
      } catch {
        await clearSession();
        throw new Error("Login failed; please retry.");
      }
      if (result?.error || !result) {
        await clearSession();
        throw new Error(result?.error?.status >= 500 ? LOGIN_SERVER_ERROR : "邮箱或密码不正确，或登录服务暂时不可用。");
      }
      const session = await verifiedSession();
      if (!session) {
        throw new Error("此账号尚未获准使用 ERP，请联系管理员。");
      }
      return session;
    },
    async signOut() {
      await clearSession();
    }
  };
}
