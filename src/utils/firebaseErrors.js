const MESSAGES = {
  "auth/email-already-in-use": "이미 가입된 이메일이에요.",
  "auth/invalid-email": "올바른 이메일 형식이 아니에요.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 해요.",
  "auth/user-not-found": "이메일 또는 비밀번호가 올바르지 않아요.",
  "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않아요.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않아요.",
  "auth/too-many-requests": "잠시 후 다시 시도해주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해주세요.",
};

export function friendlyAuthError(error) {
  return new Error(MESSAGES[error?.code] ?? "문제가 발생했어요. 잠시 후 다시 시도해주세요.");
}
