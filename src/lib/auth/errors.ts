export function authErrorMessage(code?: string): string {
  switch (code) {
    case "invalid_credentials": return "E-mail ou senha incorretos.";
    case "email_not_confirmed": return "Confirme seu e-mail antes de entrar.";
    case "user_already_exists": case "email_exists": return "Não foi possível criar a conta com este e-mail. Tente entrar.";
    case "weak_password": return "A senha não atende aos requisitos de segurança. Use uma senha mais forte.";
    case "over_email_send_rate_limit": case "over_request_rate_limit": return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "signup_disabled": return "O cadastro está temporariamente indisponível.";
    default: return "Não foi possível concluir a solicitação. Tente novamente.";
  }
}
